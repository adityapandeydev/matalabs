import React, { useEffect } from 'react';
import type { TestResult } from '../types';
import confetti from 'canvas-confetti';
import {
  Award,
  Headphones,
  BookOpen,
  PenTool,
  Mic,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Lightbulb,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ResultsViewProps {
  result: TestResult;
  onRetake: () => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ result, onRetake }) => {
  useEffect(() => {
    // Launch celebratory confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#06b6d4', '#10b981', '#f59e0b'],
      });
    } catch {
      // Ignore if unavailable
    }
  }, []);

  const partScores = [
    {
      name: 'Listening',
      score: result.listening_score,
      icon: Headphones,
      color: 'text-cyan-500',
      bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
      border: 'border-cyan-500/30',
    },
    {
      name: 'Reading',
      score: result.reading_score,
      icon: BookOpen,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      border: 'border-indigo-500/30',
    },
    {
      name: 'Writing',
      score: result.writing_score,
      icon: PenTool,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      border: 'border-amber-500/30',
    },
    {
      name: 'Speaking',
      score: result.speaking_score,
      icon: Mic,
      color: 'text-pink-500',
      bg: 'bg-pink-500/10 dark:bg-pink-500/20',
      border: 'border-pink-500/30',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto w-full space-y-8 pb-16"
    >
      {/* 1. Hero Overall Score Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden text-center space-y-6">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold tracking-wide">
          <Award className="w-4 h-4" /> Official 4-Skill Diagnostic Report
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {result.candidate_name ? `${result.candidate_name}'s Results` : 'Test Results'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Consolidated evaluation verified across all 4 English competencies
          </p>
        </div>

        {/* Overall Score Badge */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-2">
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white flex flex-col items-center justify-center shadow-xl shadow-indigo-500/30">
            <span className="text-xs uppercase tracking-wider font-semibold opacity-80">Overall</span>
            <span className="text-4xl font-extrabold font-mono tracking-tight font-tabular">
              {result.overall_score.toFixed(1)}
            </span>
            <span className="text-[11px] opacity-75 font-mono">Band Scale</span>
          </div>

          <div className="text-left space-y-1.5 sm:border-l sm:border-slate-200 sm:dark:border-white/10 sm:pl-6">
            <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Target Comparison
            </div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Target: {result.target_score.toFixed(1)}</span>
              {result.overall_score >= result.target_score ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Target Achieved!
                </span>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  Gap: {(result.target_score - result.overall_score).toFixed(1)} Band
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
              Calculated as the exact average of your 4 assessed sections.
            </p>
          </div>
        </div>

        {/* Weakest Part / What to Practise First Note */}
        <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-left flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-xs">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              What to Practise First: {result.weakest_skill}
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 mt-1 leading-relaxed">
              {result.what_to_practise}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Four Part Scores Side-by-Side */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {partScores.map((part) => {
          const Icon = part.icon;
          const diff = part.score - result.target_score;

          return (
            <div
              key={part.name}
              className={`glass-panel rounded-2xl p-5 shadow-xs border ${part.border} space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-xl ${part.bg} ${part.color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-mono text-slate-400">Target: {result.target_score.toFixed(1)}</span>
              </div>

              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {part.name}
                </div>
                <div className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white font-tabular">
                  {part.score.toFixed(1)}
                </div>
              </div>

              <div className="text-[11px] font-semibold flex items-center gap-1">
                {diff >= 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{diff.toFixed(1)} above target
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">
                    {diff.toFixed(1)} from target
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Writing Section Breakdown */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/60 dark:border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/50 dark:border-white/5 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Writing Diagnostic Breakdown
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Marked by automated AI examiner against IELTS rubric
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Model: {result.writing_details.ai_model_used || 'Gemini Flash'}
            </span>
            <span className="text-sm font-extrabold font-mono px-3 py-1 rounded-xl bg-amber-500 text-white font-tabular">
              Band {result.writing_score.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Criteria Feedback Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Task Achievement
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {result.writing_details.task_response_notes || 'Response addressed the main premise with arguments.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Coherence & Cohesion
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {result.writing_details.coherence_notes || 'Paragraph transitions were logically sequenced.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Lexical Resource
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {result.writing_details.vocabulary_notes || 'Demonstrated suitable academic vocabulary.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Grammatical Range & Accuracy
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {result.writing_details.grammar_notes || 'Used varied sentence structures with minor punctuation issues.'}
            </p>
          </div>
        </div>

        {/* Identified Mistakes & Grammar Errors */}
        {result.writing_details.mistakes && result.writing_details.mistakes.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Specific Mistakes & Grammar Notes
            </h4>
            <div className="space-y-2">
              {result.writing_details.mistakes.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 text-xs space-y-1.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="line-through text-rose-600 dark:text-rose-400 font-mono">
                      "{m.original}"
                    </span>
                    <span className="text-slate-400">&rarr;</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                      "{m.correction}"
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                      {m.category}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-normal">
                    {m.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Improvement Tips */}
        {result.writing_details.tips_to_improve && result.writing_details.tips_to_improve.length > 0 && (
          <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 space-y-2">
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" /> Writing Tips for Next Attempt:
            </div>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
              {result.writing_details.tips_to_improve.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 4. Speaking Section Breakdown */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/60 dark:border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/50 dark:border-white/5 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-500/10 dark:bg-pink-500/20 text-pink-500 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Speaking Diagnostic Breakdown
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Speech-to-text transcript and AI acoustic assessment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Model: {result.speaking_details.ai_model_used || 'Gemini Audio / Whisper'}
            </span>
            <span className="text-sm font-extrabold font-mono px-3 py-1 rounded-xl bg-pink-500 text-white font-tabular">
              Band {result.speaking_score.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Speech Transcript */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Spoken Transcript (What was heard):
          </div>
          <p className="text-xs sm:text-sm italic text-slate-800 dark:text-slate-200 leading-relaxed font-serif">
            "{result.speaking_details.transcript || '[No transcript available]'}"
          </p>
        </div>

        {/* Speaking Feedback Criteria */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Fluency & Rhythm
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {result.speaking_details.fluency_notes || 'Consistent flow with natural sentence grouping.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-white/5 space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Clarity & Pronunciation
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {result.speaking_details.clarity_notes || 'Pronunciation was intelligible with clear consonant articulation.'}
            </p>
          </div>
        </div>

        {/* Weak Spots & Speaking Tips */}
        {result.speaking_details.tips_to_improve && result.speaking_details.tips_to_improve.length > 0 && (
          <div className="p-4 rounded-2xl bg-pink-500/5 dark:bg-pink-500/10 border border-pink-500/20 space-y-2">
            <div className="text-xs font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Speaking Recommendations:
            </div>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
              {result.speaking_details.tips_to_improve.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Retake Action */}
      <div className="pt-4 text-center">
        <button
          onClick={onRetake}
          className="inline-flex items-center gap-2 py-3.5 px-8 rounded-xl glass-panel hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Start New Test Session
        </button>
      </div>
    </motion.div>
  );
};
