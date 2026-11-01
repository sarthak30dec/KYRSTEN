import React, { useEffect, useRef } from 'react';
import { KyrstenState, AudioVisualizerConfig } from '../types';
import { neuralVoicePlayer } from '../utils/neuralVoicePlayer';

interface AudioOrbVisualizerProps {
  state: KyrstenState;
  getFrequencyData?: () => Uint8Array;
  getAverageVolume?: () => number;
  config: AudioVisualizerConfig;
  onCoreClick?: () => void;
  isMicActive: boolean;
  isGameMode?: boolean;
}

export const AudioOrbVisualizer: React.FC<AudioOrbVisualizerProps> = ({
  state,
  getFrequencyData,
  getAverageVolume,
  config,
  onCoreClick,
  isMicActive,
  isGameMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameId = useRef<number>(0);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = Math.max(80, canvas.parentElement?.clientWidth || 320);
    let height = Math.max(80, canvas.parentElement?.clientHeight || 320);
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      if (!canvas.parentElement) return;
      const nw = Math.max(80, canvas.parentElement.clientWidth || 320);
      const nh = Math.max(80, canvas.parentElement.clientHeight || 320);
      width = canvas.width = nw;
      height = canvas.height = nh;
    };

    window.addEventListener('resize', handleResize);

    // Floating starlight particles around the core
    const particleCount = isGameMode ? 16 : 42;
    const particles = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * 260,
      y: (Math.random() - 0.5) * 260,
      radius: Math.random() * 1.5 + 0.6,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.015 + 0.005,
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * 50 + 80,
    }));

    const render = () => {
      try {
        timeRef.current += 0.02;
        const t = timeRef.current;

        const safeW = Math.max(80, width);
        const safeH = Math.max(80, height);

        ctx.clearRect(0, 0, safeW, safeH);

        const centerX = safeW / 2;
        const centerY = safeH / 2;

        // Calculate audio reactivity
        let volume = 0;
        const isSpeaking = state === 'speaking';
        const isListening = state === 'listening' || isMicActive;
        const isThinking = state === 'processing';

        if (isSpeaking) {
          const outAnalyser = neuralVoicePlayer.getOutputAnalyser?.();
          if (outAnalyser) {
            try {
              const freqData = new Uint8Array(outAnalyser.frequencyBinCount);
              outAnalyser.getByteFrequencyData(freqData);
              let sum = 0;
              for (let i = 0; i < freqData.length; i++) sum += freqData[i];
              volume = (sum / freqData.length) / 255;
            } catch {}
          }
        } else if (getAverageVolume) {
          try {
            volume = getAverageVolume() || 0;
          } catch {
            volume = 0;
          }
        }

        const audioBoost = Math.min(volume * 0.35, 25);
        const pulse = Math.sin(t * 2) * (isSpeaking ? 7 : isListening ? 4 : 2);
        const baseRadius = Math.max(16, Math.min(safeW, safeH) * 0.28 + pulse + audioBoost);

      // 1. Ambient Outer Halo Glow
      const glowGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.5,
        centerX,
        centerY,
        baseRadius * 1.8
      );
      glowGrad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
      glowGrad.addColorStop(0.5, 'rgba(14, 165, 233, 0.2)');
      glowGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // 2. Floating Starlight Particles
      particles.forEach((p) => {
        p.angle += p.speed;
        const px = centerX + Math.cos(p.angle) * (p.dist + pulse * 2);
        const py = centerY + Math.sin(p.angle) * (p.dist + pulse * 2);
        const pAlpha = (Math.sin(t * 3 + p.angle) * 0.3 + 0.7) * p.alpha;

        ctx.fillStyle = `rgba(186, 230, 253, ${pAlpha})`;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // 3. Liquid Base Sphere (Deep Rich Royal Cyan & Azure Gradient)
      const liquidGrad = ctx.createRadialGradient(
        centerX - baseRadius * 0.3,
        centerY - baseRadius * 0.35,
        baseRadius * 0.1,
        centerX,
        centerY,
        baseRadius
      );
      liquidGrad.addColorStop(0, '#7dd3fc');
      liquidGrad.addColorStop(0.25, '#38bdf8');
      liquidGrad.addColorStop(0.55, '#0284c7');
      liquidGrad.addColorStop(0.85, '#0369a1');
      liquidGrad.addColorStop(1, '#082f49');

      ctx.save();
      ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
      ctx.shadowBlur = 28 * (config.glowIntensity || 1);

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = liquidGrad;
      ctx.fill();
      ctx.restore();

      // 4. Internal Liquid Organic Swirl Waves
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius - 2, 0, Math.PI * 2);
      ctx.clip();

      // Swirling internal fluid blob 1
      const swirl1X = centerX + Math.cos(t * 1.5) * (baseRadius * 0.18);
      const swirl1Y = centerY + Math.sin(t * 1.2) * (baseRadius * 0.18);
      const fluidGrad1 = ctx.createRadialGradient(
        swirl1X,
        swirl1Y,
        baseRadius * 0.05,
        swirl1X,
        swirl1Y,
        baseRadius * 0.65
      );
      fluidGrad1.addColorStop(0, 'rgba(224, 242, 254, 0.75)');
      fluidGrad1.addColorStop(0.4, 'rgba(56, 189, 248, 0.45)');
      fluidGrad1.addColorStop(1, 'rgba(3, 105, 161, 0)');

      ctx.fillStyle = fluidGrad1;
      ctx.beginPath();
      ctx.arc(swirl1X, swirl1Y, baseRadius * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // Swirling internal fluid blob 2
      const swirl2X = centerX + Math.sin(-t * 1.8) * (baseRadius * 0.22);
      const swirl2Y = centerY + Math.cos(-t * 1.4) * (baseRadius * 0.22);
      const fluidGrad2 = ctx.createRadialGradient(
        swirl2X,
        swirl2Y,
        baseRadius * 0.05,
        swirl2X,
        swirl2Y,
        baseRadius * 0.55
      );
      fluidGrad2.addColorStop(0, 'rgba(125, 211, 252, 0.6)');
      fluidGrad2.addColorStop(0.6, 'rgba(2, 132, 199, 0.3)');
      fluidGrad2.addColorStop(1, 'rgba(12, 74, 110, 0)');

      ctx.fillStyle = fluidGrad2;
      ctx.beginPath();
      ctx.arc(swirl2X, swirl2Y, baseRadius * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // Specular Glass Arc Highlight (Upper Left)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(
        centerX - baseRadius * 0.35,
        centerY - baseRadius * 0.38,
        baseRadius * 0.45,
        baseRadius * 0.22,
        -Math.PI / 4,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Secondary Soft Reflection (Bottom Right)
      ctx.fillStyle = 'rgba(186, 230, 253, 0.15)';
      ctx.beginPath();
      ctx.ellipse(
        centerX + baseRadius * 0.3,
        centerY + baseRadius * 0.35,
        baseRadius * 0.38,
        baseRadius * 0.16,
        -Math.PI / 4,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.restore();

      // 5. Outer Glass Rim
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.stroke();
    } catch {
      // Safe fallback if canvas geometry temporarily invalid
    }

    animFrameId.current = requestAnimationFrame(render);
  };

    render();

    return () => {
      cancelAnimationFrame(animFrameId.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [state, getFrequencyData, getAverageVolume, config, isGameMode, isMicActive]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full aspect-square max-w-[340px] mx-auto select-none">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer relative z-10 transition-transform duration-300 hover:scale-[1.02] active:scale-95"
        onClick={onCoreClick}
        title="Kyrsten Neural Core (Click to toggle microphone)"
      />
    </div>
  );
};
