/**
 * Kyrsten Animation Atlas Normalized Frame Coordinates & Manifest
 * 
 * Defines the exact normalized bounding boxes (0.0 to 1.0) for every frame
 * in the official Kyrsten animation atlas.
 */

export interface AtlasFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  category: 'base' | 'idle' | 'head' | 'visemes' | 'eyes' | 'expressions' | 'speaking' | 'transitions' | 'overlays';
}

export const ATLAS_FRAME_MANIFEST: Record<string, AtlasFrameRect> = {
  // 1. BASE PORTRAIT (IDLE) - Large master portrait on left
  'base/kyrsten_idle_000': {
    x: 0.018, y: 0.055, w: 0.185, h: 0.300,
    label: 'Base Portrait (Idle)', category: 'base'
  },

  // 2. IDLE ANIMATION (BLINK + SUBTLE MOVEMENT) - 8 frames
  'idle/idle_001': { x: 0.220, y: 0.052, w: 0.062, h: 0.155, category: 'idle' },
  'idle/idle_002': { x: 0.286, y: 0.052, w: 0.062, h: 0.155, category: 'idle' },
  'idle/idle_003': { x: 0.352, y: 0.052, w: 0.062, h: 0.155, category: 'idle' },
  'idle/idle_004': { x: 0.418, y: 0.052, w: 0.062, h: 0.155, category: 'idle' },
  'idle/idle_005': { x: 0.484, y: 0.052, w: 0.062, h: 0.155, category: 'idle' },
  'idle/idle_006': { x: 0.550, y: 0.052, w: 0.062, h: 0.155, category: 'idle' },
  'idle/idle_007': { x: 0.616, y: 0.052, w: 0.062, h: 0.155, category: 'idle' },
  'idle/idle_008': { x: 0.682, y: 0.052, w: 0.062, h: 0.155, category: 'idle' },

  // 3. HEAD MOVEMENT (SUBTLE) - 3 frames
  'head/look_left':   { x: 0.762, y: 0.052, w: 0.072, h: 0.155, category: 'head' },
  'head/look_center': { x: 0.838, y: 0.052, w: 0.072, h: 0.155, category: 'head' },
  'head/look_right':  { x: 0.914, y: 0.052, w: 0.072, h: 0.155, category: 'head' },

  // 4. LIP SYNC (VISEME FRAMES) - 13 mouth close-up frames
  'visemes/viseme_rest':    { x: 0.220, y: 0.278, w: 0.055, h: 0.075, category: 'visemes' },
  'visemes/viseme_mb_p':    { x: 0.279, y: 0.278, w: 0.055, h: 0.075, category: 'visemes' },
  'visemes/viseme_f_v':     { x: 0.338, y: 0.278, w: 0.055, h: 0.075, category: 'visemes' },
  'visemes/viseme_s_z':     { x: 0.397, y: 0.278, w: 0.055, h: 0.075, category: 'visemes' },
  'visemes/viseme_sh_ch':   { x: 0.456, y: 0.278, w: 0.055, h: 0.075, category: 'visemes' },
  'visemes/viseme_aa':      { x: 0.515, y: 0.278, w: 0.055, h: 0.075, category: 'visemes' },
  'visemes/viseme_ah':      { x: 0.574, y: 0.278, w: 0.055, h: 0.075, category: 'visemes' },
  'visemes/viseme_ah_wide': { x: 0.633, y: 0.278, w: 0.055, h: 0.075, category: 'visemes' },
  'visemes/viseme_ih':      { x: 0.692, y: 0.278, w: 0.055, h: 0.075, category: 'visemes' },
  'visemes/viseme_ih_wide': { x: 0.751, y: 0.278, w: 0.055, h: 0.075, category: 'visemes' },
  'visemes/viseme_iy':      { x: 0.810, y: 0.278, w: 0.055, h: 0.075, category: 'visemes' },
  'visemes/viseme_oo':      { x: 0.869, y: 0.278, w: 0.055, h: 0.075, category: 'visemes' },
  'visemes/viseme_ow':      { x: 0.928, y: 0.278, w: 0.055, h: 0.075, category: 'visemes' },

  // 5. EYE ANIMATIONS - 8 eye frames
  'eyes/eye_open':   { x: 0.018, y: 0.425, w: 0.057, h: 0.105, category: 'eyes' },
  'eyes/eye_half':   { x: 0.079, y: 0.425, w: 0.057, h: 0.105, category: 'eyes' },
  'eyes/eye_closed': { x: 0.140, y: 0.425, w: 0.057, h: 0.105, category: 'eyes' },
  'eyes/blink_01':   { x: 0.201, y: 0.425, w: 0.057, h: 0.105, category: 'eyes' },
  'eyes/blink_02':   { x: 0.262, y: 0.425, w: 0.057, h: 0.105, category: 'eyes' },
  'eyes/blink_03':   { x: 0.323, y: 0.425, w: 0.057, h: 0.105, category: 'eyes' },
  'eyes/blink_04':   { x: 0.384, y: 0.425, w: 0.057, h: 0.105, category: 'eyes' },
  'eyes/blink_05':   { x: 0.445, y: 0.425, w: 0.057, h: 0.105, category: 'eyes' },

  // 6. EXPRESSIONS (KEY FRAMES) - 8 bust frames
  'expressions/neutral':   { x: 0.518, y: 0.420, w: 0.056, h: 0.120, category: 'expressions' },
  'expressions/happy':     { x: 0.577, y: 0.420, w: 0.056, h: 0.120, category: 'expressions' },
  'expressions/amused':    { x: 0.636, y: 0.420, w: 0.056, h: 0.120, category: 'expressions' },
  'expressions/curious':   { x: 0.695, y: 0.420, w: 0.056, h: 0.120, category: 'expressions' },
  'expressions/concerned': { x: 0.754, y: 0.420, w: 0.056, h: 0.120, category: 'expressions' },
  'expressions/surprised': { x: 0.813, y: 0.420, w: 0.056, h: 0.120, category: 'expressions' },
  'expressions/serious':   { x: 0.872, y: 0.420, w: 0.056, h: 0.120, category: 'expressions' },
  'expressions/sad':       { x: 0.931, y: 0.420, w: 0.056, h: 0.120, category: 'expressions' },

  // 7. SPEAKING ANIMATION (EXAMPLE SEQUENCE) - 8 bust frames
  'speaking/speak_001': { x: 0.018, y: 0.608, w: 0.058, h: 0.135, category: 'speaking' },
  'speaking/speak_002': { x: 0.080, y: 0.608, w: 0.058, h: 0.135, category: 'speaking' },
  'speaking/speak_003': { x: 0.142, y: 0.608, w: 0.058, h: 0.135, category: 'speaking' },
  'speaking/speak_004': { x: 0.204, y: 0.608, w: 0.058, h: 0.135, category: 'speaking' },
  'speaking/speak_005': { x: 0.266, y: 0.608, w: 0.058, h: 0.135, category: 'speaking' },
  'speaking/speak_006': { x: 0.328, y: 0.608, w: 0.058, h: 0.135, category: 'speaking' },
  'speaking/speak_007': { x: 0.390, y: 0.608, w: 0.058, h: 0.135, category: 'speaking' },
  'speaking/speak_008': { x: 0.452, y: 0.608, w: 0.058, h: 0.135, category: 'speaking' },

  // 8. EMOTIONAL TRANSITIONS - 4 frames
  'transitions/smile_start':   { x: 0.605, y: 0.608, w: 0.070, h: 0.135, category: 'transitions' },
  'transitions/smile_end':     { x: 0.682, y: 0.608, w: 0.070, h: 0.135, category: 'transitions' },
  'transitions/concern_start': { x: 0.836, y: 0.608, w: 0.070, h: 0.135, category: 'transitions' },
  'transitions/concern_end':   { x: 0.913, y: 0.608, w: 0.070, h: 0.135, category: 'transitions' },

  // 9. ADDITIONAL OVERLAYS (OPTIONAL) - 5 square overlays
  'overlays/hologram_glow': { x: 0.020, y: 0.820, w: 0.092, h: 0.125, category: 'overlays' },
  'overlays/scanlines':     { x: 0.118, y: 0.820, w: 0.092, h: 0.125, category: 'overlays' },
  'overlays/particles':     { x: 0.216, y: 0.820, w: 0.092, h: 0.125, category: 'overlays' },
  'overlays/hud_frame':     { x: 0.314, y: 0.820, w: 0.092, h: 0.125, category: 'overlays' },
  'overlays/hologram_fade': { x: 0.412, y: 0.820, w: 0.092, h: 0.125, category: 'overlays' },
};

/**
 * Phoneme / Viseme Type to Atlas Frame Key Mapping
 */
export const PHONEME_TO_ATLAS_FRAME: Record<string, string> = {
  REST: 'visemes/viseme_rest',
  MBP:  'visemes/viseme_mb_p',
  FV:   'visemes/viseme_f_v',
  TH:   'visemes/viseme_s_z',
  TD:   'visemes/viseme_s_z',
  SZ:   'visemes/viseme_s_z',
  CHJ:  'visemes/viseme_sh_ch',
  SH:   'visemes/viseme_sh_ch',
  SH_CH: 'visemes/viseme_sh_ch',
  AA:   'visemes/viseme_aa',
  AE:   'visemes/viseme_aa',
  AH:   'visemes/viseme_ah',
  AO:   'visemes/viseme_ah_wide',
  EH:   'visemes/viseme_iy',
  IH:   'visemes/viseme_ih',
  IY:   'visemes/viseme_iy',
  KG:   'visemes/viseme_ih_wide',
  L:    'visemes/viseme_ih',
  R:    'visemes/viseme_ih',
  UH:   'visemes/viseme_oo',
  UW:   'visemes/viseme_oo',
  W:    'visemes/viseme_oo',
  OW:   'visemes/viseme_ow',
};

/**
 * Emotion to Atlas Expression Frame Mapping
 */
export const EMOTION_TO_ATLAS_FRAME: Record<string, string> = {
  neutral:    'expressions/neutral',
  warm:       'expressions/happy',
  happy:      'expressions/happy',
  cheerful:   'expressions/happy',
  amused:     'expressions/amused',
  curious:    'expressions/curious',
  concerned:  'expressions/concerned',
  surprised:  'expressions/surprised',
  serious:    'expressions/serious',
  sad:        'expressions/sad',
  frustrated: 'expressions/concerned',
  thinking:   'expressions/curious',
};
