import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioPreviewPlayerProps {
  src: string;
  label?: string;
  onRetake?: () => void;
}

export const AudioPreviewPlayer: React.FC<AudioPreviewPlayerProps> = ({
  src,
  label,
  onRetake,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-2">
      <audio ref={audioRef} src={src} preload="metadata" />

      {label && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 px-1">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-pink-500" />
            {label}
          </span>
          {onRetake && (
            <button
              onClick={onRetake}
              className="text-[11px] text-pink-600 dark:text-pink-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <RotateCcw className="w-3 h-3" /> Re-record
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={togglePlay}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white flex items-center justify-center shadow-md shadow-pink-600/20 shrink-0 cursor-pointer transition-all"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </motion.button>

        <div className="flex-1 space-y-1">
          {/* Seek Bar */}
          <div
            onClick={handleSeek}
            className="h-2.5 w-full bg-slate-100 dark:bg-slate-700/60 rounded-full cursor-pointer overflow-hidden relative"
          >
            <motion.div
              className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Time Labels */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 dark:text-slate-500 font-tabular px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
