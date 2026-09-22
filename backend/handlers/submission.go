package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"sync"
	"time"

	"matalabs-backend/ai"
	"matalabs-backend/auth"
	"matalabs-backend/db"
	"matalabs-backend/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type SubmissionHandler struct {
	DB        *db.DB
	AIService *ai.AIService
}

func NewSubmissionHandler(database *db.DB, aiService *ai.AIService) *SubmissionHandler {
	return &SubmissionHandler{
		DB:        database,
		AIService: aiService,
	}
}

// EvaluateAndSubmitHandler handles final test submission with parallel AI scoring
func (h *SubmissionHandler) EvaluateAndSubmitHandler(w http.ResponseWriter, r *http.Request) {
	claims, ok := r.Context().Value(auth.UserContextKey).(jwt.MapClaims)
	if !ok {
		http.Error(w, `{"error":"unauthorized session"}`, http.StatusUnauthorized)
		return
	}
	userID, _ := claims["sub"].(string)

	// Parse multipart form (max 30 MB for audio)
	if err := r.ParseMultipartForm(30 << 20); err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"failed to parse form data: %v"}`, err), http.StatusBadRequest)
		return
	}

	jsonData := r.FormValue("data")
	if jsonData == "" {
		http.Error(w, `{"error":"missing submission payload"}`, http.StatusBadRequest)
		return
	}

	var sub models.FullSubmissionRequest
	if err := json.Unmarshal([]byte(jsonData), &sub); err != nil {
		http.Error(w, fmt.Sprintf(`{"error":"invalid submission json: %v"}`, err), http.StatusBadRequest)
		return
	}

	// Read audio file(s) - support multi-question audio (audio1 & audio2) or single audio
	var audio1Bytes, audio2Bytes []byte
	var mimeType string

	if f1, h1, err := r.FormFile("audio1"); err == nil && f1 != nil {
		defer f1.Close()
		audio1Bytes, _ = io.ReadAll(f1)
		mimeType = h1.Header.Get("Content-Type")
	}
	if f2, h2, err := r.FormFile("audio2"); err == nil && f2 != nil {
		defer f2.Close()
		audio2Bytes, _ = io.ReadAll(f2)
		if mimeType == "" {
			mimeType = h2.Header.Get("Content-Type")
		}
	}
	// Fallback to legacy single audio if audio1 wasn't sent
	if len(audio1Bytes) == 0 {
		if file, fileHeader, err := r.FormFile("audio"); err == nil && file != nil {
			defer file.Close()
			audio1Bytes, _ = io.ReadAll(file)
			if mimeType == "" {
				mimeType = fileHeader.Header.Get("Content-Type")
			}
		}
	}

	log.Printf("[Submission] User %s submitted test. Essay: %d chars, Audio1: %d bytes, Audio2: %d bytes (%s)",
		userID, len(sub.EssayText), len(audio1Bytes), len(audio2Bytes), mimeType)

	// 1. Calculate deterministic objective scores
	listeningScore := CalculateObjectiveScore(sub.ListeningAnswers, ActiveTestContent.ListeningQuestions)
	readingScore := CalculateObjectiveScore(sub.ReadingAnswers, ActiveTestContent.ReadingQuestions)

	// 2. Parallel AI Evaluation for maximum responsiveness
	var wg sync.WaitGroup
	var writingEval *models.WritingEvaluation
	var speakingEval *models.SpeakingEvaluation
	var writingErr error
	var speakingErr error

	wg.Add(2)

	// Evaluate Writing
	go func() {
		defer wg.Done()
		start := time.Now()
		writingEval, writingErr = h.AIService.EvaluateWriting(ActiveTestContent.WritingPrompt, sub.EssayText)
		log.Printf("[Submission] Writing evaluation completed in %v (err: %v)", time.Since(start), writingErr)
	}()

	// Evaluate Speaking (Supports Dual Question Audio)
	go func() {
		defer wg.Done()
		start := time.Now()
		speakingEval, speakingErr = h.AIService.EvaluateSpeakingDual(audio1Bytes, audio2Bytes, mimeType, ActiveTestContent.SpeakingQuestions)
		log.Printf("[Submission] Speaking evaluation completed in %v (err: %v)", time.Since(start), speakingErr)
	}()

	wg.Wait()

	// Fallback with explicit error state if evaluation service fails
	if writingErr != nil || writingEval == nil {
		writingEval = &models.WritingEvaluation{
			Score:           0.0,
			EvaluationError: "AI Writing evaluation could not be completed. The AI service may be temporarily unavailable.",
			AIModelUsed:     "None (Failed)",
		}
	}

	if speakingErr != nil || speakingEval == nil {
		speakingEval = &models.SpeakingEvaluation{
			Score:           0.0,
			Transcript:      "[Transcription unavailable due to AI service timeout]",
			EvaluationError: "AI Speaking evaluation could not be completed. The AI service may be temporarily unavailable.",
			AIModelUsed:     "None (Failed)",
		}
	}

	// Double-check sanitization to filter phantom mistakes and extraneous quotes
	ai.SanitizeWritingEvaluation(writingEval)
	ai.SanitizeSpeakingEvaluation(speakingEval)

	// 3. Compute Overall Score: Average of the real 4 parts to 1 decimal place
	scores := []float64{listeningScore, readingScore, writingEval.Score, speakingEval.Score}
	total := 0.0
	for _, s := range scores {
		total += s
	}
	rawOverall := total / float64(len(scores))
	overallScore := math.Round(rawOverall*10) / 10.0 // e.g. 6.5, not 6.47

	// 4. Identify weakest part and diagnostic advice
	weakestSkill, advice := determineWeakestSkill(listeningScore, readingScore, writingEval.Score, speakingEval.Score)

	candidateName := sub.CandidateName
	candidateContact := sub.CandidateContact
	if candidateName == "" || candidateContact == "" {
		if u, err := h.DB.GetUser(userID); err == nil && u != nil {
			if candidateName == "" {
				candidateName = u.Name
			}
			if candidateContact == "" {
				candidateContact = u.Email
			}
		}
	}
	if candidateName == "" {
		candidateName = "Candidate"
	}

	result := &models.TestResultResponse{
		ID:              uuid.New().String(),
		CandidateName:   candidateName,
		TargetScore:     sub.TargetScore,
		OverallScore:    overallScore,
		ListeningScore:  listeningScore,
		ReadingScore:    readingScore,
		WritingScore:    writingEval.Score,
		SpeakingScore:   speakingEval.Score,
		WeakestSkill:    weakestSkill,
		WhatToPractise:  advice,
		WritingDetails:  *writingEval,
		SpeakingDetails: *speakingEval,
		CreatedAt:       time.Now(),
	}

	// 5. Persist result in SQLite
	if err := h.DB.SaveTestResult(result, userID, candidateContact); err != nil {
		log.Printf("[DB] Error saving test result: %v", err)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

func determineWeakestSkill(listening, reading, writing, speaking float64) (string, string) {
	minScore := listening
	weakest := "Listening"
	advice := "Practise active audio note-taking and identifying specific keywords in rapid natural dialogues."

	if reading < minScore {
		minScore = reading
		weakest = "Reading"
		advice = "Focus on skimming academic passages for paragraph themes and scanning for technical evidence."
	}
	if writing < minScore {
		minScore = writing
		weakest = "Writing"
		advice = "Work on essay coherence and grammatical precision by structuring paragraphs with clear topic sentences and evidence."
	}
	if speaking < minScore {
		minScore = speaking
		weakest = "Speaking"
		advice = "Practise spontaneous spoken fluency and intonation without mid-sentence hesitations or pauses."
	}

	return weakest, advice
}

// GetResultHandler retrieves past result
func (h *SubmissionHandler) GetResultHandler(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if id == "" {
		http.Error(w, `{"error":"missing test id"}`, http.StatusBadRequest)
		return
	}

	res, err := h.DB.GetTestResult(id)
	if err != nil {
		http.Error(w, `{"error":"result not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(res)
}
