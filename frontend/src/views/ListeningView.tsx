import React, { useState } from 'react';
import type { Question } from '../types';
import { AudioPlayer } from '../components/AudioPlayer';
import { Headphones, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ListeningViewProps {
  audioUrl: string;
  transcriptText: string;
  questions: Question[];
  onSubmit: (answers: Record<string, number>) => void;
}

export const ListeningView: React.FC<ListeningViewProps> = ({
  audioUrl,
  transcriptText,
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
    // Check if at least 1 answer selected or alert
    if (Object.keys(selectedAnswers).length < questions.length) {
      setError('Please answer all 4 questions before moving to the next section.');
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
      className="max-w-3xl mx-auto w-full space-y-6"
    >
      {/* Header Badge & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Part 1: Listening Comprehension
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Listen to the recording and answer the questions below.
            </p>
          </div>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-full glass-panel text-slate-600 dark:text-slate-300 self-start sm:self-auto font-tabular">
          Answered: {answeredCount} / {questions.length}
        </div>
      </div>

      {/* Audio Player Component */}
      <AudioPlayer audioUrl={audioUrl} transcriptText={transcriptText} />

      {/* Questions List */}
      <div className="space-y-5 pt-2">
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
                            ? 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-100 border-2 border-cyan-500 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-cyan-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {letter}
                        </span>
                        <span className="flex-1 leading-snug">{opt}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
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

      {/* Primary Submit Button */}
      <div className="pt-2">
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={handleSubmit}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 cursor-pointer transition-all"
        >
          Submit Listening & Continue <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};
