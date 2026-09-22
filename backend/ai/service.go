package ai

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"matalabs-backend/models"
)

type AIService struct {
	GeminiKey string
	GroqKey   string
	client    *http.Client
}

func NewAIService(geminiKey, groqKey string) *AIService {
	return &AIService{
		GeminiKey: geminiKey,
		GroqKey:   groqKey,
		client:    &http.Client{Timeout: 15 * time.Second},
	}
}

// RoundToHalfStep ensures score is on the IELTS half-band scale (0 to 9)
func RoundToHalfStep(val float64) float64 {
	if val < 0 {
		return 0
	}
	if val > 9 {
		return 9
	}
	return math.Round(val*2) / 2
}

// CleanJSON removes markdown code fence blocks if returned by model
func CleanJSON(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```json") {
		s = strings.TrimPrefix(s, "```json")
		s = strings.TrimSuffix(s, "```")
	} else if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```")
		s = strings.TrimSuffix(s, "```")
	}
	return strings.TrimSpace(s)
}

// EvaluateWriting scores the candidate's essay
func (s *AIService) EvaluateWriting(promptText, essay string) (*models.WritingEvaluation, error) {
	words := strings.Fields(strings.TrimSpace(essay))
	wordCount := len(words)

	// Rule 1: Almost nothing written -> score 0
	if wordCount < 5 {
		return &models.WritingEvaluation{
			Score:             0.0,
			TaskResponseNotes: "No substantial response provided.",
			CoherenceNotes:    "Insufficient text to evaluate paragraph or sentence structure.",
			VocabularyNotes:   "Vocabulary range could not be assessed.",
			GrammarNotes:      "Grammar cannot be evaluated without sentences.",
			Mistakes:          []models.WritingMistake{},
			Strengths:         []string{},
			TipsToImprove: []string{
				"Write at least 150 words addressing all parts of the essay prompt.",
				"State a clear position and organize your ideas into paragraphs.",
			},
			AIModelUsed: "Rule-Based Deterministic Pre-check",
		}, nil
	}

	// Rule 2: A very short attempt -> low score (no higher than 3.0)
	if wordCount < 30 {
		return &models.WritingEvaluation{
			Score:             2.5,
			TaskResponseNotes: fmt.Sprintf("Response is severely underdeveloped (%d words). Minimum expected is 150 words.", wordCount),
			CoherenceNotes:    "Too brief to establish logical progression or cohesive transitions.",
			VocabularyNotes:   "Extremely limited vocabulary sample.",
			GrammarNotes:      "Limited sentence structures demonstrated.",
			Mistakes: []models.WritingMistake{
				{
					Original:    essay,
					Correction:  "Expand your thoughts into complete paragraphs with examples.",
					Explanation: "An essay requires an introduction, supporting arguments, and a conclusion.",
					Category:    "cohesion",
				},
			},
			Strengths: []string{"Attempted to formulate an initial thought."},
			TipsToImprove: []string{
				"Aim for at least 150-250 words to demonstrate range.",
				"Provide supporting arguments and specific examples.",
			},
			AIModelUsed: "Rule-Based Deterministic Pre-check",
		}, nil
	}

	// Rule 2.5: Under 100 words -> Under-length penalty
	if wordCount < 100 {
		return &models.WritingEvaluation{
			Score:             3.5,
			TaskResponseScore: 3.0,
			CoherenceScore:    3.5,
			LexicalScore:      4.0,
			GrammarScore:      3.5,
			TaskResponseNotes: fmt.Sprintf("Response is under 100 words (%d words). In standard IELTS assessment, essays falling substantially below the minimum 150-word threshold receive major penalties on Task Achievement.", wordCount),
			CoherenceNotes:    "Paragraph development is truncated due to insufficient overall length.",
			VocabularyNotes:   "Vocabulary range is limited by brevity of response.",
			GrammarNotes:      "Sentence variety cannot be fully demonstrated in under 100 words.",
			Mistakes:          []models.WritingMistake{},
			Strengths:         []string{"Initial viewpoint was outlined."},
			TipsToImprove: []string{
				"Aim for at least 150-250 words to meet minimum task length criteria.",
				"Develop each point with a topic sentence, supporting evidence, and a practical illustration.",
			},
			AIModelUsed: "Deterministic Length & Rubric Pre-check",
		}, nil
	}

	// Rule 3: Real attempt -> Full AI evaluation
	systemPrompt := `You are an expert IELTS/CEFR English writing examiner.
Evaluate the following essay against the four standard criteria:
1. Task Achievement / Response
2. Coherence and Cohesion
3. Lexical Resource (Vocabulary)
4. Grammatical Range and Accuracy

The score MUST be between 0.0 and 9.0 in half steps ONLY (e.g. 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0).
Calculate an individual score for each criterion, and the overall score as their average rounded to the nearest half step.
Return ONLY a valid JSON object matching this schema exactly:
{
  "score": number,
  "task_response_score": number,
  "coherence_score": number,
  "lexical_score": number,
  "grammar_score": number,
  "task_response_notes": "string",
  "coherence_notes": "string",
  "vocabulary_notes": "string",
  "grammar_notes": "string",
  "mistakes": [
    {
      "original": "exact erroneous phrase from essay",
      "correction": "corrected phrasing",
      "explanation": "why this is incorrect and the grammar rule applied",
      "category": "grammar" | "spelling" | "vocabulary" | "cohesion"
    }
  ],
  "word_feedback": [
    {
      "word": "notable word used",
      "type": "effective" | "needs_variety",
      "alternatives": ["alternative 1", "alternative 2"]
    }
  ],
  "well_formed_sentences": ["exact well-crafted sentence from essay", "another effective sentence"],
  "strengths": ["string", "string"],
  "tips_to_improve": ["actionable advice to improve writing flow and structure"]
}`

	userContent := fmt.Sprintf("Prompt: %s\n\nCandidate Essay:\n%s", promptText, essay)

	// 1. Try Groq first (sub-second response, highly reliable)
	if s.GroqKey != "" {
		eval, err := s.callGroqText(systemPrompt, userContent)
		if err == nil {
			eval.Score = RoundToHalfStep(eval.Score)
			if eval.TaskResponseScore == 0 {
				eval.TaskResponseScore = eval.Score
			}
			if eval.CoherenceScore == 0 {
				eval.CoherenceScore = eval.Score
			}
			if eval.LexicalScore == 0 {
				eval.LexicalScore = eval.Score
			}
			if eval.GrammarScore == 0 {
				eval.GrammarScore = eval.Score
			}
			eval.AIModelUsed = "groq/gpt-oss-120b"
			return eval, nil
		}
		log.Printf("[AI] Groq writing error: %v. Trying Gemini fallback...", err)
	}

	// 2. Fallback to Gemini
	if s.GeminiKey != "" {
		eval, err := s.callGeminiText(systemPrompt, userContent)
		if err == nil {
			eval.Score = RoundToHalfStep(eval.Score)
			if eval.TaskResponseScore == 0 {
				eval.TaskResponseScore = eval.Score
			}
			if eval.CoherenceScore == 0 {
				eval.CoherenceScore = eval.Score
			}
			if eval.LexicalScore == 0 {
				eval.LexicalScore = eval.Score
			}
			if eval.GrammarScore == 0 {
				eval.GrammarScore = eval.Score
			}
			eval.AIModelUsed = "gemini-3.6-flash"
			return eval, nil
		}
		log.Printf("[AI] Gemini writing error: %v", err)
	}

	return nil, errors.New("AI writing evaluation service temporarily unavailable. Please try again.")
}

func (s *AIService) callGeminiText(systemPrompt, userContent string) (*models.WritingEvaluation, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=%s", s.GeminiKey)

	payload := map[string]interface{}{
		"systemInstruction": map[string]interface{}{
			"parts": []map[string]interface{}{
				{"text": systemPrompt},
			},
		},
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": userContent},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"responseMimeType": "application/json",
			"temperature":      0.2,
		},
	}

	jsonBytes, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("gemini status %d: %s", resp.StatusCode, string(body))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return nil, err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, errors.New("empty response from gemini")
	}

	rawJSON := CleanJSON(geminiResp.Candidates[0].Content.Parts[0].Text)
	var eval models.WritingEvaluation
	if err := json.Unmarshal([]byte(rawJSON), &eval); err != nil {
		return nil, fmt.Errorf("failed to parse evaluation json: %w (raw: %s)", err, rawJSON)
	}

	return &eval, nil
}

func (s *AIService) callGroqText(systemPrompt, userContent string) (*models.WritingEvaluation, error) {
	url := "https://api.groq.com/openai/v1/chat/completions"

	payload := map[string]interface{}{
		"model": "openai/gpt-oss-120b",
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userContent},
		},
		"response_format": map[string]string{"type": "json_object"},
		"temperature":     0.2,
	}

	jsonBytes, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.GroqKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("groq status %d: %s", resp.StatusCode, string(body))
	}

	var groqResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&groqResp); err != nil {
		return nil, err
	}

	if len(groqResp.Choices) == 0 {
		return nil, errors.New("empty response from groq")
	}

	rawJSON := CleanJSON(groqResp.Choices[0].Message.Content)
	var eval models.WritingEvaluation
	if err := json.Unmarshal([]byte(rawJSON), &eval); err != nil {
		return nil, fmt.Errorf("failed to parse groq evaluation json: %w", err)
	}

	return &eval, nil
}

// EvaluateSpeaking transcribes and scores the candidate's spoken audio
func (s *AIService) EvaluateSpeaking(audioData []byte, mimeType string, questions []string) (*models.SpeakingEvaluation, error) {
	if len(audioData) < 1000 {
		return &models.SpeakingEvaluation{
			Score:           1.0,
			Transcript:      "[No audible speech detected. The recording was silent or too brief.]",
			FluencyNotes:    "No sustained speech was captured.",
			ClarityNotes:    "Audio signal was minimal or absent.",
			VocabularyNotes: "Cannot evaluate vocabulary from silent recording.",
			GrammarNotes:    "Cannot evaluate grammar.",
			WeakSpots:       []string{"Microphone was not picking up speech, or the response was not spoken."},
			TipsToImprove: []string{
				"Ensure your microphone is active and permissions are granted.",
				"Speak clearly at normal conversational volume.",
			},
			AIModelUsed: "Rule-Based Audio Signal Detector",
		}, nil
	}

	// 1. Try Groq Whisper + Groq LLM first (blazing fast audio transcription + evaluation)
	if s.GroqKey != "" {
		transcript, err := s.transcribeWithGroqWhisper(audioData, mimeType)
		if err == nil && len(strings.TrimSpace(transcript)) > 0 {
			eval, err := s.scoreTranscriptWithGroq(transcript, questions)
			if err == nil {
				eval.Transcript = transcript
				eval.Score = RoundToHalfStep(eval.Score)
				eval.AIModelUsed = "whisper-large-v3-turbo + groq/gpt-oss-120b"
				return eval, nil
			}
			log.Printf("[AI] Groq transcript scoring error: %v. Trying Gemini fallback...", err)
		} else {
			log.Printf("[AI] Groq Whisper error: %v. Trying Gemini fallback...", err)
		}
	}

	// 2. Fallback to Gemini Multimodal Audio
	if s.GeminiKey != "" {
		eval, err := s.callGeminiAudio(audioData, mimeType, questions)
		if err == nil {
			eval.Score = RoundToHalfStep(eval.Score)
			eval.AIModelUsed = "gemini-3.6-flash (multimodal audio)"
			return eval, nil
		}
		log.Printf("[AI] Gemini audio evaluation error: %v", err)
	}

	return nil, errors.New("Speaking AI evaluation service temporarily unavailable. Please try again.")
}

func (s *AIService) callGeminiAudio(audioData []byte, mimeType string, questions []string) (*models.SpeakingEvaluation, error) {
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=%s", s.GeminiKey)

	encodedAudio := base64.StdEncoding.EncodeToString(audioData)
	if mimeType == "" {
		mimeType = "audio/webm"
	}

	systemInstruction := `You are an expert IELTS English speaking examiner.
You will listen to the candidate's spoken response to the given interview questions.
First, transcribe everything the candidate said verbatim.
Second, evaluate the candidate's performance across the four standard criteria:
1. Fluency & Coherence
2. Lexical Resource (Vocabulary)
3. Grammatical Range & Accuracy
4. Pronunciation & Clarity

Calculate an overall speaking score from 0.0 to 9.0 in half steps ONLY (e.g. 5.0, 5.5, 6.0, 6.5, 7.0).
Calculate individual sub-scores for fluency, lexical resource, grammar, and pronunciation in half steps.
Provide constructive recommendations to help the candidate develop their spoken English and fluency.
Return ONLY a valid JSON object matching this schema:
{
  "transcript": "Exact transcription of the candidate's spoken words",
  "score": number,
  "fluency_score": number,
  "lexical_score": number,
  "grammar_score": number,
  "pronunciation_score": number,
  "fluency_notes": "string",
  "clarity_notes": "string",
  "vocabulary_notes": "string",
  "grammar_notes": "string",
  "spoken_feedback": [
    {
      "phrase": "exact phrase spoken by candidate",
      "suggestion": "actionable tip for more natural phrasing or syntax"
    }
  ],
  "weak_spots": ["string"],
  "tips_to_improve": ["actionable suggestions to develop spoken fluency"]
}`

	prompt := fmt.Sprintf("Questions asked:\n1. %s\n2. %s\n\nPlease transcribe the audio and evaluate according to the IELTS criteria.",
		questions[0], questions[1])

	payload := map[string]interface{}{
		"systemInstruction": map[string]interface{}{
			"parts": []map[string]interface{}{
				{"text": systemInstruction},
			},
		},
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{
						"inlineData": map[string]string{
							"mimeType": mimeType,
							"data":     encodedAudio,
						},
					},
					{
						"text": prompt,
					},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"responseMimeType": "application/json",
			"temperature":      0.2,
		},
	}

	jsonBytes, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("gemini audio status %d: %s", resp.StatusCode, string(body))
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return nil, err
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, errors.New("empty response from gemini audio")
	}

	rawJSON := CleanJSON(geminiResp.Candidates[0].Content.Parts[0].Text)
	var eval models.SpeakingEvaluation
	if err := json.Unmarshal([]byte(rawJSON), &eval); err != nil {
		return nil, fmt.Errorf("failed to parse speaking evaluation json: %w", err)
	}

	words := strings.Fields(eval.Transcript)
	wordCount := len(words)
	durationSec := len(audioData) / 3200
	if durationSec < 10 {
		durationSec = 10
	}
	if durationSec > 120 {
		durationSec = 120
	}
	eval.SpeakingDurationSec = durationSec
	if durationSec > 0 {
		eval.WordsPerMinute = int(float64(wordCount) / (float64(durationSec) / 60.0))
	}
	if eval.FluencyScore == 0 {
		eval.FluencyScore = eval.Score
	}
	if eval.LexicalScore == 0 {
		eval.LexicalScore = eval.Score
	}
	if eval.GrammarScore == 0 {
		eval.GrammarScore = eval.Score
	}
	if eval.PronunciationScore == 0 {
		eval.PronunciationScore = eval.Score
	}

	return &eval, nil
}

func (s *AIService) transcribeWithGroqWhisper(audioData []byte, mimeType string) (string, error) {
	url := "https://api.groq.com/openai/v1/audio/transcriptions"

	var b bytes.Buffer
	w := multipart.NewWriter(&b)

	filename := "speaking.webm"
	if strings.Contains(mimeType, "wav") {
		filename = "speaking.wav"
	}

	part, err := w.CreateFormFile("file", filename)
	if err != nil {
		return "", err
	}
	if _, err := part.Write(audioData); err != nil {
		return "", err
	}

	_ = w.WriteField("model", "whisper-large-v3-turbo")
	_ = w.WriteField("response_format", "json")
	w.Close()

	req, err := http.NewRequest("POST", url, &b)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+s.GroqKey)
	req.Header.Set("Content-Type", w.FormDataContentType())

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("groq whisper status %d: %s", resp.StatusCode, string(body))
	}

	var whisperResp struct {
		Text string `json:"text"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&whisperResp); err != nil {
		return "", err
	}

	return whisperResp.Text, nil
}

func (s *AIService) scoreTranscriptWithGroq(transcript string, questions []string) (*models.SpeakingEvaluation, error) {
	words := strings.Fields(transcript)
	wordCount := len(words)
	durationSec := int(float64(wordCount) / 130.0 * 60.0)
	if durationSec < 15 {
		durationSec = 15
	}
	wpm := int(float64(wordCount) / (float64(durationSec) / 60.0))

	systemPrompt := `You are an expert IELTS speaking examiner.
Evaluate the spoken transcript across the four standard criteria: Fluency, Vocabulary, Grammar, Pronunciation.
Score MUST be between 0.0 and 9.0 in half steps ONLY.
Calculate individual sub-scores for fluency, lexical resource, grammar, and pronunciation in half steps.
Return ONLY valid JSON matching this schema:
{
  "score": number,
  "fluency_score": number,
  "lexical_score": number,
  "grammar_score": number,
  "pronunciation_score": number,
  "fluency_notes": "string",
  "clarity_notes": "string",
  "vocabulary_notes": "string",
  "grammar_notes": "string",
  "spoken_feedback": [
    {
      "phrase": "exact phrase from transcript",
      "suggestion": "actionable tip for more natural phrasing or syntax"
    }
  ],
  "weak_spots": ["string"],
  "tips_to_improve": ["actionable suggestions to develop spoken fluency"]
}`

	userContent := fmt.Sprintf("Candidate spoke %d words in approximately %d seconds (~%d WPM).\n\nQuestions:\n1. %s\n2. %s\n\nSpoken Transcript:\n%s",
		wordCount, durationSec, wpm, questions[0], questions[1], transcript)

	url := "https://api.groq.com/openai/v1/chat/completions"
	payload := map[string]interface{}{
		"model": "openai/gpt-oss-120b",
		"messages": []map[string]string{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": userContent},
		},
		"response_format": map[string]string{"type": "json_object"},
		"temperature":     0.2,
	}

	jsonBytes, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.GroqKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var groqResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&groqResp); err != nil {
		return nil, err
	}

	if len(groqResp.Choices) == 0 {
		return nil, errors.New("empty response from groq")
	}

	var eval models.SpeakingEvaluation
	rawJSON := CleanJSON(groqResp.Choices[0].Message.Content)
	if err := json.Unmarshal([]byte(rawJSON), &eval); err != nil {
		return nil, err
	}

	eval.SpeakingDurationSec = durationSec
	eval.WordsPerMinute = wpm
	if eval.FluencyScore == 0 {
		eval.FluencyScore = eval.Score
	}
	if eval.LexicalScore == 0 {
		eval.LexicalScore = eval.Score
	}
	if eval.GrammarScore == 0 {
		eval.GrammarScore = eval.Score
	}
	if eval.PronunciationScore == 0 {
		eval.PronunciationScore = eval.Score
	}

	return &eval, nil
}
