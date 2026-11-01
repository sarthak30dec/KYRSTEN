import { InputTokenAnalysis } from './utils/tokenizer';
import { InputVectorAnalysis, WordVectorEmbedding } from './utils/vectorEmbeddings';

export type KyrstenState = 'idle' | 'listening' | 'processing' | 'speaking' | 'executing_tool' | 'error' | 'biometric_verifying' | 'biometric_rejected';

export type UITheme = 'cyberpunk' | 'matrix';

export type MemoryCategory = 'preference' | 'entity' | 'project' | 'fact' | 'instruction' | 'biography';
export type MemoryImportance = 'critical' | 'high' | 'medium' | 'low';
export type MemorySource = 'explicit_tool' | 'auto_extracted' | 'user_manual';

export interface LongTermMemoryItem {
  id: string;
  key: string;
  value: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  source: MemorySource;
  createdAt: number;
  updatedAt: number;
  accessCount?: number;
  lastRecalledAt?: number;
  tags?: string[];
}

export interface ToolCallData {
  id: string;
  name: string;
  args: Record<string, any>;
  origin?: string; // 'mcp' | 'skill' | 'builtin' | 'extension'
  serverName?: string;
}

export interface ToolResultData {
  callId: string;
  name: string;
  result: any;
  error?: string;
  executionTimeMs?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  tokens?: InputTokenAnalysis;
  vectorEmbeddings?: InputVectorAnalysis;
  toolCalls?: ToolCallData[];
  toolResults?: ToolResultData[];
  skillUsed?: string;
  audioDuration?: number;
  biometricScore?: number;
  isBiometricMismatch?: boolean;
  diagnostics?: {
    model?: string;
    latencyMs?: number;
    thinkingLevel?: string;
    timeToFirstTokenMs?: number | null;
    finishReason?: string;
    usageMetadata?: any;
    engine?: string;
  };
}

export interface McpToolProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: any;
}

export interface McpToolSchema {
  type: 'object';
  properties: Record<string, McpToolProperty>;
  required?: string[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: McpToolSchema;
  serverOrigin?: string;
}

export interface McpServer {
  id: string;
  name: string;
  endpointUrl: string;
  type: 'http' | 'sse' | 'builtin';
  headers?: Record<string, string>;
  status: 'connected' | 'disconnected' | 'error' | 'loading';
  isEnabled: boolean;
  tools: McpToolDefinition[];
  lastChecked?: number;
  errorMessage?: string;
}

export interface AnthropicSkill {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  systemPromptContribution: string;
  inputSchema: McpToolSchema;
  outputFormat?: string;
  handlerType: 'client_eval' | 'server_endpoint' | 'gemini_prompt';
  handlerCode?: string;
  endpointUrl?: string;
  isEnabled: boolean;
  category: 'utility' | 'analysis' | 'creativity' | 'system' | 'custom';
  icon: string;
}

export interface AudioVisualizerConfig {
  mode: 'orb' | 'frequency_bars' | 'circular_wave' | 'neural_matrix';
  glowIntensity: number;
  colorTheme: 'cyan_pulse' | 'electric_violet' | 'amber_plasma' | 'emerald_matrix' | 'quantum_fusion';
  sensitivity: number;
}

export interface BossVoiceprint {
  isEnrolled: boolean;
  enrolledAt?: number;
  passphrase?: string;
  sampleCount: number;
  avgPitchHz: number;
  pitchRange: [number, number]; // [minHz, maxHz]
  spectralCentroid: number;
  formantEnergyProfile: [number, number, number, number]; // Sub-bass, Low-mid, High-mid, Treble ratios
  zeroCrossingRate: number;
  confidenceThreshold: number; // 0.50 to 0.90 (default 0.70)
  bossName: string; // "Boss"
  lastVerifiedScore?: number;
}

export interface VoiceprintVerificationResult {
  isMatch: boolean;
  similarityScore: number; // 0.0 to 1.0
  pitchMatchScore: number;
  spectralMatchScore: number;
  formantMatchScore: number;
  reason?: string;
}

export interface FeatureExtension {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'automation' | 'developer' | 'productivity' | 'multimodal' | 'custom';
  icon: string;
  isEnabled: boolean;
  author?: string;
  systemInstruction?: string;
  quickPrompts?: Array<{ label: string; prompt: string; icon?: string }>;
  tools?: McpToolDefinition[];
  customHandlerCode?: string;
  createdAt: number;
}

export interface VoiceSettings {
  voiceName: string;
  geminiVoice: 'Aoede' | 'Kore' | 'Leda' | 'Zephyr' | 'Puck' | 'Fenrir' | 'Charon';
  voiceGender: 'female' | 'male';
  pitch: number;
  rate: number;
  volume: number;
  autoSpeak: boolean;
  wakeWordEnabled: boolean;
  wakeWord: string;
  continuousListening: boolean;
  soundEffects: boolean;
  userHonorific: string; // Default: 'Boss'
  bossVoiceLock: boolean; // Require Boss voiceprint verification
  voiceLockStrictness: 'balanced' | 'high' | 'maximum';
}

export interface SystemTelemetry {
  cpuLoad: number;
  memoryUsage: number;
  networkLatency: number;
  activeToolsCount: number;
  activeSkillsCount: number;
  activeExtensionsCount: number;
  voiceLockStatus: 'locked_to_boss' | 'unrestricted' | 'calibrating';
  gameModeActive?: boolean;
  uptime: number;
}

export interface GameModeConfig {
  isEnabled: boolean;
  voiceStandbyActive: boolean;
  throttleFps: number; // 15, 30, or 60
  disableBackgroundParticles: boolean;
  disableHeavyBlooms: boolean;
}

export interface PythonEngineStatus {
  status: 'ONLINE' | 'STANDBY' | 'ERROR';
  engine: string;
  version: string;
  fullVersion?: string;
  pid?: number;
  hasGeminiKey: boolean;
  capabilities: string[];
  vectorDimensions: number;
  latencyMs?: number;
  lastCheckTimestamp: number;
}

export type PythonStatus = PythonEngineStatus;

export interface PythonExecutionResult {
  success?: boolean;
  stdout: string;
  stderr?: string;
  exitCode?: number;
  executionTimeMs?: number;
  engine?: string;
  runtime?: string;
  timestamp?: string;
  error?: string;
  code?: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  streamUrl: string;
  artworkUrl?: string;
  genre?: string;
  source: 'audius' | 'radio' | 'archive' | 'custom' | 'youtube' | 'itunes' | 'web';
  description?: string;
  userUploaded?: boolean;
  youtubeId?: string;
  durationText?: string;
}

export interface MusicStation {
  id: string;
  name: string;
  genre: string;
  description: string;
  coverArt: string;
  streamUrl: string;
  badge?: string;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface MusicPlayerState {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  volume: number; // 0.0 - 1.0
  isMuted: boolean;
  currentTime: number;
  duration: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  queue: MusicTrack[];
  history: MusicTrack[];
  duckingActive: boolean; // lowers volume when assistant is speaking
  isLoading: boolean;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface CalendarTask {
  id: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601 string or YYYY-MM-DDTHH:mm
  endTime: string;   // ISO 8601 string or YYYY-MM-DDTHH:mm
  date: string;      // YYYY-MM-DD
  allDay?: boolean;
  priority: TaskPriority;
  status: TaskStatus;
  color?: string; // hex or semantic color category (e.g. #06b6d4, #10b981, #f59e0b, #ef4444, #8b5cf6)
  category?: 'work' | 'personal' | 'focus' | 'meeting' | 'health' | 'reminder';
  googleEventId?: string;
  syncedWithGoogle?: boolean;
  location?: string;
  attendees?: string[];
  reminderMinutes?: number;
  createdAt: number;
  updatedAt: number;
}

export interface GoogleCalendarAuthStatus {
  isSignedIn: boolean;
  userEmail?: string;
  userName?: string;
  userAvatar?: string;
  accessToken?: string;
  expiresAt?: number;
  calendarId?: string;
  lastSyncedAt?: number;
}


