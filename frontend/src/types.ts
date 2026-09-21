export interface Question {
  id: string;
  prompt: string;
  options: string[];
}

export interface TestContent {
  listening_audio_url: string;
  listening_audio_text: string;
  listening_questions: Question[];
  reading_title: string;
  reading_passage: string;
  reading_questions: Question[];
  writing_prompt: string;
  writing_min_words: number;
  speaking_questions: string[];
}

export interface WritingMistake {
  original: string;
  correction: string;
  explanation: string;
  category: string;
}

export interface WritingEvaluation {
  score: number;
  task_response_notes: string;
  coherence_notes: string;
  vocabulary_notes: string;
  grammar_notes: string;
  mistakes: WritingMistake[];
  strengths: string[];
  tips_to_improve: string[];
  ai_model_used: string;
  evaluation_error?: string;
}

export interface SpeakingEvaluation {
  score: number;
  transcript: string;
  fluency_notes: string;
  clarity_notes: string;
  vocabulary_notes: string;
  grammar_notes: string;
  weak_spots: string[];
  tips_to_improve: string[];
  ai_model_used: string;
  evaluation_error?: string;
}

export interface TestResult {
  id: string;
  candidate_name: string;
  target_score: number;
  overall_score: number;
  listening_score: number;
  reading_score: number;
  writing_score: number;
  speaking_score: number;
  weakest_skill: string;
  what_to_practise: string;
  writing_details: WritingEvaluation;
  speaking_details: SpeakingEvaluation;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export type TestStage =
  | 'welcome'
  | 'listening'
  | 'pause_reading'
  | 'reading'
  | 'auth_gate'
  | 'writing'
  | 'pause_speaking'
  | 'speaking'
  | 'preparing'
  | 'results';
