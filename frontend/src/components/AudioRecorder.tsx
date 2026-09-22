import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, CheckCircle2, AlertCircle, RefreshCw, Volume2, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { ThinkingOrb } from './ThinkingOrb';
import { AudioPreviewPlayer } from './AudioPreviewPlayer';

interface AudioRecorderProps {
  questions: string[];
  isDark: boolean;
  onComplete: (audioBlob: Blob, audioBlob2?: Blob) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  questions,
  isDark,
  onComplete,
}) => {
  // Phase: 'mic_check' | 'question_1' | 'question_2' | 'review'
  const [phase, setPhase] = useState<'mic_check' | 'question_1' | 'question_2' | 'review'>('mic_check');
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Examiner Bot Speaking State
  const [isExaminerSpeaking, setIsExaminerSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const hasSpokenQ1Ref = useRef(false);
  const hasSpokenQ2Ref = useRef(false);

  // Question 1 Audio
  const [q1Blob, setQ1Blob] = useState<Blob | null>(null);
  const [q1Url, setQ1Url] = useState<string | null>(null);
  const [q1Duration, setQ1Duration] = useState<number>(3);

  // Question 2 Audio
  const [q2Blob, setQ2Blob] = useState<Blob | null>(null);
  const [q2Url, setQ2Url] = useState<string | null>(null);
  const [q2Duration, setQ2Duration] = useState<number>(3);

  const recordingSecondsRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const currentChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  // Load system voices for bot question speech
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const load = () => {
      const avail = window.speechSynthesis.getVoices();
      if (avail.length > 0) setVoices(avail);
    };

    load();
    window.speechSynthesis.onvoiceschanged = load;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Speak a question with natural examiner voice
  const speakQuestion = (text: string) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const enVoices = voices.filter((v) => v.lang.startsWith('en'));
    const pool = enVoices.length > 0 ? enVoices : voices;

    // Search for a natural examiner voice
    const examinerVoice = pool.find((v) =>
      /george|david|oliver|daniel|guy|samantha|victoria|karen/i.test(v.name)
    ) || pool[0];

    if (examinerVoice) utterance.voice = examinerVoice;
    utterance.rate = 0.94;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsExaminerSpeaking(true);
    };

    utterance.onend = () => {
      setIsExaminerSpeaking(false);
    };

    utterance.onerror = () => {
      setIsExaminerSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Stop bot speech whenever needed
  const cancelExaminerSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsExaminerSpeaking(false);
  };

  // Initialize Microphone for Check
  useEffect(() => {
    let active = true;

    async function setupMic() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        mediaStreamRef.current = stream;
        setHasMicPermission(true);

        const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
          if (!active) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setVolumeLevel(Math.min(100, Math.round((avg / 128) * 100)));
          animationRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (err) {
        console.error('Microphone access denied:', err);
        setHasMicPermission(false);
      }
    }

    setupMic();

    return () => {
      active = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Trigger examiner speech when entering question 1
  useEffect(() => {
    if (phase === 'question_1' && !hasSpokenQ1Ref.current) {
      hasSpokenQ1Ref.current = true;
      const q1Text = questions[0] || 'Describe an interesting place in your hometown.';
      // Short 300ms pause before examiner speaks
      const timer = setTimeout(() => {
        speakQuestion(q1Text);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [phase, questions, voices]);

  // Trigger examiner speech when entering question 2
  useEffect(() => {
    if (phase === 'question_2' && !hasSpokenQ2Ref.current) {
      hasSpokenQ2Ref.current = true;
      const q2Text = questions[1] || 'How do you usually relax after a demanding week?';
      const timer = setTimeout(() => {
        speakQuestion(q2Text);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [phase, questions, voices]);

  // Recording Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Start recording for a specific question (1 or 2)
  const startQuestionRecording = (questionNum: 1 | 2) => {
    if (!mediaStreamRef.current) return;

    // Stop examiner speaking if still in progress
    cancelExaminerSpeech();

    try {
      currentChunksRef.current = [];
      recordingSecondsRef.current = 0;
      const recorder = new MediaRecorder(mediaStreamRef.current, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          currentChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(currentChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(finalBlob);
        const durationSecs = Math.max(3, recordingSecondsRef.current);

        if (questionNum === 1) {
          setQ1Blob(finalBlob);
          setQ1Url(url);
          setQ1Duration(durationSecs);
          setPhase('question_2');
        } else {
          setQ2Blob(finalBlob);
          setQ2Url(url);
          setQ2Duration(durationSecs);
          setPhase('review');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
    } catch (err) {
      console.error('MediaRecorder start error:', err);
    }
  };

  // Stop recording for current question
  const stopQuestionRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleFinish = () => {
    cancelExaminerSpeech();
    const emptyBlob = new Blob([], { type: 'audio/webm' });
    const first = q1Blob || emptyBlob;
    const second = q2Blob || emptyBlob;
    onComplete(first, second);
  };

  const q1Text = questions[0] || 'Describe an interesting place in your hometown.';
  const q2Text = questions[1] || 'How do you usually relax after a demanding week?';

  return (
    <div className="glass-panel rounded-3xl p-6 md:p-8 max-w-2xl mx-auto shadow-lg space-y-6">
      {/* 1. Microphone Check Stage */}
      {phase === 'mic_check' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
            <Mic className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Step 1: Microphone Check
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Please speak out loud to confirm your microphone is detecting audio clearly.
            </p>
          </div>

          {/* Volume Meter Bars */}
          <div className="p-5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 space-y-3">
            <div className="flex items-center justify-center gap-1.5 h-10">
              {Array.from({ length: 24 }).map((_, i) => {
                const threshold = (i / 24) * 100;
                const isActive = volumeLevel >= threshold;
                return (
                  <motion.div
                    key={i}
                    animate={{
                      height: isActive ? Math.max(12, volumeLevel * 0.4) : 6,
                    }}
                    transition={{ duration: 0.08 }}
                    className={`w-1.5 rounded-full transition-colors ${
                      isActive
                        ? volumeLevel > 65
                          ? 'bg-rose-500'
                          : volumeLevel > 30
                          ? 'bg-emerald-500 dark:bg-emerald-400'
                          : 'bg-indigo-500'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-medium">
              {hasMicPermission === false ? (
                <span className="text-rose-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Microphone permission blocked in browser settings
                </span>
              ) : volumeLevel > 15 ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Audio signal detected clearly
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500">
                  Speak a short greeting into your microphone to verify...
                </span>
              )}
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPhase('question_1')}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-md shadow-indigo-600/20 cursor-pointer transition-all"
          >
            Microphone Ready — Proceed to Question 1
          </motion.button>
        </motion.div>
      )}

      {/* 2. Question 1 Flow */}
      {phase === 'question_1' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400">
              Speaking Question 1 of 2
            </span>
            <span className="text-xs font-mono text-slate-400 font-tabular">
              {recordingSeconds}s elapsed
            </span>
          </div>

          {/* Question Box with Audio Speaking Indicator */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
                {q1Text}
              </h4>
              <button
                type="button"
                onClick={() => speakQuestion(q1Text)}
                disabled={isRecording}
                title="Replay Examiner Audio"
                className={`p-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                  isExaminerSpeaking
                    ? 'bg-indigo-600 text-white animate-pulse shadow-md shadow-indigo-500/20'
                    : 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {isExaminerSpeaking ? (
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse pt-1">
                <Radio className="w-3.5 h-3.5" /> Examiner is speaking the question...
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tip: Aim to speak fluently for 20–30 seconds. Discuss location, personal memories, and why visitors would appreciate it.
              </p>
            )}
          </div>

          {/* Orb Animation */}
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <ThinkingOrb
              state={isRecording ? 'listening' : isExaminerSpeaking ? 'solving' : 'shaping'}
              size={64}
              isDark={isDark}
            />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isRecording
                ? 'Microphone Active — Recording Question 1...'
                : isExaminerSpeaking
                ? 'Listen to the examiner asking the question...'
                : 'Examiner finished — click below when ready to record'}
            </p>
          </div>

          <div className="flex gap-3">
            {!isRecording ? (
              <>
                <button
                  type="button"
                  onClick={() => speakQuestion(q1Text)}
                  className="py-3.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Volume2 className="w-4 h-4 text-indigo-500" /> Replay
                </button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startQuestionRecording(1)}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-medium flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-pink-600/20 transition-all text-sm"
                >
                  <Mic className="w-5 h-5" /> Start Speaking Question 1
                </motion.button>
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={stopQuestionRecording}
                className="flex-1 py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-medium flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Square className="w-4 h-4 text-rose-400 fill-current" /> Complete Question 1 & Proceed
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {/* 3. Question 2 Flow */}
      {phase === 'question_2' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400">
              Speaking Question 2 of 2
            </span>
            <span className="text-xs font-mono text-slate-400 font-tabular">
              {recordingSeconds}s elapsed
            </span>
          </div>

          {/* Question Box with Audio Speaking Indicator */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-white/5 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
                {q2Text}
              </h4>
              <button
                type="button"
                onClick={() => speakQuestion(q2Text)}
                disabled={isRecording}
                title="Replay Examiner Audio"
                className={`p-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                  isExaminerSpeaking
                    ? 'bg-indigo-600 text-white animate-pulse shadow-md shadow-indigo-500/20'
                    : 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-300'
                }`}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {isExaminerSpeaking ? (
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse pt-1">
                <Radio className="w-3.5 h-3.5" /> Examiner is speaking the question...
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tip: Elaborate on your favorite leisure activities, how they help you decompress, and who you spend time with.
              </p>
            )}
          </div>

          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <ThinkingOrb
              state={isRecording ? 'listening' : isExaminerSpeaking ? 'solving' : 'shaping'}
              size={64}
              isDark={isDark}
            />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isRecording
                ? 'Microphone Active — Recording Question 2...'
                : isExaminerSpeaking
                ? 'Listen to the examiner asking the question...'
                : 'Examiner finished — click below when ready to record'}
            </p>
          </div>

          <div className="flex gap-3">
            {!isRecording ? (
              <>
                <button
                  type="button"
                  onClick={() => speakQuestion(q2Text)}
                  className="py-3.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Volume2 className="w-4 h-4 text-indigo-500" /> Replay
                </button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => startQuestionRecording(2)}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-medium flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-pink-600/20 transition-all text-sm"
                >
                  <Mic className="w-5 h-5" /> Start Speaking Question 2
                </motion.button>
              </>
            ) : (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={stopQuestionRecording}
                className="flex-1 py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-medium flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Square className="w-4 h-4 text-rose-400 fill-current" /> Complete Question 2 & Review
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {/* 4. Review & Confirmation Stage with Custom Audio Players */}
      {phase === 'review' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Speaking Responses Captured
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Review your recorded responses below with the audio player before final submission.
            </p>
          </div>

          {/* Audio Preview Cards for Question 1 and Question 2 */}
          <div className="space-y-3">
            {q1Url && (
              <AudioPreviewPlayer
                src={q1Url}
                initialDuration={q1Duration}
                label={`Q1: ${q1Text}`}
                onRetake={() => {
                  hasSpokenQ1Ref.current = false;
                  setPhase('question_1');
                  setQ1Blob(null);
                  setQ1Url(null);
                }}
              />
            )}

            {q2Url && (
              <AudioPreviewPlayer
                src={q2Url}
                initialDuration={q2Duration}
                label={`Q2: ${q2Text}`}
                onRetake={() => {
                  hasSpokenQ2Ref.current = false;
                  setPhase('question_2');
                  setQ2Blob(null);
                  setQ2Url(null);
                }}
              />
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                hasSpokenQ1Ref.current = false;
                hasSpokenQ2Ref.current = false;
                setPhase('question_1');
                setQ1Blob(null);
                setQ1Url(null);
                setQ2Blob(null);
                setQ2Url(null);
              }}
              className="py-3 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-record All
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleFinish}
              className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-md shadow-indigo-600/20 cursor-pointer transition-all text-sm"
            >
              Submit Both Responses for Evaluation
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
