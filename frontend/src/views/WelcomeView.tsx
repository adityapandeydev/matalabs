import React, { useState } from 'react';
import { Target, ArrowRight, Sparkles, Headphones, BookOpen, PenTool, Mic, ShieldCheck, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface WelcomeViewProps {
  initialTargetScore?: number;
  onStart: (targetScore: number) => void;
}

const BAND_DESCRIPTIONS: Record<number, string> = {
  5.0: 'Modest User – Partial command of language, coping with overall meaning.',
  5.5: 'Modest-Competent – Basic operational command with occasional inaccuracies.',
  6.0: 'Competent User – Generally effective language use with some inaccuracies.',
  6.5: 'Competent-Good – Solid grasp of complex language with minor errors.',
  7.0: 'Good User – Operational command with occasional inaccuracies and misunderstandings.',
  7.5: 'Good-Very Good – Highly proficient, recommended for competitive graduate programs.',
  8.0: 'Very Good User – Fully operational command with only occasional unsystematic inaccuracies.',
  8.5: 'Near Native – Expert-level precision, nuance, and fluency in all contexts.',
  9.0: 'Expert User – Complete operational mastery of English.',
};

const SECTIONS = [
  {
    icon: Headphones,
    color: 'text-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/20 border-cyan-500/20',
    title: 'Part 1: Listening',
    desc: 'Audio dialogue with 4 comprehension questions',
    time: '~2 mins',
  },
  {
    icon: BookOpen,
    color: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/20',
    title: 'Part 2: Reading',
    desc: 'Academic passage with 4 analytical questions',
    time: '~2 mins',
  },
  {
    icon: PenTool,
    color: 'text-violet-500 bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/20',
    title: 'Part 3: Writing',
    desc: 'Opinion prompt scored across 4 official IELTS criteria',
    time: '~3 mins',
  },
  {
    icon: Mic,
    color: 'text-amber-500 bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/20',
    title: 'Part 4: Speaking',
    desc: 'Two spoken prompts recorded & transcribed with Whisper',
    time: '~2 mins',
  },
];

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  initialTargetScore = 7.5,
  onStart,
}) => {
  const [targetScore, setTargetScore] = useState<number>(initialTargetScore);

  const targetOptions = [5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];

  const handleBegin = () => {
    onStart(targetScore);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="max-w-2xl mx-auto w-full space-y-6"
    >
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel text-xs font-semibold text-indigo-600 dark:text-indigo-400 shadow-xs border border-indigo-500/20">
          <Sparkles className="w-3.5 h-3.5" /> 4-Skill English Diagnostic Test
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Assess Your True IELTS Band Score
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
          Complete a quick diagnostic across Listening, Reading, Writing, and Speaking with automated AI feedback calibrated to IELTS criteria.
        </p>
      </div>

      {/* Target Band Selector Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-200/60 dark:border-white/10 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Select Your Target Band Score
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your diagnostic result will compare your performance against this target.
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {targetScore.toFixed(1)}
            </span>
            <span className="text-xs text-slate-400 font-medium ml-1">/ 9.0</span>
          </div>
        </div>

        {/* Score Buttons Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
          {targetOptions.map((score) => {
            const isSelected = targetScore === score;
            return (
              <button
                key={score}
                type="button"
                onClick={() => setTargetScore(score)}
                className={`py-2.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-500'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span>{score.toFixed(1)}</span>
              </button>
            );
          })}
        </div>

        {/* Score description callout */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-200/60 dark:border-white/5 flex items-start gap-2.5">
          <CheckCircle className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <span className="font-semibold text-slate-900 dark:text-white">Band {targetScore.toFixed(1)} Goal: </span>
            {BAND_DESCRIPTIONS[targetScore] || 'Custom band score target.'}
          </p>
        </div>
      </div>

      {/* 4-Skill Section Previews */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          return (
            <div
              key={sec.title}
              className="glass-panel rounded-2xl p-4 border border-slate-200/60 dark:border-white/5 flex items-start gap-3 shadow-xs"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${sec.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {sec.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {sec.time}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {sec.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Start Action */}
      <div className="space-y-3 pt-2">
        <motion.button
          whileHover={{ scale: 1.012 }}
          whileTap={{ scale: 0.988 }}
          onClick={handleBegin}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer transition-all"
        >
          Start Diagnostic Test <ArrowRight className="w-4 h-4" />
        </motion.button>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>No account required for Listening & Reading. Google sign-in requested before Writing.</span>
        </div>
      </div>
    </motion.div>
  );
};
