import type { TestContent, TestResult, AuthUser } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function fetchTestContent(): Promise<TestContent> {
  const res = await fetch(`${API_BASE}/api/test/content`);
  if (!res.ok) {
    throw new Error(`Failed to load test content (HTTP ${res.status})`);
  }
  return res.json();
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Authentication failed' }));
    throw new Error(errorData.error || 'Google login failed');
  }
  return res.json();
}

export async function submitFullTest(
  payload: {
    target_score: number;
    candidate_name: string;
    candidate_contact: string;
    listening_answers: Record<string, number>;
    reading_answers: Record<string, number>;
    essay_text: string;
  },
  audioBlob: Blob | null,
  token: string
): Promise<TestResult> {
  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));
  if (audioBlob) {
    formData.append('audio', audioBlob, 'speaking.webm');
  }

  const res = await fetch(`${API_BASE}/api/test/submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Submission failed' }));
    throw new Error(errorData.error || `Evaluation failed with status ${res.status}`);
  }

  return res.json();
}
