import { LongTermMemoryItem, MemoryCategory, MemoryImportance } from '../types';

export const LONG_TERM_MEMORY_STORAGE_KEY = 'kyrsten_long_term_memories';

export const DEFAULT_LONG_TERM_MEMORIES: LongTermMemoryItem[] = [
  {
    id: 'mem-default-1',
    key: 'User Preferred Honorific',
    value: 'Boss',
    category: 'preference',
    importance: 'critical',
    source: 'user_manual',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
    accessCount: 12,
    lastRecalledAt: Date.now(),
    tags: ['title', 'identity', 'honorific'],
  },
  {
    id: 'mem-default-2',
    key: 'Core Assistant Directive',
    value: 'Serve as an elite personal assistant with real-time voice, multi-modal MCP tool execution, and high contextual intelligence.',
    category: 'instruction',
    importance: 'critical',
    source: 'user_manual',
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
    accessCount: 8,
    tags: ['directive', 'system'],
  },
  {
    id: 'mem-default-3',
    key: 'Preferred Tech Stack',
    value: 'TypeScript, React 18, Tailwind CSS, Vite, and Node.js with high-performance APIs.',
    category: 'preference',
    importance: 'high',
    source: 'user_manual',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    accessCount: 5,
    tags: ['coding', 'development', 'stack'],
  },
  {
    id: 'mem-default-4',
    key: 'Communication Style',
    value: 'Concise, sharp, highly capable, slightly witty, never overly corporate or sycophantic.',
    category: 'preference',
    importance: 'high',
    source: 'user_manual',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    accessCount: 9,
    tags: ['tone', 'style'],
  },
];

/**
 * Loads memories from localStorage with graceful fallback
 */
export function loadLongTermMemories(): LongTermMemoryItem[] {
  if (typeof window === 'undefined') return DEFAULT_LONG_TERM_MEMORIES;
  try {
    const raw = localStorage.getItem(LONG_TERM_MEMORY_STORAGE_KEY);
    if (!raw) {
      // Initialize default memories if first run
      saveLongTermMemories(DEFAULT_LONG_TERM_MEMORIES);
      return DEFAULT_LONG_TERM_MEMORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_LONG_TERM_MEMORIES;
  } catch (err) {
    console.error('Failed to load long term memories from localStorage:', err);
    return DEFAULT_LONG_TERM_MEMORIES;
  }
}

/**
 * Saves memories list to localStorage
 */
export function saveLongTermMemories(memories: LongTermMemoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LONG_TERM_MEMORY_STORAGE_KEY, JSON.stringify(memories));
  } catch (err) {
    console.error('Failed to save long term memories to localStorage:', err);
  }
}

/**
 * Inserts or updates a memory item in the list and saves to localStorage
 */
export function upsertLongTermMemory(
  item: {
    id?: string;
    key: string;
    value: string;
    category?: MemoryCategory;
    importance?: MemoryImportance;
    source?: LongTermMemoryItem['source'];
    tags?: string[];
  },
  currentMemories?: LongTermMemoryItem[]
): LongTermMemoryItem[] {
  const memories = currentMemories || loadLongTermMemories();
  const normalizedKey = item.key.trim().toLowerCase();

  const existingIndex = memories.findIndex(
    (m) => (item.id && m.id === item.id) || m.key.trim().toLowerCase() === normalizedKey
  );

  let updatedList: LongTermMemoryItem[];
  const now = Date.now();

  if (existingIndex >= 0) {
    const existing = memories[existingIndex];
    const updatedItem: LongTermMemoryItem = {
      ...existing,
      key: item.key.trim(),
      value: item.value.trim(),
      category: item.category || existing.category,
      importance: item.importance || existing.importance,
      source: item.source || existing.source,
      tags: item.tags || existing.tags,
      updatedAt: now,
      accessCount: (existing.accessCount || 0) + 1,
    };
    updatedList = [...memories];
    updatedList[existingIndex] = updatedItem;
  } else {
    const newItem: LongTermMemoryItem = {
      id: item.id || `mem-${now}-${Math.random().toString(36).substring(2, 7)}`,
      key: item.key.trim(),
      value: item.value.trim(),
      category: item.category || 'fact',
      importance: item.importance || 'medium',
      source: item.source || 'user_manual',
      createdAt: now,
      updatedAt: now,
      accessCount: 1,
      tags: item.tags || [],
    };
    updatedList = [newItem, ...memories];
  }

  saveLongTermMemories(updatedList);
  return updatedList;
}

/**
 * Removes a memory item by ID
 */
export function deleteLongTermMemory(id: string, currentMemories?: LongTermMemoryItem[]): LongTermMemoryItem[] {
  const memories = currentMemories || loadLongTermMemories();
  const updatedList = memories.filter((m) => m.id !== id);
  saveLongTermMemories(updatedList);
  return updatedList;
}

/**
 * Searches memories by substring query across key, value, category and tags
 */
export function searchLongTermMemories(query: string, memories: LongTermMemoryItem[]): LongTermMemoryItem[] {
  if (!query.trim()) return memories;
  const q = query.toLowerCase().trim();
  return memories.filter((m) => {
    return (
      m.key.toLowerCase().includes(q) ||
      m.value.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });
}

/**
 * Client-side Automatic Entity & Preference Extractor
 * Automatically identifies user preferences, names, projects, and facts spoken during conversation
 */
export function autoExtractMemoriesFromText(
  userText: string
): Array<{ key: string; value: string; category: MemoryCategory; importance: MemoryImportance }> {
  const text = userText.trim();
  if (text.length < 5) return [];

  const extracted: Array<{ key: string; value: string; category: MemoryCategory; importance: MemoryImportance }> = [];

  // Pattern 1: Explicit remember commands ("remember that X", "keep in mind that X", "never forget that X")
  const rememberMatch = text.match(
    /(?:please\s+)?(?:remember|never forget|keep in mind|note down|save to memory|remember this)\s+(?:that\s+)?(.+)/i
  );
  if (rememberMatch && rememberMatch[1]) {
    const content = rememberMatch[1].replace(/[.!?]+$/, '').trim();
    // Try to split into key/value if contains "is / are / prefer / should be"
    const splitMatch = content.match(/^(.+?)\s+(?:is|are|means|should be|equals)\s+(.+)$/i);
    if (splitMatch) {
      extracted.push({
        key: splitMatch[1].trim(),
        value: splitMatch[2].trim(),
        category: 'fact',
        importance: 'high',
      });
    } else {
      extracted.push({
        key: content.slice(0, 40),
        value: content,
        category: 'instruction',
        importance: 'high',
      });
    }
  }

  // Pattern 2: Preferences ("my favorite X is Y", "I love X", "I prefer X over Y", "I hate X")
  const favMatch = text.match(/(?:my\s+favorite|my\s+fav)\s+([a-zA-Z\s]+?)\s+(?:is|are)\s+(.+?)(?:[.!?]|$)/i);
  if (favMatch) {
    extracted.push({
      key: `Favorite ${favMatch[1].trim()}`,
      value: favMatch[2].trim(),
      category: 'preference',
      importance: 'high',
    });
  }

  const preferMatch = text.match(/I\s+(?:prefer|always prefer|like)\s+(.+?)(?:\s+over|\s+instead of|\s+more than|$|\.)/i);
  if (preferMatch && !favMatch) {
    extracted.push({
      key: `Preference: ${preferMatch[1].slice(0, 30).trim()}`,
      value: preferMatch[1].trim(),
      category: 'preference',
      importance: 'medium',
    });
  }

  // Pattern 3: Identity / Titles ("call me X", "my name is X", "I am X")
  const nameMatch = text.match(/(?:call me|my name is|you can call me)\s+([A-Za-z0-9\s'-]+)(?:[.!?]|$)/i);
  if (nameMatch) {
    extracted.push({
      key: 'User Name / Title',
      value: nameMatch[1].trim(),
      category: 'biography',
      importance: 'critical',
    });
  }

  // Pattern 4: Projects ("I am working on X", "my project is called X", "building a X")
  const projectMatch = text.match(
    /(?:I'm working on|I am building|my current project is|my startup is called|working on a project called)\s+([A-Za-z0-9\s'_-]+)(?:[.!?]|$)/i
  );
  if (projectMatch) {
    extracted.push({
      key: `Project: ${projectMatch[1].trim()}`,
      value: projectMatch[1].trim(),
      category: 'project',
      importance: 'high',
    });
  }

  return extracted;
}
