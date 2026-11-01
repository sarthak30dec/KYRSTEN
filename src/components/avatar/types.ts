/**
 * Kyrsten Digital Avatar Types & Interfaces
 */

export type VisemeType =
  | 'REST'  // Neutral / closed lips
  | 'MBP'   // Closed bilabial (m, b, p)
  | 'FV'    // Labiodental, lower lip under incisors (f, v)
  | 'TH'    // Interdental, tongue between teeth (th, dh)
  | 'TD'    // Alveolar stops (t, d, n)
  | 'KG'    // Velar stops (k, g, ng)
  | 'CHJ'   // Affricates (ch, j, jh)
  | 'SH'    // Post-alveolar fricatives (sh, zh)
  | 'SH_CH' // Post-alveolar fricative / affricate combination (sh, ch)
  | 'SZ'    // Alveolar sibilants (s, z)
  | 'AE'    // Near-open front unrounded (cat, trap, bat)
  | 'AA'    // Open jaw, unrounded open vowels (father, car, hot)
  | 'EH'    // Open-mid front unrounded (bed, bet, dress)
  | 'IH'    // Near-close near-front unrounded (bit, sit, pin)
  | 'IY'    // Close front unrounded (see, fleece, meet)
  | 'AH'    // Open-mid central unrounded (cut, but, run)
  | 'AO'    // Open-mid back rounded (thought, caught, law)
  | 'UH'    // Near-close near-back rounded (foot, good, put)
  | 'UW'    // Close back rounded (goose, two, blue)
  | 'OW'    // Close-mid back rounded (goat, boat, go)
  | 'L'     // Lateral alveolar liquid (love, light, feel)
  | 'R'     // Alveolar approximant (red, right, car)
  | 'W';    // Labio-velar approximant (we, wait, water)

export interface VisemeEvent {
  time: number;       // Seconds from audio start
  viseme: VisemeType; // Target viseme
  duration: number;   // Duration in seconds
  weight: number;     // 0.0 to 1.0 intensity
}

export type AvatarInternalState =
  | 'IDLE'
  | 'THINKING'
  | 'SPEAKING'
  | 'PAUSED'
  | 'ERROR';

export type AvatarEmotion =
  | 'neutral'
  | 'warm'
  | 'happy'
  | 'cheerful'
  | 'amused'
  | 'surprised'
  | 'curious'
  | 'concerned'
  | 'sad'
  | 'serious'
  | 'frustrated'
  | 'thinking';

export interface MouthShape {
  jawOpen: number;         // 0.0 (closed) to 1.0 (wide open)
  mouthWidth: number;      // -0.5 (narrow/pucker) to 0.8 (wide smile)
  mouthRound: number;      // 0.0 (flat) to 1.0 (spherical pucker)
  upperLipLift: number;    // 0.0 to 0.8
  lowerLipDepress: number; // 0.0 to 0.8
  lowerLipTuck: number;    // 0.0 to 1.0 (for F, V)
  smile: number;           // -0.2 (frown) to 0.8 (smile)
  teethVisible: number;    // 0.0 to 1.0
  tongueRaise: number;     // 0.0 to 1.0
}

export interface FacePose {
  pitch: number;           // Head nod up/down (-0.2 to 0.2 rad)
  yaw: number;             // Head turn left/right (-0.3 to 0.3 rad)
  roll: number;            // Head tilt side-to-side (-0.15 to 0.15 rad)
  xOffset: number;         // Horizontal micro-shift
  yOffset: number;         // Vertical breathing shift
  eyeGazeX: number;        // -1.0 (left) to 1.0 (right)
  eyeGazeY: number;        // -1.0 (up) to 1.0 (down)
  blinkLeft: number;       // 0.0 (open) to 1.0 (closed)
  blinkRight: number;      // 0.0 (open) to 1.0 (closed)
  eyebrowLeft: number;     // -0.4 to 0.8 (raised)
  eyebrowRight: number;    // -0.4 to 0.8 (raised)
  emotion: AvatarEmotion;
  mouth: MouthShape;
}

export interface AvatarConfig {
  colorTheme: 'cyan_pulse' | 'emerald_matrix' | 'amber_plasma' | 'electric_violet' | 'quantum_fusion';
  hologramGlow: boolean;
  reducedMotion: boolean;
  showTelemetry: boolean;
}
