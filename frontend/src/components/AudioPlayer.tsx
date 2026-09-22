import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Volume2, UserCheck, CheckCircle2, Radio } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioPlayerProps {
  transcriptText: string;
  autoPlay?: boolean;
  onPlaybackComplete?: () => void;
}

interface DialogueTurn {
  speaker: 'Receptionist' | 'Student';
  text: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  transcriptText,
  autoPlay = false,
  onPlaybackComplete,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<'Receptionist' | 'Student' | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const isPlayingRef = useRef(false);
  const currentTurnIndexRef = useRef(0);
  const hasStartedRef = useRef(false);
  const onCompleteRef = useRef(onPlaybackComplete);
  onCompleteRef.current = onPlaybackComplete;

  const totalDuration = 42; // simulated seconds for dialogue progression

  // Parse conversation turns from dialogue
  const dialogueTurns: DialogueTurn[] = useMemo(() => {
    return transcriptText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        if (line.toLowerCase().startsWith('receptionist:')) {
          return {
            speaker: 'Receptionist',
            text: line.replace(/^receptionist:\s*/i, '').trim(),
          };
        }
        return {
          speaker: 'Student',
          text: line.replace(/^student:\s*/i, '').trim(),
        };
      });
  }, [transcriptText]);

  // Load available system voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Choose distinct voices for Receptionist vs Student
  const { receptionistVoice, studentVoice } = useMemo(() => {
    const enVoices = voices.filter((v) => v.lang.startsWith('en'));
    const pool = enVoices.length > 0 ? enVoices : voices;

    const femaleVoice = pool.find((v) =>
      /female|zira|samantha|victoria|karen|jenny|moira|fiona/i.test(v.name)
    );
    const maleVoice = pool.find((v) =>
      /male|david|george|daniel|guy|oliver|rishi|alex/i.test(v.name) && v !== femaleVoice
    );

    return {
      receptionistVoice: femaleVoice || pool[0] || null,
      studentVoice: maleVoice || (pool.length > 1 ? pool[1] : pool[0]) || null,
    };
  }, [voices]);

  const playTurn = (index: number) => {
    if (!isPlayingRef.current) return;

    if (index >= dialogueTurns.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setIsCompleted(true);
      setProgress(100);
      setCurrentSpeaker(null);
      if (onCompleteRef.current) {
        onCompleteRef.current();
      }
      return;
    }

    currentTurnIndexRef.current = index;
    const turn = dialogueTurns[index];
    setCurrentSpeaker(turn.speaker);
    setProgress(Math.round(((index + 1) / dialogueTurns.length) * 100));

    if (!('speechSynthesis' in window)) {
      // Fallback timer if speech synthesis is disabled in environment
      setTimeout(() => {
        if (isPlayingRef.current) playTurn(index + 1);
      }, 2500);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(turn.text);

    if (turn.speaker === 'Receptionist') {
      if (receptionistVoice) utterance.voice = receptionistVoice;
      utterance.pitch = 1.15;
      utterance.rate = 0.95;
    } else {
      if (studentVoice) utterance.voice = studentVoice;
      utterance.pitch = 0.88;
      utterance.rate = 1.0;
    }

    utterance.onend = () => {
      if (isPlayingRef.current) {
        setTimeout(() => {
          if (isPlayingRef.current) {
            playTurn(index + 1);
          }
        }, 400);
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech utterance event:', e);
      if (isPlayingRef.current) {
        playTurn(index + 1);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Auto-play when trigger becomes active
  useEffect(() => {
    if (autoPlay && !hasStartedRef.current && dialogueTurns.length > 0) {
      hasStartedRef.current = true;
      isPlayingRef.current = true;
      setIsPlaying(true);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      playTurn(0);
    }
  }, [autoPlay, dialogueTurns]);

  const currentSeconds = Math.min(totalDuration, Math.floor((progress / 100) * totalDuration));
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-white/10 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
              isPlaying
                ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-2 ring-cyan-500/30 animate-pulse'
                : isCompleted
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400'
            }`}
          >
            {isPlaying ? (
              <Radio className="w-5 h-5 animate-spin-slow" />
            ) : isCompleted ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Audio Recording: University Study Suites
              </h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/60 dark:border-white/5">
                Plays Once Only
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isPlaying
                ? 'Listen carefully and note down details. Questions unlock once audio concludes.'
                : isCompleted
                ? 'Recording has finished. You may now review and answer the questions below.'
                : 'Waiting for transition timer to start playback...'}
            </p>
          </div>
        </div>

        {/* Current Speaker Indicator Badge */}
        {currentSpeaker && isPlaying && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0 animate-pulse transition-colors ${
              currentSpeaker === 'Receptionist'
                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Speaking: {currentSpeaker}</span>
          </div>
        )}

        {isCompleted && (
          <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> Audio Complete
          </span>
        )}
      </div>

      {/* Live Waveform Bar & Progress (Non-interactive / Cannot be paused or scrubbed) */}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex-1 flex items-center gap-1 h-8 px-2 overflow-hidden bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/50 dark:border-white/5">
          {Array.from({ length: 36 }).map((_, i) => {
            const barProgress = (i / 36) * 100;
            const isPassed = barProgress <= progress;
            const activeHeight = isPlaying
              ? Math.sin(i * 0.7 + progress * 0.25) * 12 + 14
              : isCompleted
              ? 6
              : 8 + (i % 4) * 2;

            return (
              <motion.div
                key={i}
                animate={{ height: activeHeight }}
                transition={{ duration: 0.15 }}
                className={`w-1 rounded-full transition-colors ${
                  isPassed
                    ? currentSpeaker === 'Receptionist'
                      ? 'bg-cyan-500 dark:bg-cyan-400'
                      : 'bg-indigo-500 dark:bg-indigo-400'
                    : 'bg-slate-200 dark:bg-slate-700/60'
                }`}
              />
            );
          })}
        </div>

        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 font-tabular shrink-0">
          {formatTime(currentSeconds)} / {formatTime(totalDuration)}
        </div>
      </div>
    </div>
  );
};
