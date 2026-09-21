import React, { useState } from 'react';
import { Target, ArrowRight, Sparkles, User, Mail, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface WelcomeViewProps {
  onStart: (data: { name: string; contact: string; targetScore: number }) => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onStart }) => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [targetScore, setTargetScore] = useState<number>(7.0);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name to proceed.');
      return;
    }
    if (!contact.trim()) {
      setError('Please provide your email or phone number.');
      return;
    }
    setError('');
    onStart({ name: name.trim(), contact: contact.trim(), targetScore });
  };

  const targetOptions = [6.0, 6.5, 7.0, 7.5, 8.0, 8.5];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35 }}
      className="max-w-xl mx-auto w-full"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-panel text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-4 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" /> 4-Skill English Proficiency Test
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Assess Your True Band Score
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
          A short diagnostic covering Listening, Reading, Writing, and Speaking with real multimodal AI evaluation.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl space-y-6"
      >
        {/* Full Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="e.g. Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>

        {/* Email or Phone */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Email or Phone Number
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="e.g. alex@example.com or +1 555-0199"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>
        </div>

        {/* Target Score Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-500" /> Target IELTS Band Score
            </label>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              Target: {targetScore.toFixed(1)}
            </span>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {targetOptions.map((score) => (
              <button
                key={score}
                type="button"
                onClick={() => setTargetScore(score)}
                className={`py-2.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                  targetScore === score
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 ring-2 ring-indigo-500/50'
                    : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {score.toFixed(1)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-500 font-medium text-center">{error}</p>
        )}

        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          type="submit"
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer transition-all"
        >
          Begin Listening Test <ArrowRight className="w-4 h-4" />
        </motion.button>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>No account required for Listening & Reading. Takes ~5 minutes.</span>
        </div>
      </form>
    </motion.div>
  );
};
