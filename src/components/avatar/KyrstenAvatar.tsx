import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AvatarRenderer } from './AvatarRenderer';
import { AvatarStateManager } from './AvatarState';
import { LipSyncEngine } from './LipSyncEngine';
import { AvatarConfig, AvatarInternalState, AvatarEmotion } from './types';
import { KyrstenState } from '../../types';
import { neuralVoicePlayer } from '../../utils/neuralVoicePlayer';
import { atlasFrameManager } from './AtlasFrameManager';
import { Sparkles, Eye, Volume2, ShieldCheck, Zap, Upload, CheckCircle2 } from 'lucide-react';

interface KyrstenAvatarProps {
  kyrstenState: KyrstenState | 'thinking';
  isAudioPlaying?: boolean;
  onToggleAvatar?: () => void;
  isAvatarEnabled: boolean;
  colorTheme?: 'cyan_pulse' | 'emerald_matrix' | 'amber_plasma' | 'electric_violet' | 'quantum_fusion';
  className?: string;
}

export const KyrstenAvatar: React.FC<KyrstenAvatarProps> = ({
  kyrstenState,
  isAudioPlaying = false,
  onToggleAvatar,
  isAvatarEnabled,
  colorTheme = 'cyan_pulse',
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const rendererRef = useRef<AvatarRenderer | null>(null);
  const stateManagerRef = useRef<AvatarStateManager>(new AvatarStateManager());
  const lipSyncEngineRef = useRef<LipSyncEngine>(new LipSyncEngine());
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const configRef = useRef<AvatarConfig>({
    colorTheme,
    hologramGlow: true,
    reducedMotion: false,
    showTelemetry: false,
  });

  // Atlas synchronization state
  const [isAtlasLoaded, setIsAtlasLoaded] = useState<boolean>(atlasFrameManager.getIsLoaded());
  const [isAtlasLoading, setIsAtlasLoading] = useState<boolean>(atlasFrameManager.getIsLoading());
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  useEffect(() => {
    return atlasFrameManager.subscribe(() => {
      setIsAtlasLoaded(atlasFrameManager.getIsLoaded());
      setIsAtlasLoading(atlasFrameManager.getIsLoading());
    });
  }, []);

  // Update configRef whenever colorTheme changes
  useEffect(() => {
    configRef.current = {
      ...configRef.current,
      colorTheme,
    };
  }, [colorTheme]);

  // Handle Drag & Drop of Atlas Image
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        await atlasFrameManager.loadFromFile(file);
      }
    }
  }, []);

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await atlasFrameManager.loadFromFile(file);
    }
  }, []);

  // Map external kyrstenState to AvatarInternalState
  const getAvatarInternalState = useCallback((): AvatarInternalState => {
    if (kyrstenState === 'speaking' || isAudioPlaying) return 'SPEAKING';
    if (kyrstenState === 'processing' || kyrstenState === 'executing_tool' || kyrstenState === 'biometric_verifying') return 'THINKING';
    if (kyrstenState === 'error' || kyrstenState === 'biometric_rejected') return 'ERROR';
    return 'IDLE';
  }, [kyrstenState, isAudioPlaying]);

  // Sync state and subtle emotions with stateManager
  useEffect(() => {
    const internalState = getAvatarInternalState();
    stateManagerRef.current.setState(internalState);

    // Contextual emotion adjustments
    if (internalState === 'SPEAKING') {
      const activeVoiceEmotion = neuralVoicePlayer.getCurrentEmotion?.();
      stateManagerRef.current.setEmotion(activeVoiceEmotion || 'warm');
    } else if (internalState === 'THINKING') {
      stateManagerRef.current.setEmotion('thinking');
    } else {
      stateManagerRef.current.setEmotion('neutral');
    }
  }, [kyrstenState, isAudioPlaying, getAvatarInternalState]);

  // Keep visemes and analyser connected with neuralVoicePlayer
  useEffect(() => {
    const checkAudioSources = () => {
      const analyser = neuralVoicePlayer.getOutputAnalyser?.();
      if (analyser) {
        lipSyncEngineRef.current.setAnalyser(analyser);
      }
      const visemes = neuralVoicePlayer.getCurrentVisemes?.();
      if (visemes && visemes.length > 0) {
        lipSyncEngineRef.current.setTimeline(visemes);
      }
    };

    const intervalId = setInterval(checkAudioSources, 250);
    checkAudioSources();
    return () => clearInterval(intervalId);
  }, []);

  // Main 60fps animation loop
  useEffect(() => {
    if (!isAvatarEnabled) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    if (!rendererRef.current) {
      rendererRef.current = new AvatarRenderer(ctx);
    }

    // Resize canvas based on container with rAF debouncing
    let resizeRafId: number | null = null;
    const updateCanvasSize = () => {
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        if (containerRef.current && rendererRef.current) {
          const { clientWidth, clientHeight } = containerRef.current;
          const w = Math.max(100, clientWidth || 380);
          const h = Math.max(100, clientHeight || 420);
          rendererRef.current.resize(w, h);
        }
      });
    };

    updateCanvasSize();
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const loop = (time: number) => {
      try {
        const deltaMs = Math.min(64, time - lastTimeRef.current);
        const deltaSec = deltaMs / 1000;
        lastTimeRef.current = time;

        // Audio state
        const isSpeaking = kyrstenState === 'speaking' || isAudioPlaying || neuralVoicePlayer.isPlaying?.();
        const playbackClock = neuralVoicePlayer.getPlaybackClock?.() ?? 0;

        // Update LipSyncEngine with shared audio clock
        const { mouth, emphasis, activeViseme } = lipSyncEngineRef.current.update(playbackClock, isSpeaking);

        // Update kinematics, blinking, saccades, and posture
        const currentPose = stateManagerRef.current.update(time, deltaSec, mouth, emphasis);

        // Render Avatar frame with active viseme phoneme
        if (rendererRef.current) {
          rendererRef.current.render(
            currentPose,
            configRef.current,
            stateManagerRef.current.getState(),
            emphasis,
            activeViseme
          );
        }
      } catch (loopErr) {
        // Suppress frame glitches gracefully
      }

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      resizeObserver.disconnect();
    };
  }, [isAvatarEnabled, kyrstenState, isAudioPlaying]);

  const internalState = getAvatarInternalState();

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden ${className} ${
        isDraggingOver ? 'ring-2 ring-cyan-400 bg-cyan-950/20' : ''
      }`}
    >
      {/* Hidden File Input for Atlas Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Background Holographic Rings */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
        <div
          className={`w-72 h-72 rounded-full border border-cyan-500/20 transition-all duration-700 ${
            internalState === 'SPEAKING' ? 'scale-110 border-cyan-400/40 animate-pulse' : 'scale-100'
          }`}
        />
        <div
          className={`absolute w-88 h-88 rounded-full border border-cyan-500/10 transition-all duration-1000 ${
            internalState === 'SPEAKING' ? 'scale-105 border-cyan-400/20' : 'scale-95'
          }`}
        />
      </div>

      {/* Drag & Drop Overlay Indicator */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none text-cyan-300">
          <Upload className="w-12 h-12 mb-2 animate-bounce text-cyan-400" />
          <p className="font-mono text-xs font-semibold uppercase tracking-wider">DROP KYRSTEN ANIMATION ATLAS HERE</p>
          <p className="text-[11px] text-slate-400 mt-1">Automatic alpha-matting & frame slicing will occur instantly</p>
        </div>
      )}

      {/* HTML5 Canvas Surface */}
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[420px] max-h-[460px] object-contain z-10 cursor-pointer"
        onClick={() => {
          // Subtle interactive glance toward click
          stateManagerRef.current.setEmotion(
            internalState === 'SPEAKING' ? 'warm' : 'curious'
          );
        }}
        title="Kyrsten Digital AI Avatar - Live Lip-Sync Enabled"
      />

      {/* Telemetry & State HUD Badge */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/85 backdrop-blur-md border border-cyan-500/20 text-[11px] font-mono text-slate-300 shadow-lg pointer-events-auto">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              internalState === 'SPEAKING'
                ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-ping'
                : internalState === 'THINKING'
                ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
            }`}
          />
          <span className="font-semibold tracking-wider text-cyan-300">
            KYRSTEN // {internalState}
          </span>
        </div>

        {/* Atlas Status & Speech Indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 transition-colors border ${
              isAtlasLoaded
                ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/30 hover:bg-cyan-900/60'
                : 'bg-amber-950/60 text-amber-300 border-amber-500/40 hover:bg-amber-900/60 animate-pulse'
            }`}
            title={isAtlasLoaded ? 'Animation Atlas Active (59 Sliced Frames)' : 'Click to load or drop Animation Atlas image'}
          >
            {isAtlasLoaded ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                <span>ATLAS: 59 FRAMES</span>
              </>
            ) : (
              <>
                <Upload className="w-3 h-3 text-amber-400" />
                <span>{isAtlasLoading ? 'SLICING...' : 'SYNC ATLAS'}</span>
              </>
            )}
          </button>

          <div className="flex items-end gap-0.5 h-3">
            {[0.4, 0.8, 1.0, 0.6, 0.7].map((h, i) => (
              <span
                key={i}
                className={`w-1 bg-cyan-400/80 rounded-full transition-all duration-150 ${
                  internalState === 'SPEAKING' ? 'animate-pulse' : ''
                }`}
                style={{
                  height: internalState === 'SPEAKING' ? `${Math.round(h * 11 + 2)}px` : '2px',
                  animationDelay: `${i * 90}ms`,
                }}
              />
            ))}
          </div>

          {onToggleAvatar && (
            <button
              onClick={onToggleAvatar}
              className="ml-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-200 border border-cyan-500/30 transition-colors"
              title="Toggle Avatar Display"
            >
              AVATAR: ON
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
