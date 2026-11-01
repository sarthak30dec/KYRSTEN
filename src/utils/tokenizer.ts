export interface TokenData {
  text: string;
  type: 'word' | 'punctuation' | 'number' | 'symbol' | 'whitespace';
  index: number;
}

export interface InputTokenAnalysis {
  raw: string;
  tokens: string[];
  detailedTokens: TokenData[];
  tokenCount: number;
  wordCount: number;
  charCount: number;
  estimatedLlmTokens: number;
  lexicalTokens: {
    pronouns: string[];
    questionWords: string[];
    verbs: string[];
    entities: string[];
  };
  timestamp: number;
}

/**
 * Tokenizes raw text input into discrete linguistic and sub-word tokens
 * before any further processing, classification, or LLM execution.
 */
export function tokenizeInput(input: string): InputTokenAnalysis {
  const raw = input || '';
  if (!raw.trim()) {
    return {
      raw: '',
      tokens: [],
      detailedTokens: [],
      tokenCount: 0,
      wordCount: 0,
      charCount: 0,
      estimatedLlmTokens: 0,
      lexicalTokens: {
        pronouns: [],
        questionWords: [],
        verbs: [],
        entities: [],
      },
      timestamp: Date.now(),
    };
  }

  // Regex token matcher for words, numbers, punctuation, and symbols
  const tokenRegex = /([a-zA-Z0-9_]+|[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\s\w])/g;
  const detailedTokens: TokenData[] = [];
  const tokens: string[] = [];

  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = tokenRegex.exec(raw)) !== null) {
    const text = match[0];
    let type: TokenData['type'] = 'symbol';

    if (/^[a-zA-Z_]+$/.test(text)) {
      type = 'word';
    } else if (/^[0-9]+$/.test(text)) {
      type = 'number';
    } else if (/^[.,!?;:'"()\[\]{}\-–—/\\@#$%^&*+=<>~`]$/.test(text)) {
      type = 'punctuation';
    }

    detailedTokens.push({ text, type, index: idx++ });
    tokens.push(text);
  }

  // Categorize lexical patterns for conversational entity and intent mapping
  const pronounSet = new Set(['he', 'him', 'his', 'she', 'her', 'hers', 'they', 'them', 'their', 'theirs', 'it', 'its', 'this', 'that', 'these', 'those', 'who', 'whom', 'whose', 'which', 'what']);
  const questionWordSet = new Set(['what', 'who', 'where', 'when', 'why', 'how', 'which', 'can', 'could', 'would', 'should', 'is', 'are', 'was', 'were', 'do', 'does', 'did']);

  const pronouns: string[] = [];
  const questionWords: string[] = [];
  const entities: string[] = [];
  const verbs: string[] = [];

  tokens.forEach((t) => {
    const lower = t.toLowerCase();
    if (pronounSet.has(lower)) {
      pronouns.push(t);
    }
    if (questionWordSet.has(lower)) {
      questionWords.push(t);
    }
    // Capitalized words that are not the first word of a sentence often indicate named entities
    if (/^[A-Z][a-z0-9]+$/.test(t)) {
      entities.push(t);
    }
  });

  const wordsOnly = detailedTokens.filter((t) => t.type === 'word' || t.type === 'number');
  
  // Approximate BPE subword token estimation (~ 4 chars per token average)
  const estimatedLlmTokens = Math.max(tokens.length, Math.ceil(raw.length / 3.8));

  return {
    raw,
    tokens,
    detailedTokens,
    tokenCount: tokens.length,
    wordCount: wordsOnly.length,
    charCount: raw.length,
    estimatedLlmTokens,
    lexicalTokens: {
      pronouns,
      questionWords,
      verbs,
      entities,
    },
    timestamp: Date.now(),
  };
}
