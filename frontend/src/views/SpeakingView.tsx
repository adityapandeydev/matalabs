import React from 'react';
import { AudioRecorder } from '../components/AudioRecorder';
import { Mic, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

interface SpeakingViewProps {
  questions: string[];
  isDark: boolean;
  onComplete: (audioBlob: Blob, audioBlob2?: Blob) => void;
}

export const SpeakingView: React.FC<SpeakingViewProps> = ({
  questions,
  isDark,
  onComplete,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="max-w-3xl mx-auto w-full space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-pink-500/10 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 flex items-center justify-center">
          <Mic className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Part 4: Speaking Assessment
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real spoken interview with speech-to-text transcription and automated fluency grading.
          </p>
        </div>
      </div>

      {/* Audio Recorder Component */}
      <AudioRecorder
        questions={questions}
        isDark={isDark}
        onComplete={onComplete}
      />

      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 max-w-md mx-auto text-center">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
        <span>Audio is evaluated directly in memory by AI examiners. No files are stored or shared.</span>
      </div>
    </motion.div>
  );
};
