import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, RotateCcw, Volume2, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface AudioPlayerProps {
  audioUrl?: string;
  transcriptText: string;
}

interface DialogueTurn {
  speaker: 'Receptionist' | 'Student';
  text: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ transcriptText }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSpeaker, setCurrentSpeaker] = useState<'Receptionist' | 'Student' | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const isPlayingRef = useRef(false);
  const currentTurnIndexRef = useRef(0);
  const totalDuration = 42; // simulated seconds for waveform timer

  // Parse conversation turns from dialogue
  const dialogueTurns: DialogueTurn[] = useMemo(() => {
    return transcriptText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        if (line.toLowerCase().startsWith('receptionist:')) {
          return {
            speaker: 'Receptionist',
            text: line.replace(/^receptionist:\s*/i, '').trim(),
          };
        }
        return {
          speaker: 'Student',
          text: line.replace(/^student:\s*/i, '').trim(),
        };
      });
  }, [transcriptText]);

  // Load available system voices
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Choose distinct voices for Receptionist vs Student
  const { receptionistVoice, studentVoice } = useMemo(() => {
    const enVoices = voices.filter((v) => v.lang.startsWith('en'));
    const pool = enVoices.length > 0 ? enVoices : voices;

    // Search for female / male profiles in voice names
    const femaleVoice = pool.find((v) =>
      /female|zira|samantha|victoria|karen|jenny|moira|fiona/i.test(v.name)
    );
    const maleVoice = pool.find((v) =>
      /male|david|george|daniel|guy|oliver|rishi|alex/i.test(v.name) && v !== femaleVoice
    );

    return {
      receptionistVoice: femaleVoice || pool[0] || null,
      studentVoice: maleVoice || (pool.length > 1 ? pool[1] : pool[0]) || null,
    };
  }, [voices]);

  const playTurn = (index: number) => {
    if (!isPlayingRef.current) return;

    if (index >= dialogueTurns.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setProgress(100);
      setCurrentSpeaker(null);
      currentTurnIndexRef.current = 0;
      return;
    }

    currentTurnIndexRef.current = index;
    const turn = dialogueTurns[index];
    setCurrentSpeaker(turn.speaker);
    setProgress(Math.round((index / dialogueTurns.length) * 100));

    if (!('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(turn.text);

    if (turn.speaker === 'Receptionist') {
      if (receptionistVoice) utterance.voice = receptionistVoice;
      utterance.pitch = 1.18; // distinctly higher natural pitch
      utterance.rate = 0.95;
    } else {
      if (studentVoice) utterance.voice = studentVoice;
      utterance.pitch = 0.86; // distinctly deeper natural pitch
      utterance.rate = 1.02;
    }

    utterance.onend = () => {
      if (isPlayingRef.current) {
        // Short natural breathing pause between turns (350ms)
        setTimeout(() => {
          if (isPlayingRef.current) {
            playTurn(index + 1);
          }
        }, 350);
      }
    };

    utterance.onerror = (e) => {
      console.warn('Speech utterance ended/errored:', e);
      if (isPlayingRef.current) {
        playTurn(index + 1);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  const handlePlayToggle = () => {
    if (isPlaying) {
      // Pause
      isPlayingRef.current = false;
      setIsPlaying(false);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else {
      // Play
      isPlayingRef.current = true;
      setIsPlaying(true);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      playTurn(currentTurnIndexRef.current);
    }
  };

  const handleRestart = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    currentTurnIndexRef.current = 0;
    setProgress(0);
    setCurrentSpeaker(null);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const currentSeconds = Math.floor((progress / 100) * totalDuration);
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-white/10 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Audio Recording: University Study Suites
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Listen carefully to the two speakers (Receptionist & Student) to answer the questions below.
            </p>
          </div>
        </div>

        {/* Current Speaker Indicator Badge */}
        {currentSpeaker && isPlaying && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold animate-pulse transition-colors ${
              currentSpeaker === 'Receptionist'
                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Speaking: {currentSpeaker}</span>
          </div>
        )}
      </div>

      {/* Waveform & Playback Controls */}
      <div className="flex items-center gap-4 pt-1">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={handlePlayToggle}
          className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 cursor-pointer transition-colors shrink-0"
          aria-label={isPlaying ? 'Pause dialogue' : 'Play dialogue'}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </motion.button>

        <button
          onClick={handleRestart}
          title="Restart Audio"
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Dynamic Simulated Waveform Bars */}
        <div className="flex-1 flex items-center gap-1 h-8 px-2 overflow-hidden">
          {Array.from({ length: 32 }).map((_, i) => {
            const barProgress = (i / 32) * 100;
            const isPassed = barProgress <= progress;
            const activeHeight = isPlaying
              ? Math.sin(i * 0.7 + progress * 0.2) * 14 + 16
              : 8 + (i % 5) * 3;

            return (
              <motion.div
                key={i}
                animate={{ height: activeHeight }}
                transition={{ duration: 0.15 }}
                className={`w-1 rounded-full transition-colors ${
                  isPassed
                    ? currentSpeaker === 'Receptionist'
                      ? 'bg-cyan-500 dark:bg-cyan-400'
                      : 'bg-indigo-500 dark:bg-indigo-400'
                    : 'bg-slate-200 dark:bg-slate-700/60'
                }`}
              />
            );
          })}
        </div>

        <div className="text-xs font-mono text-slate-500 dark:text-slate-400 font-tabular shrink-0">
          {formatTime(currentSeconds)} / {formatTime(totalDuration)}
        </div>
      </div>
    </div>
  );
};
