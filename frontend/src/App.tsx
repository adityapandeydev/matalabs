import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import type { TestStage, TestContent, TestResult, AuthUser } from './types';
import { fetchTestContent, loginWithGoogle, submitFullTest } from './services/api';

import { ThemeToggle } from './components/ThemeToggle';
import { ListeningView } from './views/ListeningView';
import { ReadingView } from './views/ReadingView';
import { PauseView } from './views/PauseView';
import { AuthGateView } from './views/AuthGateView';
import { WritingView } from './views/WritingView';
import { SpeakingView } from './views/SpeakingView';
import { PreparingView } from './views/PreparingView';
import { ResultsView } from './views/ResultsView';

import { AnimatePresence } from 'framer-motion';
import { Headphones, BookOpen, PenTool, Mic, Award, User } from 'lucide-react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export const App: React.FC = () => {
  // Theme state
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('matalabs_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('matalabs_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('matalabs_theme', 'light');
    }
  }, [isDark]);

  // Auth Data (loaded from storage if already authenticated)
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('matalabs_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('matalabs_token');
  });

  // Test Flow States - Starts directly on Listening!
  const [stage, setStage] = useState<TestStage>('listening');
  const [testContent, setTestContent] = useState<TestContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);

  // Candidate Data (automatically retrieved from Google profile)
  const [candidateName, setCandidateName] = useState(() => authUser?.name || '');
  const [candidateContact, setCandidateContact] = useState(() => authUser?.email || '');
  const [targetScore] = useState(7.5);

  // Submissions Data
  const [listeningAnswers, setListeningAnswers] = useState<Record<string, number>>({});
  const [readingAnswers, setReadingAnswers] = useState<Record<string, number>>({});
  const [essayText, setEssayText] = useState('');
  const [finalResult, setFinalResult] = useState<TestResult | null>(null);
  const [pendingAudio, setPendingAudio] = useState<{ q1: Blob | null; q2: Blob | null } | null>(null);

  // Load Test Content from Backend
  useEffect(() => {
    fetchTestContent()
      .then((data) => {
        setTestContent(data);
        setLoadingContent(false);
      })
      .catch((err) => {
        console.error('Failed to load test content:', err);
        setLoadingContent(false);
      });
  }, []);

  // 1. Listening Complete -> Move to Pause 1 (no score shown)
  const handleListeningSubmit = (answers: Record<string, number>) => {
    setListeningAnswers(answers);
    setStage('pause_reading');
  };

  // 2. Pause 1 Complete -> Move to Reading
  const handlePauseReadingContinue = () => {
    setStage('reading');
  };

  // 3. Reading Complete -> Check Google Auth Gate
  // 3. Reading Complete -> Strict Google Sign-In Gate
  const handleReadingSubmit = (answers: Record<string, number>) => {
    setReadingAnswers(answers);
    // If user is already authenticated with Google, advance directly to Writing!
    if (authToken && authUser) {
      setCandidateName(authUser.name);
      setCandidateContact(authUser.email);
      setStage('writing');
    } else {
      setStage('auth_gate');
    }
  };

  // 4. Google Sign-In Success -> Populates candidate identity and advances to Writing
  const handleGoogleAuthSuccess = async (credential: string) => {
    const authData = await loginWithGoogle(credential);
    setAuthToken(authData.token);
    setAuthUser(authData.user);
    localStorage.setItem('matalabs_token', authData.token);
    localStorage.setItem('matalabs_user', JSON.stringify(authData.user));
    setCandidateName(authData.user.name);
    setCandidateContact(authData.user.email);

    // If candidate had a pending submission interrupted by an expired token:
    if (pendingAudio) {
      setStage('preparing');
      try {
        const payload = {
          target_score: targetScore,
          candidate_name: authData.user.name,
          candidate_contact: authData.user.email,
          listening_answers: listeningAnswers,
          reading_answers: readingAnswers,
          essay_text: essayText,
        };
        const result = await submitFullTest(
          payload,
          pendingAudio ? pendingAudio.q1 : null,
          authData.token,
          pendingAudio ? pendingAudio.q2 : null
        );
        setFinalResult(result);
        setPendingAudio(null);
        setTimeout(() => {
          setStage('results');
        }, 1500);
      } catch (err: unknown) {
        console.error('Pending submission retry error:', err);
        const msg = err instanceof Error ? err.message : 'Evaluation failed';
        alert(`Evaluation error: ${msg}`);
        setStage('speaking');
      }
      return;
    }

    setStage('writing');
  };

  // 6. Writing Complete -> Move to Pause 2 (no score shown)
  const handleWritingSubmit = (text: string) => {
    // Security check: protect writing from unauthenticated visitors
    if (!authToken) {
      setStage('auth_gate');
      return;
    }
    setEssayText(text);
    setStage('pause_speaking');
  };

  // 7. Pause 2 Complete -> Move to Speaking
  const handlePauseSpeakingContinue = () => {
    if (!authToken) {
      setStage('auth_gate');
      return;
    }
    setStage('speaking');
  };

  // 8. Speaking Complete -> Transition to Preparing -> Dispatch Full AI Evaluation
  const handleSpeakingComplete = async (audioBlob: Blob, audioBlob2?: Blob) => {
    if (!authToken) {
      setPendingAudio({ q1: audioBlob, q2: audioBlob2 || null });
      setStage('auth_gate');
      return;
    }

    setStage('preparing');

    try {
      const payload = {
        target_score: targetScore,
        candidate_name: candidateName || (authUser ? authUser.name : 'Candidate'),
        candidate_contact: candidateContact || (authUser ? authUser.email : ''),
        listening_answers: listeningAnswers,
        reading_answers: readingAnswers,
        essay_text: essayText,
      };

      const result = await submitFullTest(payload, audioBlob, authToken, audioBlob2);
      setFinalResult(result);
      setPendingAudio(null);

      // Short aesthetic pause on preparing results
      setTimeout(() => {
        setStage('results');
      }, 1500);
    } catch (err: unknown) {
      console.error('Submission evaluation error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);

      // If token is invalid or expired (401), automatically clear stale cache and route to Google Gate
      if (errMsg.includes('401') || errMsg.includes('unauthorized') || errMsg.includes('session')) {
        localStorage.removeItem('matalabs_token');
        localStorage.removeItem('matalabs_user');
        setAuthToken(null);
        setAuthUser(null);
        setPendingAudio({ q1: audioBlob, q2: audioBlob2 || null });
        setStage('auth_gate');
        return;
      }

      alert(`Submission error: ${errMsg}. Please try again.`);
      setStage('speaking');
    }
  };

  // Restart / Retake
  const handleRetake = () => {
    setListeningAnswers({});
    setReadingAnswers({});
    setEssayText('');
    setFinalResult(null);
    setPendingAudio(null);
    // Clear stale session on retake so fresh Google authentication always occurs cleanly
    localStorage.removeItem('matalabs_token');
    localStorage.removeItem('matalabs_user');
    setAuthToken(null);
    setAuthUser(null);
    setStage('listening');
  };

  // Stage progress navigation dots
  const stagePills = [
    { key: 'listening', label: 'Listening', icon: Headphones },
    { key: 'reading', label: 'Reading', icon: BookOpen },
    { key: 'writing', label: 'Writing', icon: PenTool },
    { key: 'speaking', label: 'Speaking', icon: Mic },
    { key: 'results', label: 'Results', icon: Award },
  ];

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className={`min-h-screen flex flex-col relative transition-colors duration-400 ${isDark ? 'mesh-glow-dark' : 'mesh-glow-light'}`}>
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 border-b border-slate-200/50 dark:border-white/5 glass-panel">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-extrabold shadow-md shadow-indigo-500/20">
                M
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  Matalabs <span className="font-normal text-xs text-indigo-500">English 4-Skill</span>
                </div>
                <div className="text-[10px] text-slate-400">Automated Multimodal Assessment</div>
              </div>
            </div>

            {/* Stage Progress Pills (Shown during test) */}
            {stage !== 'preparing' && (
              <div className="hidden md:flex items-center gap-2">
                {stagePills.map((pill) => {
                  const Icon = pill.icon;
                  const isActive = stage.includes(pill.key);

                  return (
                    <div
                      key={pill.key}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{pill.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Right User & Theme Controls */}
            <div className="flex items-center gap-3">
              {authUser && (
                <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 glass-panel px-3 py-1.5 rounded-full">
                  {authUser.picture ? (
                    <img src={authUser.picture} alt={authUser.name} className="w-5 h-5 rounded-full" />
                  ) : (
                    <User className="w-4 h-4 text-indigo-500" />
                  )}
                  <span className="truncate max-w-[120px]">{authUser.name}</span>
                </div>
              )}

              <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
            </div>
          </div>
        </header>

        {/* Main Content Stage View */}
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col justify-center">
          {loadingContent ? (
            <div className="text-center py-20 space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Initializing 4-skill diagnostic environment...
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {stage === 'listening' && testContent && (
                <ListeningView
                  key="listening"
                  audioUrl={testContent.listening_audio_url}
                  transcriptText={testContent.listening_audio_text}
                  questions={testContent.listening_questions}
                  onSubmit={handleListeningSubmit}
                />
              )}

              {stage === 'pause_reading' && (
                <PauseView
                  key="pause_reading"
                  completedSection="Listening"
                  nextSection="Reading"
                  onContinue={handlePauseReadingContinue}
                />
              )}

              {stage === 'reading' && testContent && (
                <ReadingView
                  key="reading"
                  title={testContent.reading_title}
                  passage={testContent.reading_passage}
                  questions={testContent.reading_questions}
                  onSubmit={handleReadingSubmit}
                />
              )}

              {stage === 'auth_gate' && (
                <AuthGateView
                  key="auth_gate"
                  candidateName={candidateName}
                  onSuccess={handleGoogleAuthSuccess}
                />
              )}

              {stage === 'writing' && testContent && (
                <WritingView
                  key="writing"
                  prompt={testContent.writing_prompt}
                  minWords={testContent.writing_min_words}
                  onSubmit={handleWritingSubmit}
                />
              )}

              {stage === 'pause_speaking' && (
                <PauseView
                  key="pause_speaking"
                  completedSection="Writing"
                  nextSection="Speaking"
                  onContinue={handlePauseSpeakingContinue}
                />
              )}

              {stage === 'speaking' && testContent && (
                <SpeakingView
                  key="speaking"
                  questions={testContent.speaking_questions}
                  isDark={isDark}
                  onComplete={handleSpeakingComplete}
                />
              )}

              {stage === 'preparing' && (
                <PreparingView key="preparing" isDark={isDark} />
              )}

              {stage === 'results' && finalResult && (
                <ResultsView
                  key="results"
                  result={finalResult}
                  speakingQuestions={testContent?.speaking_questions}
                  writingPrompt={testContent?.writing_prompt}
                  onRetake={handleRetake}
                />
              )}
            </AnimatePresence>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/40 dark:border-white/5 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
          <p>© 2026 Matalabs English Proficiency Evaluation. Fast, automated, non-commercial diagnostic.</p>
        </footer>
      </div>
    </GoogleOAuthProvider>
  );
};

export default App;
