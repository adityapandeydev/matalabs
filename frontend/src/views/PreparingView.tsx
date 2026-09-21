import React, { useState, useEffect } from 'react';
import { ThinkingOrb } from '../components/ThinkingOrb';
import { motion, AnimatePresence } from 'framer-motion';

interface PreparingViewProps {
  isDark: boolean;
}

const STATUS_MESSAGES = [
  'Transcribing spoken audio with multimodal speech models...',
  'Evaluating essay vocabulary, coherence & grammar precision...',
  'Analyzing spoken fluency, rhythm and acoustic clarity...',
  'Calculating consolidated four-part band score averages...',
  'Compiling personalized diagnostic feedback & action plan...',
];

export const PreparingView: React.FC<PreparingViewProps> = ({ isDark }) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < STATUS_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35 }}
      className="max-w-md mx-auto w-full text-center py-12"
    >
      <div className="glass-panel rounded-3xl p-8 sm:p-12 shadow-2xl space-y-8 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Featured RareFormLabs Animated Thinking Orb */}
        <div className="flex justify-center pt-2">
          <ThinkingOrb state="solving" size={96} isDark={isDark} />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            We are preparing your results
          </h2>

          <div className="h-10 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentStep}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 font-medium max-w-xs mx-auto"
              >
                {STATUS_MESSAGES[currentStep]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Apple-styled Indeterminate Progress Bar */}
        <div className="w-full bg-slate-200/70 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
          <motion.div
            initial={{ width: '15%' }}
            animate={{ width: `${Math.min(95, 20 + currentStep * 20)}%` }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="h-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-violet-500 rounded-full"
          />
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Real automated AI examiner verification in progress.
        </p>
      </div>
    </motion.div>
  );
};
