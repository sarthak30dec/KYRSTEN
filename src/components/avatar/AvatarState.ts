import { AvatarInternalState, AvatarEmotion, FacePose, MouthShape } from './types';
import { CANONICAL_VISEMES, lerp } from './VisemeMapper';

/**
 * AvatarStateManager
 * Controls natural human-like idle kinematics, blinking, eye micro-saccades,
 * emotional expressions, and speech posture.
 */
export class AvatarStateManager {
  private state: AvatarInternalState = 'IDLE';
  private emotion: AvatarEmotion = 'warm';

  // Kinematic poses
  private currentPose: FacePose;
  private targetGazeX = 0;
  private targetGazeY = 0;
  private nextSaccadeTime = 0;

  // Blinking system
  private isBlinking = false;
  private blinkProgress = 0; // 0 (open) to 1 (closed)
  private nextBlinkTime = 0;
  private isDoubleBlink = false;

  // Oscillator timestamps
  private breathingPhase = 0;
  private idleTime = 0;
  private reducedMotion = false;

  constructor() {
    this.reducedMotion = typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    this.currentPose = {
      pitch: 0,
      yaw: 0,
      roll: 0,
      xOffset: 0,
      yOffset: 0,
      eyeGazeX: 0,
      eyeGazeY: 0,
      blinkLeft: 0,
      blinkRight: 0,
      eyebrowLeft: 0.1,
      eyebrowRight: 0.1,
      emotion: 'warm',
      mouth: { ...CANONICAL_VISEMES.REST },
    };

    this.scheduleNextBlink(Date.now());
    this.scheduleNextSaccade(Date.now());
  }

  public setState(nextState: AvatarInternalState) {
    this.state = nextState;
  }

  public getState(): AvatarInternalState {
    return this.state;
  }

  public setEmotion(emotion: AvatarEmotion) {
    this.emotion = emotion;
  }

  public setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
  }

  /**
   * Updates state kinematics on each animation frame
   * @param now Current timestamp in milliseconds
   * @param deltaSeconds Time elapsed since last frame (seconds)
   * @param mouthShape Current mouth shape calculated by LipSyncEngine
   * @param speechEmphasis Speech energy burst from LipSyncEngine (0.0 to 1.0)
   */
  public update(
    now: number,
    deltaSeconds: number,
    mouthShape: MouthShape,
    speechEmphasis: number
  ): FacePose {
    const motionScale = this.reducedMotion ? 0.15 : 1.0;
    this.idleTime += deltaSeconds;

    // 1. Natural Blinking Logic
    this.updateBlinking(now, deltaSeconds);

    // 2. Eye Saccades (Micro-gaze shifts)
    this.updateSaccades(now, deltaSeconds);

    // 3. Breathing and Posture Kinematics
    this.breathingPhase += deltaSeconds * 1.6; // ~3.9s breathing cycle
    const breathY = Math.sin(this.breathingPhase) * 2.2 * motionScale;

    // 4. Target Head Pose based on State
    let targetPitch = 0;
    let targetYaw = 0;
    let targetRoll = 0;
    let targetEyebrowL = 0.1;
    let targetEyebrowR = 0.1;

    if (this.state === 'SPEAKING') {
      // Natural speech rhythm: subtle nod on stressed syllables
      const nod = speechEmphasis * 0.08 * motionScale;
      const subtleSway = Math.sin(this.idleTime * 2.5) * 0.025 * motionScale;
      const subtleTilt = Math.cos(this.idleTime * 1.8) * 0.02 * motionScale;

      targetPitch = nod - 0.02; // Slight forward attentiveness
      targetYaw = subtleSway;
      targetRoll = subtleTilt;

      // Expressive eyebrow intonation during speech
      targetEyebrowL = 0.15 + speechEmphasis * 0.25;
      targetEyebrowR = 0.15 + speechEmphasis * 0.2;
    } else if (this.state === 'THINKING') {
      // Head tilts subtly to the side in contemplation, eyes glance slightly upward
      targetPitch = -0.04 * motionScale;
      targetYaw = 0.07 * motionScale;
      targetRoll = -0.035 * motionScale;
      targetEyebrowL = 0.35; // One eyebrow slightly raised in contemplation
      targetEyebrowR = 0.05;
      this.targetGazeX = 0.25;
      this.targetGazeY = -0.3;
    } else {
      // IDLE: very gentle micro-sway
      targetPitch = Math.sin(this.idleTime * 0.8) * 0.015 * motionScale;
      targetYaw = Math.cos(this.idleTime * 0.6) * 0.02 * motionScale;
      targetRoll = Math.sin(this.idleTime * 0.5) * 0.01 * motionScale;

      // Subtle, human emotion adjustments
      switch (this.emotion) {
        case 'warm':
        case 'happy':
        case 'cheerful':
          targetEyebrowL = 0.15;
          targetEyebrowR = 0.15;
          targetRoll = 0.015 * motionScale;
          break;
        case 'amused':
          targetEyebrowL = 0.22;
          targetEyebrowR = 0.16;
          targetRoll = -0.02 * motionScale;
          break;
        case 'surprised':
          targetEyebrowL = 0.52;
          targetEyebrowR = 0.52;
          targetPitch = -0.03 * motionScale;
          break;
        case 'curious':
          targetEyebrowL = 0.35;
          targetEyebrowR = 0.18;
          targetRoll = 0.035 * motionScale;
          break;
        case 'concerned':
        case 'sad':
          targetEyebrowL = 0.24;
          targetEyebrowR = 0.24;
          targetPitch = 0.025 * motionScale;
          break;
        case 'serious':
          targetEyebrowL = -0.08;
          targetEyebrowR = -0.08;
          targetPitch = 0.01;
          break;
        case 'frustrated':
          targetEyebrowL = -0.18;
          targetEyebrowR = -0.18;
          targetPitch = 0.03 * motionScale;
          break;
        case 'thinking':
          targetEyebrowL = 0.32;
          targetEyebrowR = 0.06;
          targetRoll = -0.03 * motionScale;
          break;
        default:
          targetEyebrowL = 0.1;
          targetEyebrowR = 0.1;
          break;
      }
    }

    // 5. Smooth Interpolation to Target Values (LERP)
    const lerpSpeed = Math.min(1.0, deltaSeconds * 8);
    this.currentPose.pitch = lerp(this.currentPose.pitch, targetPitch, lerpSpeed);
    this.currentPose.yaw = lerp(this.currentPose.yaw, targetYaw, lerpSpeed);
    this.currentPose.roll = lerp(this.currentPose.roll, targetRoll, lerpSpeed);
    this.currentPose.yOffset = lerp(this.currentPose.yOffset, breathY, lerpSpeed);

    this.currentPose.eyeGazeX = lerp(this.currentPose.eyeGazeX, this.targetGazeX, deltaSeconds * 6);
    this.currentPose.eyeGazeY = lerp(this.currentPose.eyeGazeY, this.targetGazeY, deltaSeconds * 6);

    this.currentPose.eyebrowLeft = lerp(this.currentPose.eyebrowLeft, targetEyebrowL, lerpSpeed);
    this.currentPose.eyebrowRight = lerp(this.currentPose.eyebrowRight, targetEyebrowR, lerpSpeed);

    this.currentPose.blinkLeft = this.blinkProgress;
    this.currentPose.blinkRight = this.blinkProgress;
    this.currentPose.emotion = this.emotion;
    this.currentPose.mouth = mouthShape;

    return this.currentPose;
  }

  private updateBlinking(now: number, deltaSeconds: number) {
    if (this.isBlinking) {
      // Blink cycle takes ~130ms (closure + opening)
      const blinkSpeed = 16; // 1.0 / 0.065s
      this.blinkProgress += deltaSeconds * blinkSpeed;

      if (this.blinkProgress >= 1.0) {
        this.blinkProgress = 1.0;
        // Start opening
        this.isBlinking = false;
      }
    } else if (this.blinkProgress > 0) {
      this.blinkProgress = Math.max(0, this.blinkProgress - deltaSeconds * 14);
      if (this.blinkProgress === 0 && this.isDoubleBlink) {
        // Trigger quick second blink
        this.isDoubleBlink = false;
        this.isBlinking = true;
      }
    } else if (now >= this.nextBlinkTime) {
      this.isBlinking = true;
      this.scheduleNextBlink(now);
    }
  }

  private scheduleNextBlink(now: number) {
    // Natural human blinking: every 2.8 to 5.4 seconds
    const interval = (2.8 + Math.random() * 2.6) * 1000;
    this.nextBlinkTime = now + interval;
    // 18% chance of a double-blink
    this.isDoubleBlink = Math.random() < 0.18;
  }

  private updateSaccades(now: number, deltaSeconds: number) {
    if (now >= this.nextSaccadeTime) {
      this.scheduleNextSaccade(now);
      if (this.state === 'SPEAKING') {
        // Gaze remains mostly centered on the user with slight natural saccades
        this.targetGazeX = (Math.random() - 0.5) * 0.15;
        this.targetGazeY = (Math.random() - 0.5) * 0.1;
      } else if (this.state === 'IDLE') {
        this.targetGazeX = (Math.random() - 0.5) * 0.28;
        this.targetGazeY = (Math.random() - 0.5) * 0.18;
      }
    }
  }

  private scheduleNextSaccade(now: number) {
    // Eye shifts gaze position every 1.8 to 4.2 seconds
    this.nextSaccadeTime = now + (1.8 + Math.random() * 2.4) * 1000;
  }
}
