import { BossVoiceprint, VoiceprintVerificationResult } from '../types';

export const DEFAULT_BOSS_VOICEPRINT: BossVoiceprint = {
  isEnrolled: false,
  sampleCount: 0,
  avgPitchHz: 135,
  pitchRange: [90, 220],
  spectralCentroid: 1420,
  formantEnergyProfile: [0.35, 0.38, 0.18, 0.09], // [80-300Hz, 300-1500Hz, 1500-3500Hz, >3500Hz]
  zeroCrossingRate: 0.08,
  confidenceThreshold: 0.70,
  bossName: 'Boss',
  passphrase: 'Hey Kyrsten, authenticate voice lock',
};

// Normalized Autocorrelation pitch detection algorithm
export function detectPitch(timeDomainData: Uint8Array, sampleRate = 44100): number {
  const bufferSize = timeDomainData.length;
  if (bufferSize < 512) return -1;

  // Convert 0-255 uint8 to -1.0 to +1.0 float
  const floatBuffer = new Float32Array(bufferSize);
  let sumSq = 0;
  for (let i = 0; i < bufferSize; i++) {
    const val = (timeDomainData[i] - 128) / 128;
    floatBuffer[i] = val;
    sumSq += val * val;
  }

  // Root mean square volume threshold (ignore silence and quiet background hiss)
  const rms = Math.sqrt(sumSq / bufferSize);
  if (rms < 0.018) {
    return -1; // Silence
  }

  // Human vocal range: 65 Hz (deep bass) to 450 Hz (high speech)
  const minLag = Math.max(2, Math.floor(sampleRate / 450));
  const maxLag = Math.min(Math.floor(bufferSize / 2), Math.ceil(sampleRate / 65));

  let bestLag = -1;
  let bestCorrelation = -1;

  // Compute normalized autocorrelation across search range
  for (let lag = minLag; lag <= maxLag; lag++) {
    let crossCorr = 0;
    let energy1 = 0;
    let energy2 = 0;

    const testLen = bufferSize - lag;
    // Step by 1 or 2 for performance with 2048 buffer
    for (let i = 0; i < testLen; i += 2) {
      const a = floatBuffer[i];
      const b = floatBuffer[i + lag];
      crossCorr += a * b;
      energy1 += a * a;
      energy2 += b * b;
    }

    const denom = Math.sqrt(energy1 * energy2);
    if (denom > 0.0001) {
      const normCorr = crossCorr / denom;
      if (normCorr > bestCorrelation) {
        bestCorrelation = normCorr;
        bestLag = lag;
      }
    }
  }

  // Periodicity threshold for human voice
  if (bestCorrelation < 0.40 || bestLag <= 0) {
    return -1;
  }

  // Parabolic interpolation around best lag for sub-sample accuracy
  let refinedLag = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    const prevCorr = computeLagCorrelation(floatBuffer, bestLag - 1, bufferSize);
    const nextCorr = computeLagCorrelation(floatBuffer, bestLag + 1, bufferSize);
    const denom = 2 * (2 * bestCorrelation - prevCorr - nextCorr);
    if (Math.abs(denom) > 0.00001) {
      const delta = (nextCorr - prevCorr) / denom;
      if (Math.abs(delta) < 1) {
        refinedLag += delta;
      }
    }
  }

  const pitch = sampleRate / refinedLag;
  if (pitch >= 65 && pitch <= 480) {
    return Math.round(pitch);
  }
  return -1;
}

function computeLagCorrelation(buffer: Float32Array, lag: number, bufferSize: number): number {
  let cross = 0;
  let e1 = 0;
  let e2 = 0;
  const len = bufferSize - lag;
  for (let i = 0; i < len; i += 2) {
    cross += buffer[i] * buffer[i + lag];
    e1 += buffer[i] * buffer[i];
    e2 += buffer[i + lag] * buffer[i + lag];
  }
  const denom = Math.sqrt(e1 * e2);
  return denom > 0.0001 ? cross / denom : 0;
}

// Calculate Spectral Centroid (timbre / brightness of voice)
export function calculateSpectralCentroid(frequencyData: Uint8Array, sampleRate = 44100): number {
  const binCount = frequencyData.length;
  const nyquist = sampleRate / 2;
  const binFreqStep = nyquist / binCount;

  let weightedSum = 0;
  let totalEnergy = 0;

  for (let i = 0; i < binCount; i++) {
    const magnitude = frequencyData[i];
    const frequency = i * binFreqStep;
    weightedSum += frequency * magnitude;
    totalEnergy += magnitude;
  }

  if (totalEnergy === 0) return 1420;
  return Math.round(weightedSum / totalEnergy);
}

// Calculate 4-band Formant / Energy distribution
export function calculateBandEnergyProfile(
  frequencyData: Uint8Array,
  sampleRate = 44100
): [number, number, number, number] {
  const binCount = frequencyData.length;
  const nyquist = sampleRate / 2;
  const binFreqStep = nyquist / binCount;

  let subBass = 0; // 60-300 Hz
  let lowMid = 0; // 300-1500 Hz
  let highMid = 0; // 1500-3500 Hz
  let treble = 0; // 3500 Hz+

  for (let i = 0; i < binCount; i++) {
    const freq = i * binFreqStep;
    const mag = frequencyData[i] / 255;
    if (freq <= 300) {
      subBass += mag;
    } else if (freq <= 1500) {
      lowMid += mag;
    } else if (freq <= 3500) {
      highMid += mag;
    } else {
      treble += mag;
    }
  }

  const total = subBass + lowMid + highMid + treble;
  if (total <= 0.001) {
    return [0.35, 0.38, 0.18, 0.09];
  }

  return [
    Math.round((subBass / total) * 100) / 100,
    Math.round((lowMid / total) * 100) / 100,
    Math.round((highMid / total) * 100) / 100,
    Math.round((treble / total) * 100) / 100,
  ];
}

// Calculate Zero Crossing Rate (ZCR)
export function calculateZeroCrossingRate(timeDomainData: Uint8Array): number {
  let crossings = 0;
  const len = timeDomainData.length;
  for (let i = 1; i < len; i++) {
    const prev = timeDomainData[i - 1] - 128;
    const curr = timeDomainData[i] - 128;
    if ((prev >= 0 && curr < 0) || (prev < 0 && curr >= 0)) {
      crossings++;
    }
  }
  return Math.round((crossings / len) * 100) / 100;
}

// Verify live acoustic metrics against Boss's enrolled voiceprint
export function verifyVoiceBiometrics(
  livePitchHz: number,
  liveCentroid: number,
  liveFormants: [number, number, number, number],
  liveZcr: number,
  profile: BossVoiceprint,
  strictness: 'balanced' | 'high' | 'maximum' = 'balanced',
  isSoloMode = false
): VoiceprintVerificationResult {
  // If not enrolled or Boss voice lock is off, pass with authentic score
  if (!profile.isEnrolled) {
    return {
      isMatch: true,
      similarityScore: 0.95,
      pitchMatchScore: 0.95,
      spectralMatchScore: 0.95,
      formantMatchScore: 0.95,
      reason: 'Biometric lock inactive (Enrolled template not required).',
    };
  }

  // 1. Pitch similarity score
  let pitchScore = 0.6;
  if (livePitchHz > 0) {
    const [minHz, maxHz] = profile.pitchRange;
    const centerPitch = profile.avgPitchHz || 135;

    // Inside enrolled range -> high match
    if (livePitchHz >= minHz - 15 && livePitchHz <= maxHz + 15) {
      const distFromCenter = Math.abs(livePitchHz - centerPitch);
      const span = Math.max(30, (maxHz - minHz) / 2);
      pitchScore = Math.max(0.78, 1.0 - (distFromCenter / (span * 2.5)) * 0.22);
    } else {
      // Outside range -> smooth distance penalty (more lenient in Solo Mode)
      const dist = Math.min(
        Math.abs(livePitchHz - (minHz - 15)),
        Math.abs(livePitchHz - (maxHz + 15))
      );
      const distDivisor = isSoloMode ? 140 : 90;
      pitchScore = Math.max(0, 0.75 - dist / distDivisor);
    }
  } else {
    // If pitch wasn't detected in this snapshot, rely on timbre and formants
    pitchScore = isSoloMode ? 0.85 : 0.70;
  }

  // 2. Spectral Centroid timbre score (logarithmic perception)
  const centroidDiff = Math.abs(liveCentroid - (profile.spectralCentroid || 1420));
  const maxCentroidDiff = Math.max(800, (profile.spectralCentroid || 1420) * (isSoloMode ? 0.85 : 0.65));
  const spectralScore = Math.max(0, 1 - centroidDiff / maxCentroidDiff);

  // 3. Formant 4-band similarity (Cosine distance)
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < 4; i++) {
    const fA = liveFormants[i];
    const fB = profile.formantEnergyProfile[i];
    dotProduct += fA * fB;
    normA += fA * fA;
    normB += fB * fB;
  }
  const cosineSim = normA > 0 && normB > 0 ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0.85;
  const formantScore = Math.min(1, Math.max(0, cosineSim));

  // Multi-factor weighted aggregate: pitch (35%), timbre (35%), formant resonance (30%)
  const combinedScore = pitchScore * 0.35 + spectralScore * 0.35 + formantScore * 0.30;
  const roundedScore = Math.round(combinedScore * 100) / 100;

  // Strictness modifier
  let requiredThreshold = profile.confidenceThreshold || 0.65;
  if (isSoloMode) {
    // In Solo Mode, Boss is alone in the room with no other speakers; lower threshold to accommodate relaxed/quiet speech
    requiredThreshold = Math.min(0.48, (profile.confidenceThreshold || 0.65) * 0.72);
  } else {
    // In Normal Mode, multi-speaker voice discrimination is strictly enforced to isolate Boss from other people in the room
    if (strictness === 'balanced') requiredThreshold = Math.min(0.65, requiredThreshold);
    if (strictness === 'high') requiredThreshold = 0.75;
    if (strictness === 'maximum') requiredThreshold = 0.85;
  }

  const isMatch = roundedScore >= requiredThreshold;

  return {
    isMatch,
    similarityScore: roundedScore,
    pitchMatchScore: Math.round(pitchScore * 100) / 100,
    spectralMatchScore: Math.round(spectralScore * 100) / 100,
    formantMatchScore: Math.round(formantScore * 100) / 100,
    reason: isMatch
      ? isSoloMode
        ? `Solo Mode authenticated: Voice acoustic signature accepted for solitary session (${Math.round(roundedScore * 100)}% match).`
        : `Voiceprint authenticated as ${profile.bossName || 'Boss'} (${Math.round(roundedScore * 100)}% match).`
      : isSoloMode
      ? `Biometric mismatch in Solo Mode: Voice signature score ${Math.round(roundedScore * 100)}% below relaxed threshold ${Math.round(requiredThreshold * 100)}%.`
      : `Biometric mismatch: Voice signature score ${Math.round(roundedScore * 100)}% below required threshold ${Math.round(requiredThreshold * 100)}%. Multi-speaker discrimination active: Voice signature does not match.`,
  };
}
