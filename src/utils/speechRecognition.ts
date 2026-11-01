import {
  detectPitch,
  calculateSpectralCentroid,
  calculateBandEnergyProfile,
  calculateZeroCrossingRate,
} from './voiceBiometrics';

export interface SpeechAcousticsSummary {
  avgPitch: number;
  pitchRange: [number, number];
  avgCentroid: number;
  avgFormants: [number, number, number, number];
  avgZcr: number;
  frameCount: number;
}

export interface AudioAnalyzerHandles {
  analyser: AnalyserNode;
  gainNode?: GainNode;
  dataArray: Uint8Array;
  sampleRate: number;
  getFrequencyData: () => Uint8Array;
  getTimeDomainData: () => Uint8Array;
  getAverageVolume: () => number;
  getActiveSpeechAcoustics: () => SpeechAcousticsSummary | null;
  clearSpeechAcoustics: () => void;
  setSoloMode: (enabled: boolean) => void;
  isSoloMode: () => boolean;
  setInputGain: (gain: number) => void;
  stop: () => void;
}

interface VoicedSample {
  pitch: number;
  centroid: number;
  formants: [number, number, number, number];
  zcr: number;
  timestamp: number;
}

// Set up live microphone audio stream with 2048 FFT for high-precision acoustic analysis
export async function setupMicrophoneAnalyzer(initialSoloMode = false): Promise<AudioAnalyzerHandles> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {}
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const source = audioCtx.createMediaStreamSource(stream);
  const gainNode = audioCtx.createGain();
  let isSoloModeActive = initialSoloMode;
  // In solo mode, boost audio input gain by 2.6x (~8.3dB) for quiet solitary room capture
  gainNode.gain.value = isSoloModeActive ? 2.6 : 1.0;

  const analyser = audioCtx.createAnalyser();
  // 2048 FFT enables precise fundamental pitch (F0: 70Hz-450Hz) and detailed formant spectral tracking
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.7;

  source.connect(gainNode);
  gainNode.connect(analyser);

  const freqBinCount = analyser.frequencyBinCount;
  const freqData = new Uint8Array(freqBinCount);
  const timeData = new Uint8Array(analyser.fftSize);

  // Rolling buffer of acoustic frames captured during active speech
  const rollingVoicedFrames: VoicedSample[] = [];

  const acousticTrackerInterval = setInterval(() => {
    try {
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      // Check root mean square energy
      let sumSq = 0;
      for (let i = 0; i < timeData.length; i++) {
        const norm = (timeData[i] - 128) / 128;
        sumSq += norm * norm;
      }
      const rms = Math.sqrt(sumSq / timeData.length);

      // In Solo Mode, RMS detection threshold is lowered to 0.005 so quiet/relaxed solitary speech is captured.
      // In Normal Mode, RMS threshold is 0.015 to reject ambient room chatter and background noise.
      const minRms = isSoloModeActive ? 0.005 : 0.015;
      if (rms > minRms) {
        const pitch = detectPitch(timeData, audioCtx.sampleRate);
        const centroid = calculateSpectralCentroid(freqData, audioCtx.sampleRate);
        const formants = calculateBandEnergyProfile(freqData, audioCtx.sampleRate);
        const zcr = calculateZeroCrossingRate(timeData);

        if (pitch > 60 || centroid > 300) {
          rollingVoicedFrames.push({
            pitch,
            centroid,
            formants,
            zcr,
            timestamp: Date.now(),
          });
        }
      }

      // Keep only recent 5 seconds
      const cutoff = Date.now() - 5000;
      while (rollingVoicedFrames.length > 0 && rollingVoicedFrames[0].timestamp < cutoff) {
        rollingVoicedFrames.shift();
      }
    } catch (e) {}
  }, 45);

  return {
    analyser,
    gainNode,
    dataArray: freqData,
    sampleRate: audioCtx.sampleRate,
    setSoloMode: (enabled: boolean) => {
      isSoloModeActive = enabled;
      try {
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        // Boost gain to 2.6 in Solo Mode; revert to 1.0 in Normal Mode
        const targetGain = enabled ? 2.6 : 1.0;
        gainNode.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.05);
      } catch (e) {
        console.warn('[Microphone] Failed to adjust solo mode gain:', e);
      }
    },
    isSoloMode: () => isSoloModeActive,
    setInputGain: (gain: number) => {
      try {
        const clamped = Math.max(0.2, Math.min(5.0, gain));
        gainNode.gain.setTargetAtTime(clamped, audioCtx.currentTime, 0.05);
      } catch (e) {}
    },
    getFrequencyData: () => {
      analyser.getByteFrequencyData(freqData);
      return freqData;
    },
    getTimeDomainData: () => {
      analyser.getByteTimeDomainData(timeData);
      return timeData;
    },
    getAverageVolume: () => {
      analyser.getByteFrequencyData(freqData);
      let sum = 0;
      for (let i = 0; i < freqBinCount; i++) {
        sum += freqData[i];
      }
      return sum / freqBinCount;
    },
    getActiveSpeechAcoustics: (): SpeechAcousticsSummary | null => {
      const recent = rollingVoicedFrames.slice(-60); // Last ~2.7 seconds of voiced frames
      if (recent.length === 0) return null;

      const validPitches = recent.map((r) => r.pitch).filter((p) => p >= 70 && p <= 450);
      const avgPitch =
        validPitches.length > 0
          ? Math.round(validPitches.reduce((a, b) => a + b, 0) / validPitches.length)
          : -1;

      const minPitch = validPitches.length > 0 ? Math.min(...validPitches) : 90;
      const maxPitch = validPitches.length > 0 ? Math.max(...validPitches) : 220;

      const avgCentroid = Math.round(
        recent.reduce((acc, r) => acc + r.centroid, 0) / recent.length
      );

      const avgFormants: [number, number, number, number] = [0, 0, 0, 0];
      for (let i = 0; i < 4; i++) {
        const sum = recent.reduce((acc, r) => acc + r.formants[i], 0);
        avgFormants[i] = Math.round((sum / recent.length) * 100) / 100;
      }

      const avgZcr =
        Math.round((recent.reduce((acc, r) => acc + r.zcr, 0) / recent.length) * 100) / 100;

      return {
        avgPitch,
        pitchRange: [minPitch, maxPitch],
        avgCentroid,
        avgFormants,
        avgZcr,
        frameCount: recent.length,
      };
    },
    clearSpeechAcoustics: () => {
      rollingVoicedFrames.length = 0;
    },
    stop: () => {
      try {
        clearInterval(acousticTrackerInterval);
        stream.getTracks().forEach((track) => track.stop());
        source.disconnect();
        gainNode.disconnect();
        if (audioCtx.state !== 'closed') {
          audioCtx.close();
        }
      } catch (e) {}
    },
  };
}

// Normalize common speech-to-text misrecognitions for "KYRSTEN"
export function normalizeKyrstenName(text: string): string {
  if (!text) return '';
  return text
    // Replace whole-word or prefixed variations of Christian / Kirsten / Kysten / Kristen / Christine / Christen
    .replace(/\b(christian|christians|christen|christin|christine|kirsten|kirstin|kristen|kristin|kysten|keersten|kearsten|kirston|curstin|kerstin)\b/gi, 'Kyrsten')
    .replace(/\bhey\s+(christian|christen|christine|kirsten|kristen|kysten|keersten|kearsten)\b/gi, 'Hey Kyrsten');
}

// Web Speech Recognition Controller
export class SpeechRecognitionController {
  private recognition: any = null;
  private isListening = false;
  private isContinuous = false;
  private wakeWord = 'kyrsten';
  private wakeWordEnabled = true;

  // Echo cancellation & self-hearing suppression state
  private isSelfEchoSuppressed = false;
  private echoSuppressionUntil = 0;
  private recentAssistantUtterances: string[] = [];

  public onResult: ((transcript: string, isFinal: boolean) => void) | null = null;
  public onWakeWordDetected: (() => void) | null = null;
  public onStart: (() => void) | null = null;
  public onEnd: (() => void) | null = null;
  public onError: ((error: string) => void) | null = null;

  /**
   * Mute or un-mute speech recognition input while the assistant is speaking
   * to strictly prevent Kyrsten from hearing herself through speaker feedback.
   */
  public setEchoSuppression(suppressed: boolean, cooldownMs = 900) {
    if (suppressed) {
      this.isSelfEchoSuppressed = true;
      this.echoSuppressionUntil = Date.now() + 120000; // Keep suppressed until explicitly cleared
    } else {
      this.isSelfEchoSuppressed = false;
      // Keep a post-speech cooldown to allow room echoes and STT buffers to clear
      this.echoSuppressionUntil = Date.now() + cooldownMs;
    }
  }

  public isSuppressed(): boolean {
    return this.isSelfEchoSuppressed || Date.now() < this.echoSuppressionUntil;
  }

  /**
   * Register recent spoken text from the assistant so any echo leakage
   * that sounds identical or matches assistant phrases is discarded.
   */
  public registerAssistantUtterance(text: string) {
    if (!text) return;
    const clean = text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (clean.length > 2) {
      this.recentAssistantUtterances.unshift(clean);
      if (this.recentAssistantUtterances.length > 8) {
        this.recentAssistantUtterances.pop();
      }
    }
  }

  /**
   * Checks if an incoming transcript is an acoustic echo of Kyrsten's own recent words.
   */
  private isSelfEcho(transcript: string): boolean {
    if (!transcript) return false;
    const cleanInput = transcript
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanInput) return false;

    for (const phrase of this.recentAssistantUtterances) {
      if (phrase.includes(cleanInput) && cleanInput.length > 4) {
        return true;
      }
      if (cleanInput.includes(phrase) && phrase.length > 6) {
        return true;
      }

      // Check word overlap
      const inputWords = cleanInput.split(' ').filter((w) => w.length > 2);
      const phraseWords = new Set(phrase.split(' ').filter((w) => w.length > 2));
      if (inputWords.length >= 2) {
        let matchCount = 0;
        for (const w of inputWords) {
          if (phraseWords.has(w)) matchCount++;
        }
        if (matchCount / inputWords.length >= 0.55) {
          return true;
        }
      }
    }

    return false;
  }

  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStart?.();
      };

      this.recognition.onresult = (event: any) => {
        // Echo Cancellation & Self-Hearing Guard:
        // Discard any incoming audio/transcript if assistant is currently speaking or in post-speech cooldown
        if (this.isSuppressed()) {
          return;
        }

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const text = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += text;
          } else {
            interimTranscript += text;
          }
        }

        const rawText = (finalTranscript || interimTranscript).trim();
        const currentText = normalizeKyrstenName(rawText);

        if (!currentText) return;

        // Secondary Acoustic Echo Check against assistant phrases:
        if (this.isSelfEcho(currentText)) {
          return;
        }

        if (this.wakeWordEnabled && currentText) {
          // Check for wake word across phonetic aliases
          const lower = currentText.toLowerCase();
          const targetWake = this.wakeWord.toLowerCase();
          const aliases = ['kyrsten', 'kysten', 'christian', 'kirsten', 'kristen', 'christine', 'christen', 'keersten'];
          const isMatched =
            lower.includes(targetWake) ||
            aliases.some(alias => lower.includes(alias) || lower.includes('hey ' + alias));

          if (isMatched) {
            this.onWakeWordDetected?.();
          }
        }

        if (finalTranscript) {
          this.onResult?.(normalizeKyrstenName(finalTranscript.trim()), true);
        } else if (interimTranscript) {
          this.onResult?.(normalizeKyrstenName(interimTranscript.trim()), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error !== 'no-speech') {
          this.onError?.(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onEnd?.();
        // If continuous mode was on, auto restart
        if (this.isContinuous) {
          try {
            this.recognition.start();
          } catch (e) {}
        }
      };
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public setContinuous(continuous: boolean) {
    this.isContinuous = continuous;
    if (this.recognition) {
      this.recognition.continuous = continuous;
    }
  }

  public setWakeWord(word: string, enabled: boolean) {
    this.wakeWord = word || 'kyrsten';
    this.wakeWordEnabled = enabled;
  }

  public start() {
    if (!this.recognition) return;
    try {
      this.recognition.start();
    } catch (e) {
      // already started
    }
  }

  public stop() {
    if (!this.recognition) return;
    this.isContinuous = false;
    try {
      this.recognition.stop();
    } catch (e) {}
  }
}
