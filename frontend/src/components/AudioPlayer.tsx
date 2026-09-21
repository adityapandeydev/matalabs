import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Volume2, FileText, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioPlayerProps {
  audioUrl?: string;
  transcriptText: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ transcriptText }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration] = useState(48); // 48 seconds representative dialogue
  const [showTranscript, setShowTranscript] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const handlePlayToggle = () => {
    if (isPlaying) {
      // Pause
      if (window.speechSynthesis) {
        window.speechSynthesis.pause();
      }
      setIsPlaying(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      // Play
      setIsPlaying(true);

      // Web Speech synthesis for crisp real speech in all environments
      if ('speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else {
          window.speechSynthesis.cancel();
          const cleanText = transcriptText.replace(/(Receptionist:|Student:)/g, '');
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.rate = 0.95; // realistic academic pace
          utterance.pitch = 1.0;
          utterance.onend = () => {
            setIsPlaying(false);
            setProgress(100);
            if (timerRef.current) clearInterval(timerRef.current);
          };
          speechRef.current = utterance;
          window.speechSynthesis.speak(utterance);
        }
      }

      // Progress bar animation
      const interval = 200;
      const totalSteps = (duration * 1000) / interval;
      timerRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timerRef.current!);
            setIsPlaying(false);
            return 100;
          }
          return prev + 100 / totalSteps;
        });
      }, interval);
    }
  };

  const handleRestart = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(0);
    setIsPlaying(false);
  };

  const currentSeconds = Math.floor((progress / 100) * duration);
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Audio Recording: University Study Suites
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Listen carefully to the conversation between the receptionist and the student.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-indigo-500/10 transition-colors"
        >
          <FileText className="w-3.5 h-3.5" />
          {showTranscript ? 'Hide Transcript' : 'Transcript'}
        </button>
      </div>

      {/* Waveform & Playback Controls */}
      <div className="flex items-center gap-4 pt-1">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={handlePlayToggle}
          className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 cursor-pointer transition-colors shrink-0"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </motion.button>

        <button
          onClick={handleRestart}
          title="Restart Audio"
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Dynamic Simulated Waveform Bars */}
        <div className="flex-1 flex items-center gap-1 h-8 px-2 overflow-hidden">
          {Array.from({ length: 32 }).map((_, i) => {
            const barProgress = (i / 32) * 100;
            const isPassed = barProgress <= progress;
            const activeHeight = isPlaying
              ? Math.sin(i * 0.7 + progress * 0.2) * 14 + 16
              : 8 + (i % 5) * 3;

            return (
              <motion.div
                key={i}
                animate={{ height: activeHeight }}
                transition={{ duration: 0.15 }}
                className={`w-1 rounded-full transition-colors ${
                  isPassed
                    ? 'bg-cyan-500 dark:bg-cyan-400'
                    : 'bg-slate-200 dark:bg-slate-700/60'
                }`}
              />
            );
          })}
        </div>

        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 font-tabular shrink-0">
          {formatTime(currentSeconds)} / {formatTime(duration)}
        </div>
      </div>

      {/* Transcript Drawer */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-200/40 dark:border-white/5 pt-3"
          >
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-mono whitespace-pre-line border border-slate-200/50 dark:border-white/5">
              <div className="flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400 font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Reference Dialogue Transcript:
              </div>
              {transcriptText}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
