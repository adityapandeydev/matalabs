import React from 'react';
import { CheckCircle, ArrowRight, BookOpen, Mic } from 'lucide-react';
import { motion } from 'framer-motion';

interface PauseViewProps {
  completedSection: 'Listening' | 'Writing';
  nextSection: 'Reading' | 'Speaking';
  onContinue: () => void;
}

export const PauseView: React.FC<PauseViewProps> = ({
  completedSection,
  nextSection,
  onContinue,
}) => {
  const isReadingNext = nextSection === 'Reading';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="max-w-md mx-auto w-full text-center py-10"
    >
      <div className="glass-panel rounded-3xl p-8 sm:p-10 shadow-xl space-y-6">
        {/* Animated Checkmark Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-18 h-18 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner"
        >
          <CheckCircle className="w-10 h-10" />
        </motion.div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {completedSection} is done.
          </h2>
          <p className="text-lg font-medium text-indigo-600 dark:text-indigo-400 mt-1">
            {nextSection} is next.
          </p>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
          {isReadingNext
            ? 'Great momentum! You will now read a short academic passage and answer 4 questions.'
            : 'Your essay response has been saved. Next, you will perform a quick mic check and answer two speaking questions.'}
        </p>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onContinue}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer transition-all"
        >
          {isReadingNext ? (
            <>
              <BookOpen className="w-4 h-4" /> Begin Reading Section
            </>
          ) : (
            <>
              <Mic className="w-4 h-4" /> Begin Speaking Section
            </>
          )}
          <ArrowRight className="w-4 h-4 ml-1" />
        </motion.button>
      </div>
    </motion.div>
  );
};
