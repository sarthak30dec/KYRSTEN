import React, { useEffect, useRef } from 'react';

interface MatrixScreensaverProps {
  isActive: boolean;
  onClose: () => void;
  idleDurationMs?: number;
}

export const MatrixScreensaver: React.FC<MatrixScreensaverProps> = ({
  isActive,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Keyboard wake listener to exit screensaver
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = () => {
      onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, onClose]);

  // Canvas Matrix 0/1 Rain Rendering
  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const fontSize = 18;
    const columns = Math.ceil(width / fontSize);
    const rows = Math.ceil(height / fontSize);

    // Track dropping y positions for all matrix columns
    const drops: number[] = [];
    const dropSpeeds: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * -rows);
      dropSpeeds[i] = 0.6 + Math.random() * 0.9;
    }

    const render = () => {
      // Trail fade effect (creates cascading matrix ghost trail)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `bold ${fontSize}px "JetBrains Mono", "Fira Code", monospace`;

      // Streaming Matrix Rain (strictly 0 and 1) across the screen
      for (let i = 0; i < columns; i++) {
        const x = i * fontSize;
        const currentDropRow = Math.floor(drops[i]);
        const y = currentDropRow * fontSize;

        // Binary digit: strictly '0' or '1'
        const char = Math.random() > 0.5 ? '1' : '0';

        // Draw the lead head character (Phosphor White / High Brightness Green)
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#22c55e';
        ctx.shadowBlur = 10;
        ctx.fillText(char, x, y);

        // Draw body trail character
        const trailChar = Math.random() > 0.5 ? '1' : '0';
        ctx.fillStyle = Math.random() > 0.85 ? '#86efac' : '#22c55e';
        ctx.shadowColor = '#15803d';
        ctx.shadowBlur = 3;
        ctx.fillText(trailChar, x, y - fontSize);

        ctx.shadowBlur = 0;

        // Advance drop position
        drops[i] += dropSpeeds[i];

        // Reset drop when hitting bottom or randomly after exiting view
        if (drops[i] * fontSize > height && Math.random() > 0.96) {
          drops[i] = 0;
          dropSpeeds[i] = 0.6 + Math.random() * 0.9;
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div
      id="kyrsten-matrix-screensaver"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black select-none cursor-default overflow-hidden animate-fadeIn"
      title="Click anywhere or press any key to exit screensaver"
    >
      {/* Pure Fullscreen Canvas Background for Matrix 0/1 Falling Code */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
    </div>
  );
};
