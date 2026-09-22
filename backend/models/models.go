package models

import (
	"time"
)

// User represents an authenticated Google user
type User struct {
	ID        string    `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Picture   string    `json:"picture"`
	CreatedAt time.Time `json:"created_at"`
}

// GoogleTokenClaims represents payload parsed from verified Google ID Token
type GoogleTokenClaims struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// Question represents an objective test question (Listening / Reading)
type Question struct {
	ID            string   `json:"id"`
	Prompt        string   `json:"prompt"`
	Options       []string `json:"options"`
	CorrectOption int      `json:"correct_option"` // 0-indexed, hidden from client in test content
}

// TestContent represents the payload delivered to client for taking the test
type TestContent struct {
	ListeningAudioURL string     `json:"listening_audio_url"`
	ListeningAudioText string    `json:"listening_audio_text"` // transcript reference
	ListeningQuestions []Question `json:"listening_questions"`
	ReadingPassage     string     `json:"reading_passage"`
	ReadingTitle       string     `json:"reading_title"`
	ReadingQuestions   []Question `json:"reading_questions"`
	WritingPrompt      string     `json:"writing_prompt"`
	WritingMinWords    int        `json:"writing_min_words"`
	SpeakingQuestions  []string   `json:"speaking_questions"`
}

// WordFeedback represents an effective or improvable vocabulary choice
type WordFeedback struct {
	Word         string   `json:"word"`
	Type         string   `json:"type"` // "effective" or "needs_variety"
	Alternatives []string `json:"alternatives,omitempty"`
}

// WritingMistake details a specific grammar/vocabulary error identified by AI
type WritingMistake struct {
	Original    string `json:"original"`
	Correction  string `json:"correction"`
	Explanation string `json:"explanation"`
	Category    string `json:"category"` // grammar, spelling, vocabulary, cohesion
}

// WritingEvaluation represents structured grading returned by AI
type WritingEvaluation struct {
	Score               float64          `json:"score"` // Overall band: 0 to 9, half steps (e.g. 6.0, 6.5, 7.0)
	TaskResponseScore   float64          `json:"task_response_score,omitempty"`
	CoherenceScore      float64          `json:"coherence_score,omitempty"`
	LexicalScore        float64          `json:"lexical_score,omitempty"`
	GrammarScore        float64          `json:"grammar_score,omitempty"`
	TaskResponseNotes   string           `json:"task_response_notes"`
	CoherenceNotes      string           `json:"coherence_notes"`
	VocabularyNotes     string           `json:"vocabulary_notes"`
	GrammarNotes        string           `json:"grammar_notes"`
	Mistakes            []WritingMistake `json:"mistakes"`
	WordFeedback        []WordFeedback   `json:"word_feedback,omitempty"`
	WellFormedSentences []string         `json:"well_formed_sentences,omitempty"`
	Strengths           []string         `json:"strengths"`
	TipsToImprove       []string         `json:"tips_to_improve"`
	AIModelUsed         string           `json:"ai_model_used"`
	EvaluationError     string           `json:"evaluation_error,omitempty"`
}

// SpokenFeedbackItem details an exact spoken phrase with guidance
type SpokenFeedbackItem struct {
	Phrase     string `json:"phrase,omitempty"`
	Quote      string `json:"quote,omitempty"`
	Suggestion string `json:"suggestion"`
}

// SpeakingEvaluation represents structured grading for spoken audio
type SpeakingEvaluation struct {
	Score               float64              `json:"score"` // Overall band: 0 to 9, half steps
	FluencyScore        float64              `json:"fluency_score,omitempty"`
	LexicalScore        float64              `json:"lexical_score,omitempty"`
	GrammarScore        float64              `json:"grammar_score,omitempty"`
	PronunciationScore  float64              `json:"pronunciation_score,omitempty"`
	WordsPerMinute      int                  `json:"words_per_minute,omitempty"`
	SpeakingDurationSec int                  `json:"speaking_duration_sec,omitempty"`
	Transcript          string               `json:"transcript"`
	FluencyNotes        string               `json:"fluency_notes"`
	ClarityNotes        string               `json:"clarity_notes"`
	VocabularyNotes     string               `json:"vocabulary_notes"`
	GrammarNotes        string               `json:"grammar_notes"`
	SpokenFeedback      []SpokenFeedbackItem `json:"spoken_feedback,omitempty"`
	WeakSpots           []string             `json:"weak_spots"`
	TipsToImprove       []string             `json:"tips_to_improve"`
	AIModelUsed         string               `json:"ai_model_used"`
	EvaluationError     string               `json:"evaluation_error,omitempty"`
}

// FullSubmissionRequest is submitted at the end of speaking
type FullSubmissionRequest struct {
	TargetScore      float64 `json:"target_score"`
	CandidateName    string  `json:"candidate_name"`
	CandidateContact string  `json:"candidate_contact"`
	// Objective answers (map of question ID -> selected index)
	ListeningAnswers map[string]int `json:"listening_answers"`
	ReadingAnswers   map[string]int `json:"reading_answers"`
	// Subjective inputs
	EssayText string `json:"essay_text"`
}

// TestResultResponse is the complete consolidated payload shown on results screen
type TestResultResponse struct {
	ID               string             `json:"id"`
	CandidateName    string             `json:"candidate_name"`
	TargetScore      float64            `json:"target_score"`
	OverallScore     float64            `json:"overall_score"` // 1 decimal place average
	ListeningScore   float64            `json:"listening_score"`
	ReadingScore     float64            `json:"reading_score"`
	WritingScore     float64            `json:"writing_score"`
	SpeakingScore    float64            `json:"speaking_score"`
	WeakestSkill     string             `json:"weakest_skill"`
	WhatToPractise   string             `json:"what_to_practise"`
	WritingDetails   WritingEvaluation  `json:"writing_details"`
	SpeakingDetails  SpeakingEvaluation `json:"speaking_details"`
	CreatedAt        time.Time          `json:"created_at"`
}
