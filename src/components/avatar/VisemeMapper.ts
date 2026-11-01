import { VisemeType, MouthShape, VisemeEvent } from './types';

/**
 * Canonical Mouth Shapes for Kyrsten Visemes
 * Designed for natural, mature human-like lip kinematics with realistic anatomical deformation.
 */
export const CANONICAL_VISEMES: Record<VisemeType, MouthShape> = {
  // Relaxed neutral mouth, lips softly touching with slight warm resting smile
  REST: {
    jawOpen: 0.02,
    mouthWidth: 0.04,
    mouthRound: 0.0,
    upperLipLift: 0.0,
    lowerLipDepress: 0.0,
    lowerLipTuck: 0.0,
    smile: 0.16,
    teethVisible: 0.0,
    tongueRaise: 0.0,
  },

  // Bilabial consonants (M, B, P): lips pressed together, slight compression
  MBP: {
    jawOpen: 0.0,
    mouthWidth: 0.02,
    mouthRound: 0.0,
    upperLipLift: -0.12,
    lowerLipDepress: -0.12,
    lowerLipTuck: 0.0,
    smile: 0.06,
    teethVisible: 0.0,
    tongueRaise: 0.0,
  },

  // Labiodental (F, V): lower lip tucked behind upper incisors
  FV: {
    jawOpen: 0.18,
    mouthWidth: 0.12,
    mouthRound: 0.0,
    upperLipLift: 0.22,
    lowerLipDepress: 0.04,
    lowerLipTuck: 0.95,
    smile: 0.12,
    teethVisible: 0.7,
    tongueRaise: 0.0,
  },

  // Interdental (TH, DH): tongue tip visibly between teeth
  TH: {
    jawOpen: 0.26,
    mouthWidth: 0.18,
    mouthRound: 0.0,
    upperLipLift: 0.24,
    lowerLipDepress: 0.22,
    lowerLipTuck: 0.0,
    smile: 0.18,
    teethVisible: 0.65,
    tongueRaise: 0.95,
  },

  // Alveolar stops (T, D, N): tongue behind upper teeth, moderate aperture
  TD: {
    jawOpen: 0.22,
    mouthWidth: 0.24,
    mouthRound: 0.0,
    upperLipLift: 0.22,
    lowerLipDepress: 0.22,
    lowerLipTuck: 0.0,
    smile: 0.22,
    teethVisible: 0.78,
    tongueRaise: 0.75,
  },

  // Velar stops (K, G, NG): jaw dropped, tongue back
  KG: {
    jawOpen: 0.44,
    mouthWidth: 0.12,
    mouthRound: 0.08,
    upperLipLift: 0.22,
    lowerLipDepress: 0.38,
    lowerLipTuck: 0.0,
    smile: 0.14,
    teethVisible: 0.58,
    tongueRaise: 0.18,
  },

  // Affricates (CH, J): puckered forward, teeth closed
  CHJ: {
    jawOpen: 0.24,
    mouthWidth: -0.16,
    mouthRound: 0.45,
    upperLipLift: 0.32,
    lowerLipDepress: 0.24,
    lowerLipTuck: 0.0,
    smile: 0.12,
    teethVisible: 0.82,
    tongueRaise: 0.4,
  },

  // Post-alveolar fricatives (SH, ZH): rounded, narrow opening
  SH: {
    jawOpen: 0.22,
    mouthWidth: -0.22,
    mouthRound: 0.55,
    upperLipLift: 0.28,
    lowerLipDepress: 0.22,
    lowerLipTuck: 0.0,
    smile: 0.08,
    teethVisible: 0.85,
    tongueRaise: 0.35,
  },

  // Sibilant / Affricate combination (SH, CH, JH)
  SH_CH: {
    jawOpen: 0.23,
    mouthWidth: -0.19,
    mouthRound: 0.50,
    upperLipLift: 0.30,
    lowerLipDepress: 0.23,
    lowerLipTuck: 0.0,
    smile: 0.10,
    teethVisible: 0.84,
    tongueRaise: 0.38,
  },

  // Alveolar sibilants (S, Z): teeth closely approximated for airflow, wide mouth
  SZ: {
    jawOpen: 0.16,
    mouthWidth: 0.38,
    mouthRound: 0.0,
    upperLipLift: 0.2,
    lowerLipDepress: 0.18,
    lowerLipTuck: 0.0,
    smile: 0.32,
    teethVisible: 0.95,
    tongueRaise: 0.3,
  },

  // Near-open front unrounded vowel (cat, trap, bat)
  AE: {
    jawOpen: 0.72,
    mouthWidth: 0.42,
    mouthRound: 0.0,
    upperLipLift: 0.36,
    lowerLipDepress: 0.62,
    lowerLipTuck: 0.0,
    smile: 0.32,
    teethVisible: 0.88,
    tongueRaise: 0.25,
  },

  // Open unrounded vowel (father, palm, car, hot)
  AA: {
    jawOpen: 0.88,
    mouthWidth: 0.14,
    mouthRound: 0.12,
    upperLipLift: 0.38,
    lowerLipDepress: 0.7,
    lowerLipTuck: 0.0,
    smile: 0.12,
    teethVisible: 0.8,
    tongueRaise: 0.1,
  },

  // Open-mid front unrounded (bed, bet, dress)
  EH: {
    jawOpen: 0.48,
    mouthWidth: 0.36,
    mouthRound: 0.0,
    upperLipLift: 0.3,
    lowerLipDepress: 0.42,
    lowerLipTuck: 0.0,
    smile: 0.34,
    teethVisible: 0.8,
    tongueRaise: 0.22,
  },

  // Near-close front unrounded (bit, sit, pin)
  IH: {
    jawOpen: 0.32,
    mouthWidth: 0.46,
    mouthRound: 0.0,
    upperLipLift: 0.26,
    lowerLipDepress: 0.28,
    lowerLipTuck: 0.0,
    smile: 0.42,
    teethVisible: 0.85,
    tongueRaise: 0.35,
  },

  // Close front unrounded (see, meet, fleece): wide smile, high teeth visibility
  IY: {
    jawOpen: 0.22,
    mouthWidth: 0.64,
    mouthRound: 0.0,
    upperLipLift: 0.28,
    lowerLipDepress: 0.22,
    lowerLipTuck: 0.0,
    smile: 0.48,
    teethVisible: 0.92,
    tongueRaise: 0.45,
  },

  // Central vowel (cut, but, run, uh)
  AH: {
    jawOpen: 0.62,
    mouthWidth: 0.1,
    mouthRound: 0.05,
    upperLipLift: 0.26,
    lowerLipDepress: 0.52,
    lowerLipTuck: 0.0,
    smile: 0.12,
    teethVisible: 0.68,
    tongueRaise: 0.12,
  },

  // Open-mid back rounded (thought, caught, law)
  AO: {
    jawOpen: 0.74,
    mouthWidth: -0.22,
    mouthRound: 0.75,
    upperLipLift: 0.42,
    lowerLipDepress: 0.56,
    lowerLipTuck: 0.0,
    smile: 0.02,
    teethVisible: 0.42,
    tongueRaise: 0.1,
  },

  // Near-close back rounded (foot, good, put)
  UH: {
    jawOpen: 0.36,
    mouthWidth: -0.34,
    mouthRound: 0.82,
    upperLipLift: 0.26,
    lowerLipDepress: 0.28,
    lowerLipTuck: 0.0,
    smile: -0.02,
    teethVisible: 0.22,
    tongueRaise: 0.2,
  },

  // Close back rounded (goose, two, blue, oo): small rounded circle aperture
  UW: {
    jawOpen: 0.26,
    mouthWidth: -0.48,
    mouthRound: 0.98,
    upperLipLift: 0.24,
    lowerLipDepress: 0.26,
    lowerLipTuck: 0.0,
    smile: -0.06,
    teethVisible: 0.14,
    tongueRaise: 0.25,
  },

  // Close-mid back rounded diphthong (goat, boat, go)
  OW: {
    jawOpen: 0.64,
    mouthWidth: -0.32,
    mouthRound: 0.86,
    upperLipLift: 0.38,
    lowerLipDepress: 0.48,
    lowerLipTuck: 0.0,
    smile: 0.0,
    teethVisible: 0.32,
    tongueRaise: 0.12,
  },

  // Lateral liquid (love, light, feel): tongue tip raised to upper alveolar ridge
  L: {
    jawOpen: 0.36,
    mouthWidth: 0.22,
    mouthRound: 0.04,
    upperLipLift: 0.26,
    lowerLipDepress: 0.28,
    lowerLipTuck: 0.0,
    smile: 0.22,
    teethVisible: 0.72,
    tongueRaise: 0.95,
  },

  // Alveolar approximant (red, right, car)
  R: {
    jawOpen: 0.38,
    mouthWidth: -0.14,
    mouthRound: 0.45,
    upperLipLift: 0.25,
    lowerLipDepress: 0.3,
    lowerLipTuck: 0.0,
    smile: 0.12,
    teethVisible: 0.62,
    tongueRaise: 0.65,
  },

  // Labio-velar approximant (we, wait, water): tightly rounded lips
  W: {
    jawOpen: 0.24,
    mouthWidth: -0.46,
    mouthRound: 0.95,
    upperLipLift: 0.22,
    lowerLipDepress: 0.24,
    lowerLipTuck: 0.0,
    smile: -0.04,
    teethVisible: 0.12,
    tongueRaise: 0.15,
  },
};

/**
 * Linear interpolation helper with clamp
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Smooth Hermite S-curve interpolation (smoothstep)
 */
export function smoothstep(t: number): number {
  const clampT = Math.max(0, Math.min(1, t));
  return clampT * clampT * (3 - 2 * clampT);
}

/**
 * Smoothly interpolates between two MouthShapes with anatomical co-articulation
 */
export function interpolateMouthShape(a: MouthShape, b: MouthShape, t: number): MouthShape {
  const s = smoothstep(t);
  return {
    jawOpen: lerp(a.jawOpen, b.jawOpen, s),
    mouthWidth: lerp(a.mouthWidth, b.mouthWidth, s),
    mouthRound: lerp(a.mouthRound, b.mouthRound, s),
    upperLipLift: lerp(a.upperLipLift, b.upperLipLift, s),
    lowerLipDepress: lerp(a.lowerLipDepress, b.lowerLipDepress, s),
    lowerLipTuck: lerp(a.lowerLipTuck, b.lowerLipTuck, s),
    smile: lerp(a.smile, b.smile, s),
    teethVisible: lerp(a.teethVisible, b.teethVisible, s),
    tongueRaise: lerp(a.tongueRaise, b.tongueRaise, s),
  };
}

/**
 * English letter-cluster to viseme rules for instant client-side zero-latency alignment
 */
const CLUSTER_RULES: Array<[RegExp, VisemeType, number]> = [
  [/^(mb|mp|bb|pp|mm|b|p|m)/i, 'MBP', 1],
  [/^(ff|ph|f|v)/i, 'FV', 1],
  [/^(th|dh)/i, 'TH', 2],
  [/^(tch|ch|j|dg[eiy])/i, 'CHJ', 2],
  [/^(sh|zh)/i, 'SH', 2],
  [/^(s|z|c[eiy])/i, 'SZ', 1],
  [/^(ee|ea|ey|ie)/i, 'IY', 2],
  [/^(oo|ou|ew)/i, 'UW', 2],
  [/^(oa|ow)/i, 'OW', 2],
  [/^(ai|ay)/i, 'AE', 2],
  [/^(oi|oy)/i, 'AO', 2],
  [/^(ar|er|ir|ur|or)/i, 'R', 2],
  [/^(w|wh)/i, 'W', 1],
  [/^(l|ll)/i, 'L', 1],
  [/^(r|rr)/i, 'R', 1],
  [/^(k|ck|g|q|x|ng)/i, 'KG', 1],
  [/^(t|d|n|tt|dd|nn)/i, 'TD', 1],
  [/^(a)/i, 'AA', 1],
  [/^(e)/i, 'EH', 1],
  [/^(i|y)/i, 'IH', 1],
  [/^(o)/i, 'OW', 1],
  [/^(u)/i, 'AH', 1],
];

/**
 * Converts an English word into a sequential list of visemes
 */
export function wordToVisemes(word: string): VisemeType[] {
  const clean = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (!clean) return ['REST'];

  const visemes: VisemeType[] = [];
  let idx = 0;
  const len = clean.length;

  while (idx < len) {
    const sub = clean.slice(idx);
    let matched = false;

    for (const [pattern, viseme, advance] of CLUSTER_RULES) {
      const match = pattern.exec(sub);
      if (match) {
        visemes.push(viseme);
        idx += Math.max(match[0].length, advance);
        matched = true;
        break;
      }
    }

    if (!matched) {
      visemes.push('AA');
      idx++;
    }
  }

  // Deduplicate consecutive identical visemes
  const deduped: VisemeType[] = [];
  for (const v of visemes) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== v) {
      deduped.push(v);
    }
  }

  return deduped.length > 0 ? deduped : ['REST'];
}

/**
 * Generates an instant, zero-latency viseme timeline from speech text and audio duration.
 * This runs client-side immediately before speech playback begins, ensuring 100% synchronized articulation.
 */
export function extractVisemesFromText(text: string, duration: number): VisemeEvent[] {
  if (!text || duration <= 0) {
    return [{ time: 0, viseme: 'REST', duration: Math.max(0.1, duration), weight: 0 }];
  }

  // Match words and punctuation
  const tokens = text.match(/[\w']+|[.,!?;:]/g);
  if (!tokens || tokens.length === 0) {
    return [{ time: 0, viseme: 'REST', duration, weight: 0 }];
  }

  type TokenItem =
    | { type: 'pause'; durationWeight: number }
    | { type: 'word'; visemes: VisemeType[]; durationWeight: number };

  const items: TokenItem[] = [];
  let totalWeight = 0;

  for (const token of tokens) {
    if (token === '.' || token === '!' || token === '?') {
      const w = 0.28;
      items.push({ type: 'pause', durationWeight: w });
      totalWeight += w;
    } else if (token === ',' || token === ';' || token === ':') {
      const w = 0.16;
      items.push({ type: 'pause', durationWeight: w });
      totalWeight += w;
    } else {
      const vList = wordToVisemes(token);
      const w = Math.max(0.18, vList.length * 0.11 + token.length * 0.035);
      items.push({ type: 'word', visemes: vList, durationWeight: w });
      totalWeight += w;
    }
  }

  if (totalWeight <= 0) totalWeight = 1.0;
  const timeScale = duration / totalWeight;

  const timeline: VisemeEvent[] = [];
  let currentTime = 0.0;

  // Very brief resting breath at onset (e.g. 30ms)
  const initialBreath = Math.min(0.04, duration * 0.03);
  timeline.push({
    time: 0.0,
    viseme: 'REST',
    duration: initialBreath,
    weight: 0.0,
  });
  currentTime += initialBreath;

  for (const item of items) {
    const itemDuration = item.durationWeight * timeScale;
    if (item.type === 'pause') {
      timeline.push({
        time: parseFloat(currentTime.toFixed(3)),
        viseme: 'REST',
        duration: parseFloat(itemDuration.toFixed(3)),
        weight: 0.0,
      });
      currentTime += itemDuration;
    } else {
      const count = item.visemes.length;
      const stepDuration = itemDuration / Math.max(1, count);
      for (const v of item.visemes) {
        timeline.push({
          time: parseFloat(currentTime.toFixed(3)),
          viseme: v,
          duration: parseFloat(stepDuration.toFixed(3)),
          weight: 0.95,
        });
        currentTime += stepDuration;
      }
    }
  }

  // Trailing relaxed rest
  timeline.push({
    time: parseFloat(currentTime.toFixed(3)),
    viseme: 'REST',
    duration: Math.max(0.08, duration - currentTime),
    weight: 0.0,
  });

  return timeline;
}

/**
 * Real-Time Acoustic Spectral Fallback Mapper
 * Converts raw audio frequency data (from AnalyserNode) into realistic mouth kinematics
 * when precomputed phonetic visemes are not yet available.
 */
export function mapAcousticToMouthShape(
  freqData: Uint8Array,
  rmsVolume: number,
  prevShape: MouthShape
): MouthShape {
  // If silence or below speech gate, smoothly return to resting position
  if (rmsVolume < 0.015) {
    return interpolateMouthShape(prevShape, CANONICAL_VISEMES.REST, 0.25);
  }

  const binCount = freqData.length;
  if (binCount === 0) {
    return CANONICAL_VISEMES.REST;
  }

  // Formant energy distribution:
  // Low Formant F1 (200Hz - 900Hz): Jaw drop (open vowels AA, AH, AO)
  // Mid Formant F2 (900Hz - 2500Hz): Frontness & lip spread (EH, IY, IH)
  // High Sibilance F3+ (> 2500Hz): Fricatives, sibilants (SZ, SH, FV)
  let lowSum = 0;
  let midSum = 0;
  let highSum = 0;

  const lowCutoff = Math.floor(binCount * 0.14);
  const midCutoff = Math.floor(binCount * 0.4);

  for (let i = 0; i < lowCutoff; i++) lowSum += freqData[i];
  for (let i = lowCutoff; i < midCutoff; i++) midSum += freqData[i];
  for (let i = midCutoff; i < binCount; i++) highSum += freqData[i];

  const lowEnergy = lowSum / Math.max(1, lowCutoff * 255);
  const midEnergy = midSum / Math.max(1, (midCutoff - lowCutoff) * 255);
  const highEnergy = highSum / Math.max(1, (binCount - midCutoff) * 255);

  const volFactor = Math.min(1.0, rmsVolume * 3.4);

  const targetJaw = Math.min(0.85, lowEnergy * 1.1 + volFactor * 0.55);
  const targetWidth = Math.min(0.55, midEnergy * 0.85 - lowEnergy * 0.25);
  const targetRound = Math.max(0, Math.min(0.8, lowEnergy * 0.85 - midEnergy * 0.7));
  const targetTeeth = Math.min(0.9, highEnergy * 1.25 + targetJaw * 0.55);

  const targetShape: MouthShape = {
    jawOpen: targetJaw,
    mouthWidth: targetWidth,
    mouthRound: targetRound,
    upperLipLift: targetJaw * 0.38,
    lowerLipDepress: targetJaw * 0.62,
    lowerLipTuck: highEnergy > 0.35 && lowEnergy < 0.15 ? 0.5 : 0.0,
    smile: 0.15 + targetWidth * 0.25,
    teethVisible: targetTeeth,
    tongueRaise: midEnergy > 0.45 ? 0.45 : 0.1,
  };

  return interpolateMouthShape(prevShape, targetShape, 0.35);
}
