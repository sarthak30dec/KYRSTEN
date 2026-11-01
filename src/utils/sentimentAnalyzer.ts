// AI Mood & Sentiment Analyzer for KYRSTEN HUD
// Evaluates the most recent assistant message's affective tone, internal emotion tags,
// and linguistic sentiment markers to produce dynamic CSS variable color themes.

export type MoodType =
  | 'playful'
  | 'warm'
  | 'cheerful'
  | 'curious'
  | 'focused'
  | 'alert'
  | 'empathetic';

export interface AIMoodData {
  type: MoodType;
  label: string;
  description: string;
  valence: number; // -1.0 (negative) to +1.0 (positive)
  color: string;
  glow: string;
  bg: string;
  border: string;
  pulseSpeed: 'fast' | 'normal' | 'slow';
  detectedTags?: string[];
  keywordsMatched?: string[];
  summary: string;
}

export const MOOD_DEFINITIONS: Record<MoodType, Omit<AIMoodData, 'detectedTags' | 'keywordsMatched' | 'summary'>> = {
  playful: {
    type: 'playful',
    label: 'Playful',
    description: 'Teasing, witty, and mischievously charming',
    valence: 0.75,
    color: '#ec4899', // Hot Pink / Neon Rose
    glow: 'rgba(236, 72, 153, 0.5)',
    bg: 'rgba(236, 72, 153, 0.14)',
    border: 'rgba(236, 72, 153, 0.4)',
    pulseSpeed: 'normal',
  },
  warm: {
    type: 'warm',
    label: 'Warm',
    description: 'Affectionate, reassuring, and dedicated to Boss',
    valence: 0.85,
    color: '#f59e0b', // Radiant Amber / Warm Gold
    glow: 'rgba(245, 158, 11, 0.5)',
    bg: 'rgba(245, 158, 11, 0.14)',
    border: 'rgba(245, 158, 11, 0.4)',
    pulseSpeed: 'slow',
  },
  cheerful: {
    type: 'cheerful',
    label: 'Cheerful',
    description: 'High-energy, enthusiastic, and delighted',
    valence: 0.95,
    color: '#10b981', // Vibrant Emerald / Neon Mint
    glow: 'rgba(16, 185, 129, 0.5)',
    bg: 'rgba(16, 185, 129, 0.14)',
    border: 'rgba(16, 185, 129, 0.4)',
    pulseSpeed: 'fast',
  },
  curious: {
    type: 'curious',
    label: 'Curious',
    description: 'Inquisitive, analytical, and exploring ideas',
    valence: 0.6,
    color: '#8b5cf6', // Electric Violet / Purple
    glow: 'rgba(139, 92, 246, 0.5)',
    bg: 'rgba(139, 92, 246, 0.14)',
    border: 'rgba(139, 92, 246, 0.4)',
    pulseSpeed: 'normal',
  },
  focused: {
    type: 'focused',
    label: 'Focused',
    description: 'Calm, perceptive, and mission-ready',
    valence: 0.4,
    color: '#06b6d4', // Cyber Cyan / Arc Blue
    glow: 'rgba(6, 182, 212, 0.5)',
    bg: 'rgba(6, 182, 212, 0.14)',
    border: 'rgba(6, 182, 212, 0.4)',
    pulseSpeed: 'slow',
  },
  alert: {
    type: 'alert',
    label: 'Alert',
    description: 'Vigilant, protective, and addressing issues',
    valence: -0.3,
    color: '#f43f5e', // Crimson Coral / Alarm Rose
    glow: 'rgba(244, 63, 94, 0.5)',
    bg: 'rgba(244, 63, 94, 0.14)',
    border: 'rgba(244, 63, 94, 0.4)',
    pulseSpeed: 'fast',
  },
  empathetic: {
    type: 'empathetic',
    label: 'Empathetic',
    description: 'Attentive, gentle, and emotionally resonant',
    valence: 0.5,
    color: '#14b8a6', // Soothing Teal / Mint
    glow: 'rgba(20, 184, 166, 0.5)',
    bg: 'rgba(20, 184, 166, 0.14)',
    border: 'rgba(20, 184, 166, 0.4)',
    pulseSpeed: 'slow',
  },
};

const EMOTION_TAG_MAP: Record<string, MoodType> = {
  teasing: 'playful',
  playfully: 'playful',
  giggles: 'playful',
  chuckles: 'playful',
  naughty: 'playful',
  winks: 'playful',
  mischievous: 'playful',
  warmly: 'warm',
  softly: 'warm',
  gently: 'warm',
  affectionate: 'warm',
  lovingly: 'warm',
  happily: 'cheerful',
  cheerfully: 'cheerful',
  excited: 'cheerful',
  joyfully: 'cheerful',
  smiles: 'cheerful',
  grins: 'cheerful',
  curiously: 'curious',
  thoughtfully: 'curious',
  intrigued: 'curious',
  pondering: 'curious',
  calmly: 'focused',
  seriously: 'focused',
  quietly: 'focused',
  steady: 'focused',
  concerned: 'alert',
  angrily: 'alert',
  frustrated: 'alert',
  warning: 'alert',
  sadly: 'empathetic',
  sighs: 'empathetic',
  sympathetic: 'empathetic',
};

const LEXICAL_PATTERNS: Array<{
  mood: MoodType;
  regex: RegExp;
  keyword: string;
  weight: number;
}> = [
  // Playful / Teasing cues
  { mood: 'playful', regex: /\b(sweet dreams|didn't hear a thing|privacy|two is company|cryptographically sealed|my lips are sealed|take a hint|what happens in this room|blinded|deaf|feigning|graceful exit|third wheel|say less|say no more|teas(ing|e)?|chuckle|giggle|wink)\b/i, keyword: 'playful tease', weight: 4 },
  { mood: 'playful', regex: /\b(have fun|sleep tight|secret|naughty|mischief|cramp your style)\b/i, keyword: 'playful banter', weight: 2 },

  // Warm / Affectionate cues
  { mood: 'warm', regex: /\b(boss|right here whenever you need me|always here|good to see you|take care|take your time|rest well|sleep well|sweet|pleasure|glad|welcome|comfort|peace)\b/i, keyword: 'warm reassurance', weight: 3 },
  { mood: 'warm', regex: /\b(thank you|appreciate|grateful|kind|gentle|warm)\b/i, keyword: 'gratitude/warmth', weight: 2 },

  // Cheerful / Excited cues
  { mood: 'cheerful', regex: /\b(awesome|fantastic|brilliant|wonderful|excellent|super|hyped|celebrate|yay|hurray|love (that|this|it)|great news|amazing)\b/i, keyword: 'enthusiasm', weight: 3.5 },
  { mood: 'cheerful', regex: /!{2,}/, keyword: 'exclamation intensity', weight: 1.5 },

  // Curious / Analytical cues
  { mood: 'curious', regex: /\b(interesting|curious|explore|analyz(e|ing)|investigat(e|ing)|fascinat(ing|ed)|hypothesis|wonder(ing)?|dive into|examine|correlat(e|ion)|pattern)\b/i, keyword: 'inquiry', weight: 3 },
  { mood: 'curious', regex: /\?{1,}/, keyword: 'questioning', weight: 1 },

  // Alert / Protective cues
  { mood: 'alert', regex: /\b(access denied|biometric mismatch|unauthorized|warning|danger|threat|critical|alert|fail(ed|ure)?|error|breach|mismatch|reject(ed)?)\b/i, keyword: 'security alert', weight: 5 },

  // Empathetic cues
  { mood: 'empathetic', regex: /\b(sorry to hear|understand how you feel|breathe|take it easy|no worries|here with you|tough|stress(ed)?|heavy|hard day)\b/i, keyword: 'empathy', weight: 3 },

  // Focused / Mission-Ready cues
  { mood: 'focused', regex: /\b(standing by|initialized|calibrated|scheduled|complete|confirmed|protocol|diagnostics|telemetry|system|engine|ready|execut(ed|ing)|task)\b/i, keyword: 'focused ready', weight: 2 },
];

/**
 * Analyzes the sentiment of the most recent assistant message and returns
 * full mood parameters with colors and CSS variable definitions.
 */
export function analyzeAssistantSentiment(content?: string | null): AIMoodData {
  if (!content || typeof content !== 'string' || !content.trim()) {
    return {
      ...MOOD_DEFINITIONS.focused,
      detectedTags: [],
      keywordsMatched: [],
      summary: 'Standing by in focused equilibrium',
    };
  }

  const rawText = content.trim();
  const lowerText = rawText.toLowerCase();

  // 1. Detect Explicit Bracketed Emotion Tags e.g. [teasing], [warmly], [chuckles]
  const tagMatches = rawText.match(/\[([a-zA-Z\s]{3,20})\]/g);
  const detectedTags: string[] = [];
  let tagMood: MoodType | null = null;

  if (tagMatches) {
    for (const fullTag of tagMatches) {
      const cleanTag = fullTag.replace(/[[\]]/g, '').trim().toLowerCase();
      detectedTags.push(cleanTag);
      if (!tagMood && EMOTION_TAG_MAP[cleanTag]) {
        tagMood = EMOTION_TAG_MAP[cleanTag];
      }
    }
  }

  // 2. Lexical & Keyword Scoring
  const scores: Record<MoodType, number> = {
    playful: 0,
    warm: 0,
    cheerful: 0,
    curious: 0,
    focused: 0,
    alert: 0,
    empathetic: 0,
  };
  const matchedKeywords: string[] = [];

  for (const pattern of LEXICAL_PATTERNS) {
    if (pattern.regex.test(lowerText)) {
      scores[pattern.mood] += pattern.weight;
      if (!matchedKeywords.includes(pattern.keyword)) {
        matchedKeywords.push(pattern.keyword);
      }
    }
  }

  // Give priority to explicit emotion tags if found
  if (tagMood) {
    scores[tagMood] += 6;
  }

  // Determine dominant mood
  let dominantMood: MoodType = 'focused';
  let highestScore = 0;

  for (const mood of Object.keys(scores) as MoodType[]) {
    if (scores[mood] > highestScore) {
      highestScore = scores[mood];
      dominantMood = mood;
    }
  }

  // Fallback defaults if no strong cues matched
  if (highestScore === 0) {
    if (lowerText.includes('?') && lowerText.length > 20) {
      dominantMood = 'curious';
    } else if (lowerText.includes('boss')) {
      dominantMood = 'warm';
    } else {
      dominantMood = 'focused';
    }
  }

  const baseDef = MOOD_DEFINITIONS[dominantMood];

  // Dynamic summary description
  let summary = baseDef.description;
  if (dominantMood === 'playful') {
    summary = 'Teasing & discreetly witty';
  } else if (dominantMood === 'warm') {
    summary = 'Reassuring & devoted';
  } else if (dominantMood === 'alert') {
    summary = 'Protective & alert';
  } else if (dominantMood === 'cheerful') {
    summary = 'Enthusiastic & vibrant';
  } else if (dominantMood === 'curious') {
    summary = 'Inquisitive & analytical';
  }

  return {
    ...baseDef,
    detectedTags,
    keywordsMatched: matchedKeywords,
    summary,
  };
}
