export interface WordVectorEmbedding {
  word: string;
  type: 'word' | 'punctuation' | 'number' | 'symbol';
  index: number;
  vector: number[]; // e.g. 64-dimensional float vector
  magnitude: number;
  semanticCluster: 'Intent/Action' | 'Entity/Subject' | 'Concept/Object' | 'Query/Question' | 'Modifier/Attribute' | 'Structural/Grammar';
  coordinates2D: { x: number; y: number }; // 2D projection for semantic space visualizer
  similarityToPrompt: number; // Cosine similarity with overall sentence vector
}

export interface InputVectorAnalysis {
  raw: string;
  dimensions: number;
  overallVector: number[];
  wordEmbeddings: WordVectorEmbedding[];
  semanticCentroid: number[];
  semanticCoherence: number;
  dominantSemanticAxis: string;
  cosineMatrix: number[][]; // Pairwise cosine similarity matrix
  timestamp: number;
}

const VECTOR_DIM = 64;

// Semantic seed vectors for foundational lexical dimensions
const SEMANTIC_SEEDS: Record<string, number[]> = {
  action: generateDeterministicVector('action_intent_execute_create_run_make_build', VECTOR_DIM),
  entity: generateDeterministicVector('entity_person_human_subject_actor_who_name', VECTOR_DIM),
  concept: generateDeterministicVector('concept_object_thing_topic_item_file_system', VECTOR_DIM),
  query: generateDeterministicVector('query_question_ask_how_why_what_where_when_search', VECTOR_DIM),
  modifier: generateDeterministicVector('modifier_quality_best_other_more_all_quick_deep', VECTOR_DIM),
  grammar: generateDeterministicVector('grammar_pronoun_he_she_it_they_is_are_of_the', VECTOR_DIM),
};

/**
 * Generates a deterministic high-dimensional unit vector using n-gram hashing and sinusoidal positioning
 */
function generateDeterministicVector(seedText: string, dims: number): number[] {
  const vec = new Array(dims).fill(0);
  const normalized = seedText.toLowerCase().trim();
  
  if (!normalized) return vec;

  // Character n-gram hashing
  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    for (let d = 0; d < dims; d++) {
      const freq = (d + 1) * 0.173;
      const angle = (charCode * (i + 1) * 31 + d * 17) * freq;
      vec[d] += Math.sin(angle) * Math.cos(angle * 0.5);
    }
  }

  // 2-gram and 3-gram subword embeddings
  for (let i = 0; i < normalized.length - 1; i++) {
    const bigramHash = (normalized.charCodeAt(i) << 5) - normalized.charCodeAt(i) + normalized.charCodeAt(i + 1);
    for (let d = 0; d < dims; d++) {
      vec[d] += Math.sin(bigramHash * (d + 1) * 0.05) * 0.5;
    }
  }

  // Normalize to unit sphere (L2 norm)
  return normalizeVector(vec);
}

/**
 * Calculates L2 vector norm (magnitude)
 */
export function vectorMagnitude(vec: number[]): number {
  const sumSq = vec.reduce((sum, val) => sum + val * val, 0);
  return Math.sqrt(sumSq);
}

/**
 * Normalizes vector to unit length
 */
export function normalizeVector(vec: number[]): number[] {
  const mag = vectorMagnitude(vec);
  if (mag === 0) return vec.slice();
  return vec.map((v) => v / mag);
}

/**
 * Calculates Cosine Similarity between two vectors: (A • B) / (|A| * |B|)
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA.length || !vecB.length || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return Math.max(-1, Math.min(1, dotProduct / denom));
}

/**
 * Classifies the semantic cluster of a word vector
 */
function classifySemanticCluster(word: string, vec: number[]): WordVectorEmbedding['semanticCluster'] {
  const lower = word.toLowerCase();
  const questionWords = new Set(['what', 'who', 'where', 'when', 'why', 'how', 'which', 'whose', 'whom', 'can', 'could']);
  const actionWords = new Set(['do', 'search', 'find', 'get', 'show', 'tell', 'explain', 'create', 'generate', 'write', 'open', 'run', 'execute', 'play', 'download', 'set', 'make']);
  const pronouns = new Set(['he', 'him', 'his', 'she', 'her', 'they', 'them', 'their', 'it', 'its', 'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for']);
  const modifiers = new Set(['other', 'more', 'famous', 'best', 'latest', 'notable', 'top', 'new', 'good', 'better', 'all', 'few', 'next', 'previous']);

  if (questionWords.has(lower)) return 'Query/Question';
  if (actionWords.has(lower)) return 'Intent/Action';
  if (pronouns.has(lower)) return 'Structural/Grammar';
  if (modifiers.has(lower)) return 'Modifier/Attribute';
  if (/^[A-Z][a-z0-9]+$/.test(word)) return 'Entity/Subject';

  // Compare cosine similarity with semantic seeds
  const similarities: Record<string, number> = {
    'Intent/Action': cosineSimilarity(vec, SEMANTIC_SEEDS.action),
    'Entity/Subject': cosineSimilarity(vec, SEMANTIC_SEEDS.entity),
    'Concept/Object': cosineSimilarity(vec, SEMANTIC_SEEDS.concept),
    'Query/Question': cosineSimilarity(vec, SEMANTIC_SEEDS.query),
    'Modifier/Attribute': cosineSimilarity(vec, SEMANTIC_SEEDS.modifier),
    'Structural/Grammar': cosineSimilarity(vec, SEMANTIC_SEEDS.grammar),
  };

  let maxCluster: WordVectorEmbedding['semanticCluster'] = 'Concept/Object';
  let maxScore = -Infinity;
  for (const [cluster, score] of Object.entries(similarities)) {
    if (score > maxScore) {
      maxScore = score;
      maxCluster = cluster as WordVectorEmbedding['semanticCluster'];
    }
  }

  return maxCluster;
}

/**
 * Computes vector embeddings for every word and the entire sentence
 */
export function generateInputVectorEmbeddings(input: string): InputVectorAnalysis {
  const raw = input || '';
  if (!raw.trim()) {
    return {
      raw: '',
      dimensions: VECTOR_DIM,
      overallVector: new Array(VECTOR_DIM).fill(0),
      wordEmbeddings: [],
      semanticCentroid: new Array(VECTOR_DIM).fill(0),
      semanticCoherence: 0,
      dominantSemanticAxis: 'Neutral',
      cosineMatrix: [],
      timestamp: Date.now(),
    };
  }

  // 1. Generate full sentence baseline vector
  const overallVector = generateDeterministicVector(raw, VECTOR_DIM);

  // 2. Tokenize into individual words and symbols
  const tokenRegex = /([a-zA-Z0-9_]+|[\uD800-\uDBFF][\uDC00-\uDFFF]|[^\s\w])/g;
  const rawTokens: { text: string; type: WordVectorEmbedding['type'] }[] = [];
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(raw)) !== null) {
    const text = match[0];
    let type: WordVectorEmbedding['type'] = 'symbol';
    if (/^[a-zA-Z_]+$/.test(text)) type = 'word';
    else if (/^[0-9]+$/.test(text)) type = 'number';
    else if (/^[.,!?;:'"()\[\]{}\-–—/\\@#$%^&*+=<>~`]$/.test(text)) type = 'punctuation';
    rawTokens.push({ text, type });
  }

  // 3. Compute vector embeddings for each word with positional & contextual weighting
  const wordEmbeddings: WordVectorEmbedding[] = [];
  const centroidAccum = new Array(VECTOR_DIM).fill(0);

  rawTokens.forEach((tok, index) => {
    const baseVec = generateDeterministicVector(tok.text, VECTOR_DIM);
    
    // Inject positional transformer-style embedding
    const posVec = new Array(VECTOR_DIM).fill(0);
    for (let d = 0; d < VECTOR_DIM; d++) {
      const freq = Math.pow(10000, (2 * Math.floor(d / 2)) / VECTOR_DIM);
      posVec[d] = d % 2 === 0 ? Math.sin((index + 1) / freq) : Math.cos((index + 1) / freq);
    }

    // Contextual blend: 75% word semantic vector + 15% sentence context + 10% position
    const blendedVec = new Array(VECTOR_DIM).fill(0);
    for (let d = 0; d < VECTOR_DIM; d++) {
      blendedVec[d] = baseVec[d] * 0.75 + overallVector[d] * 0.15 + posVec[d] * 0.10;
      centroidAccum[d] += blendedVec[d];
    }
    const finalVector = normalizeVector(blendedVec);
    const simToSentence = cosineSimilarity(finalVector, overallVector);
    const cluster = classifySemanticCluster(tok.text, finalVector);

    // 2D PCA-like projection for visual embedding scatter maps
    // First 2 principal axes approximation
    let projX = 0;
    let projY = 0;
    for (let d = 0; d < VECTOR_DIM; d++) {
      projX += finalVector[d] * Math.cos((d * Math.PI) / 32);
      projY += finalVector[d] * Math.sin((d * Math.PI) / 32);
    }

    wordEmbeddings.push({
      word: tok.text,
      type: tok.type,
      index,
      vector: finalVector,
      magnitude: 1.0,
      semanticCluster: cluster,
      coordinates2D: {
        x: Math.round(projX * 100) / 100,
        y: Math.round(projY * 100) / 100,
      },
      similarityToPrompt: Math.round(simToSentence * 1000) / 1000,
    });
  });

  // 4. Calculate Semantic Centroid & Coherence
  const wordCount = Math.max(1, wordEmbeddings.length);
  const semanticCentroid = normalizeVector(centroidAccum.map((val) => val / wordCount));

  let totalPairwiseSim = 0;
  let pairCount = 0;
  const cosineMatrix: number[][] = [];

  for (let i = 0; i < wordEmbeddings.length; i++) {
    cosineMatrix[i] = [];
    for (let j = 0; j < wordEmbeddings.length; j++) {
      const sim = cosineSimilarity(wordEmbeddings[i].vector, wordEmbeddings[j].vector);
      cosineMatrix[i][j] = Math.round(sim * 1000) / 1000;
      if (i < j) {
        totalPairwiseSim += sim;
        pairCount++;
      }
    }
  }

  const semanticCoherence = pairCount > 0 ? Math.max(0, Math.round((totalPairwiseSim / pairCount) * 100) / 100) : 0.85;

  // Determine dominant semantic axis
  const clusterCounts: Record<string, number> = {};
  wordEmbeddings.forEach((we) => {
    clusterCounts[we.semanticCluster] = (clusterCounts[we.semanticCluster] || 0) + 1;
  });
  let dominantSemanticAxis = 'Intent / Query';
  let maxCount = 0;
  for (const [axis, count] of Object.entries(clusterCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantSemanticAxis = axis;
    }
  }

  return {
    raw,
    dimensions: VECTOR_DIM,
    overallVector,
    wordEmbeddings,
    semanticCentroid,
    semanticCoherence,
    dominantSemanticAxis,
    cosineMatrix,
    timestamp: Date.now(),
  };
}
