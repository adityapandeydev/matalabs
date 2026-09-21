import React, { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Lock, Sparkles, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthGateViewProps {
  onSuccess: (credential: string) => Promise<void>;
  candidateName: string;
}

export const AuthGateView: React.FC<AuthGateViewProps> = ({ onSuccess, candidateName }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (!response.credential) {
      setAuthError('Google sign-in did not return valid credentials. Please try again.');
      return;
    }
    try {
      setIsLoading(true);
      setAuthError('');
      await onSuccess(response.credential);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setAuthError(msg);
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setAuthError('Google Sign-In was cancelled or failed to initialize.');
    setIsLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35 }}
      className="max-w-lg mx-auto w-full text-center py-6"
    >
      <div className="glass-panel rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Lock / Key Icon */}
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-3">
            <CheckCircle2 className="w-3.5 h-3.5" /> Listening & Reading Completed
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sign in with Google to continue and save your results.
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
            {candidateName ? `${candidateName}, this` : 'This'} unlocks{' '}
            <strong className="text-indigo-600 dark:text-indigo-400">Writing and Speaking</strong>, your full scores, and a short diagnostic note on what to work on next.
          </p>
        </div>

        {/* Feature Checkmarks */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 text-left space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Real multimodal AI essay & speaking evaluation</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Permanent record of your four-part scores</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-500 shrink-0" />
            <span>Secure 1-click authentication — zero passwords needed</span>
          </div>
        </div>

        {/* The Google Sign-In Action */}
        <div className="pt-2 flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="py-3 px-6 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              Securing session with Google...
            </div>
          ) : (
            <div className="w-full flex justify-center transform hover:scale-[1.02] transition-transform">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                shape="pill"
                size="large"
                theme="filled_blue"
                text="continue_with"
                width="280"
              />
            </div>
          )}
        </div>

        {authError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500 font-medium flex items-center justify-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          After signing in, you will land directly on Writing. Unauthenticated visitors cannot access the examiner evaluations.
        </p>
      </div>
    </motion.div>
  );
};
