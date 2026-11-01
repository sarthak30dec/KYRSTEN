import { VisemeEvent, MouthShape } from './types';
import { CANONICAL_VISEMES, interpolateMouthShape, mapAcousticToMouthShape } from './VisemeMapper';

/**
 * LipSyncEngine
 * Synchronizes digital avatar mouth articulation directly to the Web Audio clock.
 * Supports precomputed phonetic timelines with continuous co-articulation interpolation,
 * and real-time acoustic spectral fallback.
 */
export class LipSyncEngine {
  private timeline: VisemeEvent[] = [];
  private currentShape: MouthShape = { ...CANONICAL_VISEMES.REST };
  private analyserNode: AnalyserNode | null = null;
  private freqData: Uint8Array = new Uint8Array(0);
  private timeData: Uint8Array = new Uint8Array(0);
  private lastRmsVolume: number = 0;
  private speechEmphasis: number = 0; // 0.0 to 1.0 for head nod synchronization
  private lastActiveIdx: number = 0;
  private activeVisemeName: string = 'REST';

  public getActiveVisemeName(): string {
    return this.activeVisemeName;
  }

  public setTimeline(events: VisemeEvent[]) {
    this.timeline = events.slice().sort((a, b) => a.time - b.time);
    this.lastActiveIdx = 0;
  }

  public clearTimeline() {
    this.timeline = [];
    this.lastActiveIdx = 0;
  }

  public setAnalyser(analyser: AnalyserNode | null) {
    this.analyserNode = analyser;
    if (analyser) {
      this.freqData = new Uint8Array(analyser.frequencyBinCount);
      this.timeData = new Uint8Array(analyser.fftSize);
    } else {
      this.freqData = new Uint8Array(0);
      this.timeData = new Uint8Array(0);
    }
  }

  /**
   * Samples current audio amplitude from AnalyserNode
   */
  public getInstantaneousRms(): number {
    if (!this.analyserNode) return 0;
    try {
      this.analyserNode.getByteTimeDomainData(this.timeData);
      let sumSq = 0;
      const len = this.timeData.length;
      if (len === 0) return 0;
      for (let i = 0; i < len; i++) {
        const norm = (this.timeData[i] - 128) / 128;
        sumSq += norm * norm;
      }
      return Math.sqrt(sumSq / len);
    } catch {
      return 0;
    }
  }

  /**
   * Main update function called on each animation frame
   * @param playbackTime Current seconds elapsed in speech playback
   * @param isSpeaking Whether audio is actively playing
   */
  public update(playbackTime: number, isSpeaking: boolean): { mouth: MouthShape; emphasis: number; activeViseme: string } {
    if (!isSpeaking) {
      // Rapidly but smoothly ease back to relaxed resting mouth shape
      this.currentShape = interpolateMouthShape(this.currentShape, CANONICAL_VISEMES.REST, 0.28);
      this.speechEmphasis = Math.max(0, this.speechEmphasis - 0.1);
      this.activeVisemeName = 'REST';
      return { mouth: this.currentShape, emphasis: this.speechEmphasis, activeViseme: 'REST' };
    }

    // 1. Measure live audio energy
    let rms = 0;
    if (this.analyserNode) {
      try {
        rms = this.getInstantaneousRms();
        this.analyserNode.getByteFrequencyData(this.freqData);
      } catch {
        rms = 0;
      }
    }

    // Detect syllable stress peaks for natural head nods
    const energyDelta = rms - this.lastRmsVolume;
    if (energyDelta > 0.035 && rms > 0.05) {
      this.speechEmphasis = Math.min(1.0, this.speechEmphasis + 0.45);
    } else {
      this.speechEmphasis = Math.max(0, this.speechEmphasis - 0.06);
    }
    this.lastRmsVolume = rms;

    // 2. Primary Method: Check precomputed phonetic timeline
    if (this.timeline.length > 0 && playbackTime >= 0) {
      const activeIdx = this.findActiveVisemeIndex(playbackTime);

      if (activeIdx !== -1) {
        const currentEvent = this.timeline[activeIdx];
        const nextEvent = this.timeline[activeIdx + 1] || currentEvent;
        this.activeVisemeName = currentEvent.viseme;

        // Progress within the current viseme duration
        const elapsedInEvent = playbackTime - currentEvent.time;
        const dur = Math.max(0.03, currentEvent.duration);
        const progress = Math.max(0, Math.min(1, elapsedInEvent / dur));

        const targetCurrent = CANONICAL_VISEMES[currentEvent.viseme] || CANONICAL_VISEMES.REST;
        const targetNext = CANONICAL_VISEMES[nextEvent.viseme] || targetCurrent;

        // Smooth co-articulation blending between current and adjacent viseme
        const blendedTarget = interpolateMouthShape(targetCurrent, targetNext, progress);

        // Responsive smoothing factor: 0.45 gives crisp articulation without lagging or snapping
        this.currentShape = interpolateMouthShape(this.currentShape, blendedTarget, 0.45);
        return { mouth: this.currentShape, emphasis: this.speechEmphasis, activeViseme: this.activeVisemeName };
      }
    }

    // 3. Fallback Method: Real-time acoustic frequency analysis
    if (this.analyserNode && this.freqData.length > 0) {
      this.currentShape = mapAcousticToMouthShape(this.freqData, rms, this.currentShape);
      this.activeVisemeName = this.currentShape.jawOpen > 0.4 ? 'AA' : (this.currentShape.mouthRound > 0.3 ? 'UW' : 'AH');
      return { mouth: this.currentShape, emphasis: this.speechEmphasis, activeViseme: this.activeVisemeName };
    }

    // Default gentle speaking motion if no analyser and no timeline
    const fallbackPulse = Math.sin(playbackTime * 14) * 0.2 + 0.3;
    const fallbackShape: MouthShape = {
      jawOpen: fallbackPulse,
      mouthWidth: 0.18,
      mouthRound: 0.1,
      upperLipLift: fallbackPulse * 0.28,
      lowerLipDepress: fallbackPulse * 0.55,
      lowerLipTuck: 0,
      smile: 0.22,
      teethVisible: fallbackPulse * 0.65,
      tongueRaise: 0.15,
    };

    this.currentShape = interpolateMouthShape(this.currentShape, fallbackShape, 0.32);
    this.activeVisemeName = fallbackPulse > 0.35 ? 'AH' : 'REST';
    return { mouth: this.currentShape, emphasis: this.speechEmphasis, activeViseme: this.activeVisemeName };
  }

  private findActiveVisemeIndex(time: number): number {
    const len = this.timeline.length;
    if (len === 0) return -1;

    // Fast check around last index for sequential playback
    if (this.lastActiveIdx < len) {
      const cur = this.timeline[this.lastActiveIdx];
      if (time >= cur.time && time < cur.time + cur.duration) {
        return this.lastActiveIdx;
      }
      if (this.lastActiveIdx + 1 < len) {
        const next = this.timeline[this.lastActiveIdx + 1];
        if (time >= next.time && time < next.time + next.duration) {
          this.lastActiveIdx++;
          return this.lastActiveIdx;
        }
      }
    }

    // Full scan
    for (let i = 0; i < len; i++) {
      const evt = this.timeline[i];
      if (time >= evt.time && time < evt.time + evt.duration) {
        this.lastActiveIdx = i;
        return i;
      }
    }

    // Past all events but audio still active: use last
    if (time >= this.timeline[len - 1].time) {
      this.lastActiveIdx = len - 1;
      return len - 1;
    }

    return 0;
  }
}
