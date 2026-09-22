import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioPreviewPlayerProps {
  src: string;
  label?: string;
  initialDuration?: number;
  onRetake?: () => void;
}

export const AudioPreviewPlayer: React.FC<AudioPreviewPlayerProps> = ({
  src,
  label,
  initialDuration = 5,
  onRetake,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);

  // Synchronize duration if audio metadata loads a finite value
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
      setDuration(Math.round(audio.duration));
    }
  }, []);

  // Use 60fps requestAnimationFrame loop for ultra-smooth progress bar movement
  useEffect(() => {
    let animFrame: number;

    const tick = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused && !audio.ended) {
        setCurrentTime(audio.currentTime);

        // Update duration if it becomes finite
        if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }

        animFrame = requestAnimationFrame(tick);
      }
    };

    if (isPlaying) {
      animFrame = requestAnimationFrame(tick);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [isPlaying]);

  // Audio lifecycle listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const onTimeUpdate = () => {
      if (!isPlaying) {
        setCurrentTime(audio.currentTime);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [src, isPlaying, handleLoadedMetadata]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // If at end or near end, restart from beginning
      if (audio.ended || (duration > 0 && audio.currentTime >= duration - 0.2)) {
        audio.currentTime = 0;
        setCurrentTime(0);
      }
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(console.error);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const effectiveDuration = duration > 0 ? duration : initialDuration;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * effectiveDuration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const effectiveDuration = duration > 0 ? duration : initialDuration;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100));

  return (
    <div className="p-4 rounded-2xl bg-white/90 dark:bg-slate-800/90 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-2.5">
      <audio ref={audioRef} src={src} preload="auto" />

      {label && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 px-0.5">
          <span className="flex items-center gap-1.5 truncate">
            <Volume2 className="w-3.5 h-3.5 text-pink-500 shrink-0" />
            <span className="truncate">{label}</span>
          </span>
          {onRetake && (
            <button
              onClick={onRetake}
              className="text-[11px] text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 flex items-center gap-1 cursor-pointer font-medium shrink-0 ml-2"
            >
              <RotateCcw className="w-3 h-3" /> Re-record
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-0.5">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={togglePlay}
          className="w-10 h-10 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white flex items-center justify-center shadow-md shadow-pink-600/25 shrink-0 cursor-pointer transition-all"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </motion.button>

        <div className="flex-1 space-y-1.5 min-w-0">
          {/* Interactive Seek Bar */}
          <div
            onClick={handleSeek}
            className="h-2.5 w-full bg-slate-200/90 dark:bg-slate-700/80 rounded-full cursor-pointer overflow-hidden relative shadow-inner"
          >
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full relative"
              style={{
                width: `${progressPercent}%`,
                transition: isPlaying ? 'none' : 'width 0.15s ease-out',
              }}
            >
              {progressPercent > 2 && progressPercent < 98 && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-sm" />
              )}
            </div>
          </div>

          {/* Time Labels */}
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 font-tabular px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(effectiveDuration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
