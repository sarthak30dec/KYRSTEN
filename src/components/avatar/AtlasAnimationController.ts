/**
 * AtlasAnimationController
 * High-performance 60fps sprite & frame animation engine driven by the Kyrsten Animation Atlas.
 * 
 * Manages:
 * - Idle breathing cycles across idle_001..idle_008
 * - Multi-frame natural blinking (eye_open -> eye_half -> eye_closed -> eye_open / blink_01..05)
 * - Subtle head turns and micro-saccade gaze shifts (look_left, look_center, look_right)
 * - Phonetic lip-sync mouth articulation with smooth cross-fading
 * - Synchronized speech sequence animation (speak_001..speak_008)
 * - Contextual emotional expressions (neutral, happy, amused, curious, concerned, surprised, serious, sad)
 * - Holographic overlays (scanlines, atmospheric particles, glow)
 */

import { atlasFrameManager } from './AtlasFrameManager';
import { FacePose, AvatarConfig, AvatarInternalState, AvatarEmotion } from './types';

interface CrossFadeFrame {
  canvas: HTMLCanvasElement;
  alpha: number;
}

export class AtlasAnimationController {
  private ctx: CanvasRenderingContext2D;
  private width: number = 400;
  private height: number = 440;
  private dpr: number = 1;

  // Idle Breathing Kinematics
  private breathingClock: number = 0;
  private currentIdleFrameIdx: number = 1;

  // Natural Blinking System
  private isBlinking: boolean = false;
  private blinkProgress: number = 0; // 0 to 1
  private nextBlinkTime: number = 0;
  private blinkDuration: number = 0.18; // 180ms natural blink
  private isDoubleBlink: boolean = false;

  // Head Gaze & Look Direction
  private currentLookDir: 'left' | 'center' | 'right' = 'center';
  private targetLookDir: 'left' | 'center' | 'right' = 'center';
  private lookBlend: number = 1.0;
  private nextGazeShiftTime: number = 0;

  // Viseme Lip-Sync Cross-Fading
  private currentVisemeKey: string = 'visemes/viseme_rest';
  private targetVisemeKey: string = 'visemes/viseme_rest';
  private visemeBlendWeight: number = 1.0; // 0.0 to 1.0 crossfade progress

  // Speaking Sequence Loop
  private speechClock: number = 0;
  private currentSpeakFrameIdx: number = 1;

  // Emotional Expressions
  private currentEmotion: AvatarEmotion = 'warm';
  private emotionBlend: number = 1.0;

  // Ambient Floating Particles
  private particles: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number }> = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;

    // Schedule initial natural blink & gaze shift
    const now = performance.now();
    this.scheduleNextBlink(now);
    this.scheduleNextGazeShift(now);

    // Initialize ambient hologram particles
    for (let i = 0; i < 24; i++) {
      this.particles.push({
        x: (Math.random() - 0.5) * 360,
        y: (Math.random() - 0.5) * 380,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.2 - Math.random() * 0.35,
        alpha: 0.15 + Math.random() * 0.45,
        size: 0.8 + Math.random() * 1.8,
      });
    }
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    const canvas = this.ctx.canvas;
    canvas.width = Math.floor(width * this.dpr);
    canvas.height = Math.floor(height * this.dpr);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.dpr, this.dpr);
  }

  private scheduleNextBlink(now: number) {
    // Human average: blink every 2.8 to 5.8 seconds
    const interval = 2800 + Math.random() * 3000;
    this.nextBlinkTime = now + interval;
    this.isDoubleBlink = Math.random() < 0.15; // 15% chance of double-blink
  }

  private scheduleNextGazeShift(now: number) {
    // Micro-gaze shifts every 3.5 to 7 seconds
    this.nextGazeShiftTime = now + 3500 + Math.random() * 3500;
    const r = Math.random();
    if (r < 0.6) {
      this.targetLookDir = 'center';
    } else if (r < 0.8) {
      this.targetLookDir = 'left';
    } else {
      this.targetLookDir = 'right';
    }
    this.lookBlend = 0;
  }

  public setViseme(visemeType: string) {
    const key = atlasFrameManager.getVisemeFrameKey(visemeType);

    if (this.targetVisemeKey !== key) {
      this.currentVisemeKey = this.targetVisemeKey;
      this.targetVisemeKey = key;
      this.visemeBlendWeight = 0;
    }
  }

  public setEmotion(emotion: AvatarEmotion) {
    if (this.currentEmotion !== emotion) {
      this.currentEmotion = emotion;
      this.emotionBlend = 0;
    }
  }

  /**
   * Main 60fps render tick called by KyrstenAvatar loop
   */
  public render(
    now: number,
    deltaSec: number,
    pose: FacePose,
    config: AvatarConfig,
    state: AvatarInternalState,
    isSpeaking: boolean,
    speechEnergy: number,
    activeViseme: string = 'REST'
  ) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const isLoaded = atlasFrameManager.getIsLoaded();
    if (!isLoaded) {
      // Atlas frames still loading or not yet provided
      this.renderFallbackPlaceholder(ctx, w, h, state, config);
      return;
    }

    // 1. Update Blinking State
    if (!this.isBlinking && now >= this.nextBlinkTime) {
      this.isBlinking = true;
      this.blinkProgress = 0;
    }

    if (this.isBlinking) {
      this.blinkProgress += deltaSec / this.blinkDuration;
      if (this.blinkProgress >= 1.0) {
        this.isBlinking = false;
        this.blinkProgress = 0;
        if (this.isDoubleBlink) {
          this.isDoubleBlink = false;
          this.nextBlinkTime = now + 120; // Rapid follow-up blink
        } else {
          this.scheduleNextBlink(now);
        }
      }
    }

    // 2. Update Gaze Shifts
    if (now >= this.nextGazeShiftTime) {
      this.scheduleNextGazeShift(now);
    }
    if (this.lookBlend < 1.0) {
      this.lookBlend = Math.min(1.0, this.lookBlend + deltaSec * 3.5);
      if (this.lookBlend >= 1.0) {
        this.currentLookDir = this.targetLookDir;
      }
    }

    // 3. Update Idle Breathing Cycle (Cycles 1..8..1)
    this.breathingClock += deltaSec * 0.45; // ~3.8s full breath cycle
    const breathNorm = (Math.sin(this.breathingClock * Math.PI * 2) + 1) / 2; // 0.0 to 1.0
    this.currentIdleFrameIdx = Math.max(1, Math.min(8, Math.round(breathNorm * 7) + 1));

    // 4. Update Speaking Sequence
    if (isSpeaking) {
      this.speechClock += deltaSec * (5.5 + speechEnergy * 4.0);
      this.currentSpeakFrameIdx = (Math.floor(this.speechClock) % 8) + 1;
      this.setViseme(activeViseme);
    } else {
      this.setViseme('REST');
      this.speechClock = 0;
    }

    if (this.visemeBlendWeight < 1.0) {
      this.visemeBlendWeight = Math.min(1.0, this.visemeBlendWeight + deltaSec * 22.0);
    }
    if (this.emotionBlend < 1.0) {
      this.emotionBlend = Math.min(1.0, this.emotionBlend + deltaSec * 4.0);
    }

    // 5. Select Primary Body Frame:
    // When speaking: use speaking sequence bust or head direction
    // When idle: use breathing idle sequence (idle_001..idle_008)
    // When strong emotion active: blend to expression keyframe
    let primaryBust: HTMLCanvasElement | null = null;
    let secondaryBust: HTMLCanvasElement | null = null;
    let bustBlendAlpha = 0.0;

    if (isSpeaking) {
      primaryBust = atlasFrameManager.getSpeakingFrame(this.currentSpeakFrameIdx);
      if (this.currentEmotion !== 'neutral') {
        secondaryBust = atlasFrameManager.getExpressionFrame(this.currentEmotion);
        bustBlendAlpha = 0.35;
      }
    } else if (state === 'THINKING') {
      primaryBust = atlasFrameManager.getExpressionFrame('curious');
    } else {
      // Idle mode
      if (this.targetLookDir !== 'center' && this.lookBlend > 0.4) {
        primaryBust = atlasFrameManager.getHeadFrame(this.targetLookDir);
      } else {
        primaryBust = atlasFrameManager.getIdleFrame(this.currentIdleFrameIdx);
      }

      if (this.currentEmotion !== 'neutral' && this.currentEmotion !== 'warm') {
        secondaryBust = atlasFrameManager.getExpressionFrame(this.currentEmotion);
        bustBlendAlpha = 0.4;
      }
    }

    if (!primaryBust) {
      primaryBust = atlasFrameManager.getBasePortrait();
    }

    // 6. Draw Ambient Back-Glow & Atmosphere
    this.renderHolographicGlow(ctx, w, h, speechEnergy, state);

    // 7. Calculate Drawing Bounds & Parallax
    const centerX = w / 2 + pose.xOffset + pose.yaw * 16;
    const centerY = h / 2 + pose.yOffset + pose.pitch * 12 + Math.sin(this.breathingClock * Math.PI * 2) * 3;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(pose.roll * 0.6);

    // Target avatar bust size
    const targetW = Math.min(w * 0.92, 380);
    const aspect = primaryBust ? primaryBust.width / Math.max(1, primaryBust.height) : 0.85;
    const drawW = targetW;
    const drawH = drawW / aspect;
    const drawX = -drawW / 2;
    const drawY = -drawH / 2 + 10;

    // Draw Primary Bust Frame
    if (primaryBust) {
      ctx.globalAlpha = 1.0;
      ctx.drawImage(primaryBust, drawX, drawY, drawW, drawH);
    }

    // Blend Secondary Expression Bust Frame if applicable
    if (secondaryBust && bustBlendAlpha > 0.05) {
      ctx.globalAlpha = bustBlendAlpha;
      ctx.drawImage(secondaryBust, drawX, drawY, drawW, drawH);
      ctx.globalAlpha = 1.0;
    }

    // 8. Composite Blinking Eye Layer
    this.renderBlinkOverlay(ctx, drawX, drawY, drawW, drawH);

    // 9. Composite Phonetic Mouth Viseme Layer
    if (isSpeaking) {
      this.renderMouthVisemeOverlay(ctx, drawX, drawY, drawW, drawH, speechEnergy);
    }

    ctx.restore();

    // 10. Floating Holographic Particles
    this.renderAtmosphericParticles(ctx, w, h, deltaSec);

    // 11. Subtle Hologram Scanlines
    if (config.hologramGlow) {
      this.renderScanlines(ctx, w, h);
    }
  }

  /**
   * Eye blink compositing: calculates exact blink progress curve
   */
  private renderBlinkOverlay(
    ctx: CanvasRenderingContext2D,
    drawX: number,
    drawY: number,
    drawW: number,
    drawH: number
  ) {
    if (!this.isBlinking) return;

    // Closed eye phase when progress is between 0.35 and 0.65
    let eyeFrame: HTMLCanvasElement | null = null;
    if (this.blinkProgress > 0.35 && this.blinkProgress < 0.65) {
      eyeFrame = atlasFrameManager.getEyeFrame('eye_closed');
    } else if (this.blinkProgress > 0.15 && this.blinkProgress < 0.85) {
      eyeFrame = atlasFrameManager.getEyeFrame('eye_half');
    }

    if (!eyeFrame) return;

    // Position eye overlay relative to bust
    // The eye region on Kyrsten's bust is centered around y ~38% of head height
    const eyeW = drawW * 0.44;
    const eyeH = eyeW * (eyeFrame.height / Math.max(1, eyeFrame.width));
    const eyeX = drawX + drawW * 0.28;
    const eyeY = drawY + drawH * 0.26;

    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.drawImage(eyeFrame, eyeX, eyeY, eyeW, eyeH);
    ctx.restore();
  }

  /**
   * Mouth Viseme compositing: blends active viseme onto mouth region
   */
  private renderMouthVisemeOverlay(
    ctx: CanvasRenderingContext2D,
    drawX: number,
    drawY: number,
    drawW: number,
    drawH: number,
    speechEnergy: number
  ) {
    const curFrame = atlasFrameManager.getFrame(this.currentVisemeKey);
    const targetFrame = atlasFrameManager.getFrame(this.targetVisemeKey);

    if (!curFrame && !targetFrame) return;

    // Mouth region is centered around x: 50%, y: ~52% of bust
    const mouthW = drawW * 0.28;
    const sampleFrame = targetFrame || curFrame!;
    const mouthH = mouthW * (sampleFrame.height / Math.max(1, sampleFrame.width));
    const mouthX = drawX + drawW * 0.36;
    const mouthY = drawY + drawH * 0.47;

    ctx.save();
    // Subtle breathing scaling with speech volume
    const pulseScale = 1.0 + speechEnergy * 0.04;
    const pW = mouthW * pulseScale;
    const pH = mouthH * pulseScale;
    const pX = mouthX - (pW - mouthW) / 2;
    const pY = mouthY - (pH - mouthH) / 2;

    if (curFrame && targetFrame && curFrame !== targetFrame && this.visemeBlendWeight < 1.0) {
      // Cross-fade between consecutive visemes
      ctx.globalAlpha = 1.0 - this.visemeBlendWeight;
      ctx.drawImage(curFrame, pX, pY, pW, pH);

      ctx.globalAlpha = this.visemeBlendWeight;
      ctx.drawImage(targetFrame, pX, pY, pW, pH);
    } else {
      const active = targetFrame || curFrame;
      if (active) {
        ctx.globalAlpha = 0.95;
        ctx.drawImage(active, pX, pY, pW, pH);
      }
    }
    ctx.restore();
  }

  /**
   * Ambient Holographic Glow Backdrop
   */
  private renderHolographicGlow(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    speechEnergy: number,
    state: AvatarInternalState
  ) {
    const glowOverlay = atlasFrameManager.getOverlay('hologram_glow');
    if (glowOverlay) {
      ctx.save();
      ctx.globalAlpha = 0.4 + speechEnergy * 0.3;
      ctx.drawImage(glowOverlay, w * 0.05, h * 0.05, w * 0.9, h * 0.9);
      ctx.restore();
    } else {
      // Procedural soft gradient fallback
      const grad = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.48);
      const color =
        state === 'SPEAKING'
          ? 'rgba(34, 211, 238, 0.28)'
          : state === 'THINKING'
          ? 'rgba(245, 158, 11, 0.22)'
          : 'rgba(56, 189, 248, 0.18)';
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(2, 6, 23, 0)');

      ctx.save();
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  /**
   * Atmospheric floating particle shimmer
   */
  private renderAtmosphericParticles(ctx: CanvasRenderingContext2D, w: number, h: number, deltaSec: number) {
    ctx.save();
    for (const p of this.particles) {
      p.x += p.vx * deltaSec * 60;
      p.y += p.vy * deltaSec * 60;

      if (p.y < -h / 2) {
        p.y = h / 2 + Math.random() * 20;
        p.x = (Math.random() - 0.5) * (w * 0.9);
      }

      const scrX = w / 2 + p.x;
      const scrY = h / 2 + p.y;

      ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(scrX, scrY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Subtle Hologram Scanlines
   */
  private renderScanlines(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const scanlineOverlay = atlasFrameManager.getOverlay('scanlines');
    if (scanlineOverlay) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.drawImage(scanlineOverlay, 0, 0, w, h);
      ctx.restore();
    } else {
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.035)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Graceful fallback when atlas is waiting to be loaded
   */
  private renderFallbackPlaceholder(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    state: AvatarInternalState,
    config: AvatarConfig
  ) {
    const isLoading = atlasFrameManager.getIsLoading();
    const loadError = atlasFrameManager.getLoadError();

    // Center icon and guidance
    ctx.save();
    const cx = w / 2;
    const cy = h / 2 - 20;

    // Soft concentric rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 75, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.beginPath();
    ctx.arc(cx, cy, 95, 0, Math.PI * 2);
    ctx.stroke();

    // Holographic silhouette avatar outline
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.beginPath();
    ctx.arc(cx, cy - 20, 30, 0, Math.PI * 2); // head
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(cx, cy + 35, 55, 30, 0, 0, Math.PI); // bust
    ctx.fill();

    // Status text
    ctx.font = '12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#38bdf8';

    if (isLoading) {
      ctx.fillText('SLICING KYRSTEN ATLAS ASSETS...', cx, cy + 90);
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Applying alpha-aware background matting', cx, cy + 110);
    } else if (loadError) {
      ctx.fillStyle = '#f87171';
      ctx.fillText('ATLAS SYNC REQUIRED', cx, cy + 85);
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText('Drop Kyrsten Animation Atlas to initialize', cx, cy + 105);
    } else {
      ctx.fillText('KYRSTEN ANIMATION ATLAS ENGINE', cx, cy + 85);
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Drag & drop atlas image here or click below', cx, cy + 105);
    }

    ctx.restore();
  }
}
