import React, { useState, useEffect } from 'react';
import type { Question } from '../types';
import { AudioPlayer } from '../components/AudioPlayer';
import { Headphones, ArrowRight, CheckCircle2, Lock, FileText, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ListeningViewProps {
  audioUrl?: string;
  transcriptText: string;
  questions: Question[];
  onSubmit: (answers: Record<string, number>) => void;
}

export const ListeningView: React.FC<ListeningViewProps> = ({
  transcriptText,
  questions,
  onSubmit,
}) => {
  // 5-second transition countdown modal
  const [showCountdownModal, setShowCountdownModal] = useState(true);
  const [countdown, setCountdown] = useState(5);

  // Continuous playback & question unlock state
  const [isAudioFinished, setIsAudioFinished] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState('');

  // 5-second countdown timer
  useEffect(() => {
    if (!showCountdownModal) return;

    if (countdown > 0) {
      const timer = window.setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowCountdownModal(false);
    }
  }, [countdown, showCountdownModal]);

  const handlePlaybackComplete = () => {
    setIsAudioFinished(true);
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (!isAudioFinished) return; // Prevent clicking while audio is playing
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
    setError('');
  };

  const handleSubmit = () => {
    if (!isAudioFinished) {
      setError('Please listen to the entire audio dialogue before submitting.');
      return;
    }
    if (Object.keys(selectedAnswers).length < questions.length) {
      setError('Please answer all 4 questions before proceeding to Reading.');
      return;
    }
    onSubmit(selectedAnswers);
  };

  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="relative max-w-3xl mx-auto w-full">
      {/* 5-Second Transition Modal */}
      <AnimatePresence>
        {showCountdownModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="glass-panel rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl border border-white/20 dark:border-white/10"
            >
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/30">
                <FileText className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                  <Sparkles className="w-3.5 h-3.5" /> Part 1: Listening Comprehension
                </div>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  Are you ready with your notes?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs mx-auto">
                  The audio will begin automatically and will play <strong className="text-slate-900 dark:text-white">only once</strong> without pausing. Questions will unlock as soon as the recording finishes.
                </p>
              </div>

              {/* Countdown Display */}
              <div className="flex flex-col items-center justify-center space-y-2 py-2">
                <div className="relative flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 flex items-center justify-center">
                    <motion.span
                      key={countdown}
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-4xl font-black font-mono text-cyan-600 dark:text-cyan-400"
                    >
                      {countdown}
                    </motion.span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Audio starting in {countdown}s
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Listening View Content */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.35 }}
        className={`space-y-6 transition-all duration-300 ${
          showCountdownModal ? 'filter blur-md pointer-events-none select-none' : ''
        }`}
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

        {/* Audio Player Component with continuous auto-play after modal */}
        <AudioPlayer
          transcriptText={transcriptText}
          autoPlay={!showCountdownModal}
          onPlaybackComplete={handlePlaybackComplete}
        />

        {/* Status Callout Banner */}
        {!isAudioFinished ? (
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-2.5 text-xs text-cyan-800 dark:text-cyan-300">
            <Lock className="w-4 h-4 shrink-0 animate-pulse text-cyan-600 dark:text-cyan-400" />
            <span>
              <strong>Audio in progress:</strong> Focus on listening. Questions below will automatically unblur and become clickable when the recording ends.
            </span>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>Recording completed:</strong> Please answer all 4 questions based on what you heard.
            </span>
          </motion.div>
        )}

        {/* Questions List (Blurred and non-clickable until audio completes) */}
        <div className="relative pt-2">
          {!isAudioFinished && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-100/40 dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl">
              <div className="glass-panel px-5 py-3 rounded-2xl shadow-lg border border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                <Lock className="w-4 h-4 text-cyan-500" />
                <span>Questions unlock once recording finishes</span>
              </div>
            </div>
          )}

          <div
            className={`space-y-5 transition-all duration-500 ${
              !isAudioFinished
                ? 'filter blur-sm pointer-events-none select-none opacity-60'
                : 'filter-none pointer-events-auto opacity-100'
            }`}
          >
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
                          disabled={!isAudioFinished}
                          onClick={() => handleSelectOption(q.id, optIndex)}
                          className={`w-full text-left p-3.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-3 ${
                            isAudioFinished ? 'cursor-pointer' : 'cursor-not-allowed'
                          } ${
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
        </div>

        {error && (
          <p className="text-xs text-rose-500 font-medium text-center">{error}</p>
        )}

        {/* Primary Submit Button */}
        <div className="pt-2">
          <motion.button
            whileHover={isAudioFinished ? { scale: 1.015 } : {}}
            whileTap={isAudioFinished ? { scale: 0.985 } : {}}
            disabled={!isAudioFinished}
            onClick={handleSubmit}
            className={`w-full py-4 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg transition-all ${
              isAudioFinished
                ? 'bg-gradient-to-r from-cyan-600 via-cyan-500 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 shadow-cyan-600/20 cursor-pointer'
                : 'bg-slate-400 dark:bg-slate-700 opacity-60 cursor-not-allowed'
            }`}
          >
            {isAudioFinished ? (
              <>
                Submit Listening & Continue <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" /> Listening In Progress...
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
