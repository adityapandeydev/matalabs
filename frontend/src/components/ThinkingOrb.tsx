import React, { useEffect, useRef } from 'react';

export type OrbState = 'working' | 'searching' | 'solving' | 'listening' | 'composing' | 'shaping';
export type OrbSize = 20 | 64 | 96;

interface ThinkingOrbProps {
  state?: OrbState;
  size?: OrbSize;
  className?: string;
  isDark?: boolean;
}

export const ThinkingOrb: React.FC<ThinkingOrbProps> = ({
  state = 'solving',
  size = 64,
  className = '',
  isDark = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    let startTime = performance.now();

    // Particle dot count and radius based on size
    const dotCount = size >= 64 ? 28 : 14;
    const baseRadius = (size / 2) * 0.72;
    const dotSize = size >= 64 ? (size >= 96 ? 2.8 : 2.2) : 1.4;

    const render = (currentTime: number) => {
      const elapsed = (currentTime - startTime) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const centerX = size / 2;
      const centerY = size / 2;

      // Color selection based on theme
      const primaryAlpha = isDark ? 0.95 : 0.85;
      const secondaryAlpha = isDark ? 0.45 : 0.35;
      const dotColor = isDark ? '240, 245, 255' : '15, 23, 42';

      for (let i = 0; i < dotCount; i++) {
        const phi = (i / dotCount) * Math.PI * 2;
        let r = baseRadius;
        let alpha = primaryAlpha;
        let scale = 1;

        switch (state) {
          case 'listening': {
            // Breathing concentric ripples
            const wave = Math.sin(elapsed * 3.5 - (i % 4) * 0.8);
            r = baseRadius * (0.65 + 0.35 * Math.sin(elapsed * 2.5 + phi * 2));
            alpha = 0.3 + 0.7 * Math.max(0, wave);
            scale = 0.8 + 0.4 * Math.sin(elapsed * 4 + phi);
            break;
          }
          case 'searching': {
            // Radar sweeping motion
            const sweepAngle = (elapsed * 2.8) % (Math.PI * 2);
            let diff = Math.abs(phi - sweepAngle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;
            alpha = Math.max(0.15, 1 - diff / 1.6);
            r = baseRadius * (0.8 + 0.2 * Math.cos(phi * 3 + elapsed * 2));
            scale = 1 + (1 - diff / Math.PI) * 0.6;
            break;
          }
          case 'composing': {
            // Spiral synthesis
            const spiralOffset = (elapsed * 2.2 + i * 0.25) % (Math.PI * 2);
            r = baseRadius * (0.4 + 0.6 * (i / dotCount)) + Math.sin(elapsed * 3 + phi) * 3;
            alpha = secondaryAlpha + 0.5 * Math.sin(spiralOffset);
            scale = 0.9 + 0.3 * Math.cos(elapsed * 2 + i);
            break;
          }
          case 'shaping': {
            // Morphing harmonic flower
            const harmonic = Math.sin(elapsed * 2.5 + phi * 3);
            r = baseRadius * (0.75 + 0.25 * harmonic);
            alpha = primaryAlpha * (0.5 + 0.5 * Math.cos(elapsed * 1.8 + phi));
            scale = 1 + 0.25 * harmonic;
            break;
          }
          case 'working': {
            // Steady orbital churn
            const rot = elapsed * 1.8;
            r = baseRadius * (0.85 + 0.15 * Math.sin(phi * 4 + elapsed * 3));
            alpha = 0.4 + 0.6 * Math.abs(Math.sin(phi + rot));
            break;
          }
          case 'solving':
          default: {
            // Converging thought orbs - pulsating constellation
            const pulse = Math.sin(elapsed * 3.2 + (i % 3) * 1.5);
            r = baseRadius * (0.78 + 0.22 * pulse);
            alpha = 0.35 + 0.65 * ((Math.cos(elapsed * 2.4 + phi * 2) + 1) / 2);
            scale = 0.85 + 0.35 * Math.sin(elapsed * 3 + i);
            break;
          }
        }

        const x = centerX + Math.cos(phi + elapsed * 0.6) * r;
        const y = centerY + Math.sin(phi + elapsed * 0.6) * r;

        ctx.beginPath();
        ctx.arc(x, y, dotSize * scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${dotColor}, ${Math.min(1, Math.max(0.05, alpha))})`;
        ctx.fill();
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, size, isDark]);

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block"
      />
    </div>
  );
};
