import React, { useState } from 'react';
import { PenTool, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface WritingViewProps {
  prompt: string;
  minWords: number;
  onSubmit: (essayText: string) => void;
}

export const WritingView: React.FC<WritingViewProps> = ({
  prompt,
  minWords = 150,
  onSubmit,
}) => {
  const [essay, setEssay] = useState('');
  const [error, setError] = useState('');

  const wordCount = essay.trim() === '' ? 0 : essay.trim().split(/\s+/).length;
  const charCount = essay.length;
  const isMinReached = wordCount >= minWords;

  const handleSubmit = () => {
    if (wordCount < 10) {
      setError('Please write at least a short response to receive an evaluation.');
      return;
    }
    onSubmit(essay.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="max-w-3xl mx-auto w-full space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <PenTool className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Part 3: Writing Task
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compose an argumentative essay addressing the prompt below.
            </p>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`text-xs font-semibold px-3 py-1.5 rounded-full glass-panel font-tabular transition-colors ${
              isMinReached
                ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {wordCount} / {minWords} words
          </span>
          <span className="text-xs font-mono text-slate-400 px-2 py-1 font-tabular">
            {charCount} chars
          </span>
        </div>
      </div>

      {/* Essay Prompt Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-sm border border-slate-200/60 dark:border-white/10 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          <Sparkles className="w-3.5 h-3.5" /> Academic Essay Prompt
        </div>
        <p className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
          {prompt}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Give reasons for your answer and include relevant examples from your own knowledge or experience.
        </p>
      </div>

      {/* Clean Distraction-Free Textarea */}
      <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-inner border border-slate-200/60 dark:border-white/10 space-y-2">
        <textarea
          rows={12}
          value={essay}
          onChange={(e) => {
            setEssay(e.target.value);
            if (error) setError('');
          }}
          placeholder="Begin typing your essay response here... (e.g. In recent years, the rapid acceleration of technology...)"
          className="w-full bg-transparent text-sm sm:text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-y leading-relaxed"
        />

        <div className="border-t border-slate-200/40 dark:border-white/5 pt-2 flex items-center justify-between text-xs text-slate-400">
          <span>Evaluated by AI against IELTS coherence, lexical resource & grammar rubrics.</span>
          {isMinReached && (
            <span className="text-emerald-500 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Target length reached
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500 font-medium flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <div>
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={handleSubmit}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 cursor-pointer transition-all"
        >
          Submit Essay & Proceed to Speaking <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};
