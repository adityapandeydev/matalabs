import React, { useState } from 'react';
import type { Question } from '../types';
import { BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ReadingViewProps {
  title: string;
  passage: string;
  questions: Question[];
  onSubmit: (answers: Record<string, number>) => void;
}

export const ReadingView: React.FC<ReadingViewProps> = ({
  title,
  passage,
  questions,
  onSubmit,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState('');

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
    setError('');
  };

  const handleSubmit = () => {
    if (Object.keys(selectedAnswers).length < questions.length) {
      setError('Please answer all 4 comprehension questions before proceeding.');
      return;
    }
    onSubmit(selectedAnswers);
  };

  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.35 }}
      className="max-w-4xl mx-auto w-full space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Part 2: Reading Comprehension
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Read the academic text below and answer the 4 questions.
            </p>
          </div>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-full glass-panel text-slate-600 dark:text-slate-300 self-start sm:self-auto font-tabular">
          Answered: {answeredCount} / {questions.length}
        </div>
      </div>

      {/* Reading Passage Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/60 dark:border-white/10 space-y-4">
        <div className="border-b border-slate-200/50 dark:border-white/5 pb-3">
          <span className="text-xs uppercase tracking-widest font-bold text-indigo-600 dark:text-indigo-400">
            Passage 1
          </span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
            {title}
          </h3>
        </div>

        <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 space-y-3 font-normal">
          {passage.split('\n\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* Questions Section */}
      <div className="space-y-5 pt-2">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          Questions 1–{questions.length}
        </h3>

        {questions.map((q, qIndex) => {
          return (
            <div
              key={q.id}
              className="glass-panel rounded-2xl p-5 shadow-xs border border-slate-200/60 dark:border-white/10 space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {qIndex + 1}
                </span>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {q.prompt}
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-1">
                {(q.options || []).map((opt: string, optIndex: number) => {
                  const isSelected = selectedAnswers[q.id] === optIndex;
                  const letter = String.fromCharCode(65 + optIndex);

                  return (
                    <button
                      key={optIndex}
                      type="button"
                      onClick={() => handleSelectOption(q.id, optIndex)}
                      className={`w-full text-left p-3.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-500/15 dark:bg-indigo-500/20 text-indigo-900 dark:text-indigo-100 border-2 border-indigo-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="flex-1 leading-snug">{opt}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-rose-500 font-medium text-center">{error}</p>
      )}

      {/* Continue Action */}
      <div className="pt-2">
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={handleSubmit}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer transition-all"
        >
          Complete Reading Section <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};
