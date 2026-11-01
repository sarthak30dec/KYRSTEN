// Neural Voice Audio Synthesizer & Player for KYRSTEN
// Exclusively plays Python Neural Voice Synthesizer (Gemini TTS Aoede / custom)

import { extractVisemesFromText } from '../components/avatar/VisemeMapper';
import { AvatarEmotion } from '../components/avatar/types';

interface PlaybackHandles {
  stop: () => void;
}

let activeSourceNode: AudioBufferSourceNode | null = null;
let activeAudioContext: AudioContext | null = null;
let playbackStartTime = 0;
let isCurrentlySpeaking = false;
let voiceOutputAnalyser: AnalyserNode | null = null;
let currentVisemes: any[] = [];
let currentEmotion: AvatarEmotion | null = null;

/**
 * Parses internal emotion/style instructions like [warmly], [happily], [curiously]
 * without ever altering or speaking them aloud.
 */
export function extractEmotionFromText(rawText: string): AvatarEmotion | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const match = rawText.match(/\[(warmly|happily|sadly|excited|angrily|softly|calmly|playfully|curiously|thoughtfully|seriously|cheerfully|surprised|concerned|frustrated|amused|teasing|naughty)\]/i);
  if (match) {
    const tag = match[1].toLowerCase();
    if (tag.includes('warm') || tag.includes('calm') || tag.includes('soft')) return 'warm';
    if (tag.includes('happ') || tag.includes('cheer')) return 'happy';
    if (tag.includes('play') || tag.includes('excit') || tag.includes('amus') || tag.includes('teas') || tag.includes('naught')) return 'amused';
    if (tag.includes('surpris')) return 'surprised';
    if (tag.includes('curio') || tag.includes('thought')) return 'curious';
    if (tag.includes('concern')) return 'concerned';
    if (tag.includes('sad')) return 'sad';
    if (tag.includes('serio')) return 'serious';
    if (tag.includes('angr') || tag.includes('frustrat')) return 'frustrated';
  }
  return null;
}

// Convert base64 PCM 16-bit 24kHz or WAV into AudioBuffer using safe DataView
function pcmBase64ToAudioBuffer(ctx: AudioContext, base64: string, sampleRate = 24000): AudioBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  let offset = 0;
  // If WAV header is present (starts with 'RIFF')
  if (bytes.length >= 44 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    offset = 44;
  }

  const numSamples = Math.floor((bytes.length - offset) / 2);
  const audioBuffer = ctx.createBuffer(1, numSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  const dataView = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < numSamples; i++) {
    const sample = dataView.getInt16(offset + i * 2, true);
    channelData[i] = sample / 32768.0;
  }

  return audioBuffer;
}

export interface NeuralSpeakOptions {
  voiceName?: string;
  geminiVoice?: 'Aoede' | 'Kore' | 'Leda' | 'Zephyr' | 'Puck' | 'Fenrir' | 'Charon';
  rate?: number;
  pitch?: number;
  volume?: number;
  style?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  analyserNode?: AnalyserNode | null;
}

/**
 * Prepares response text for Speech Synthesis:
 * 1. Strips internal emotion / stage direction tags like [warmly], [happily], [excited], [sighs], etc.
 * 2. Removes markdown syntax (code blocks, headers, links)
 * 3. Preserves 100% of spoken words, greetings, names ("Hey Boss"), questions, and cadence.
 */
export function prepareForTTS(responseText: string): string {
  if (!responseText || typeof responseText !== 'string') return '';

  return responseText
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Inline code to plain text
    .replace(/`([^`]+)`/g, '$1')
    // Remove raw URLs
    .replace(/https?:\/\/\S+/gi, '')
    // Markdown link [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bracketed internal emotion/stage directions (e.g. [warmly], [excited], [laughs], [sighs], etc.)
    .replace(/\[(?:warmly|happily|sadly|excited|angrily|softly|calmly|quietly|gently|playfully|curiously|thoughtfully|seriously|cheerfully|teasingly|teasing|naughty|warm|happy|sad|angry|soft|calm|quiet|gentle|playful|curious|thoughtful|serious|cheerful|laughs?|sighs?|gasps?|whispers?|chuckles?|giggles?|groans?|yawns?|clears throat|pauses?|smiles?|grins?|nods?|winks?)(?:\s+[^\]]+)?\]/gi, '')
    // Remove generic bracketed directive tags like [emotion: ...], [tone: ...], [action: ...]
    .replace(/\[(?:emotion|tone|action|voice|style|mood):\s*[^\]]+\]/gi, '')
    // Remove any other bracketed stage/prosody notes at sentence boundaries
    .replace(/\[[a-zA-Z\s,.'"-]{1,30}\]/g, '')
    // Markdown bold / italics
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Markdown list bullets
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    // Clean remaining markup punctuation without affecting spoken words or contractions
    .replace(/[[\]{}~#_>]/g, '')
    // Normalize whitespace while preserving complete spoken words
    .replace(/\s+/g, ' ')
    .trim();
}

// High-Performance In-Memory Audio Cache for instant replays of synthesized neural voice
interface CachedNeuralAudio {
  audioBuffer: AudioBuffer;
  sampleRate: number;
  timestamp: number;
}

const clientAudioCache = new Map<string, CachedNeuralAudio>();

function getClientCacheKey(cleanText: string, voice?: string, style?: string): string {
  return `${cleanText.toLowerCase().trim()}::${(voice || 'Aoede').toLowerCase()}::${(style || '').toLowerCase()}`;
}

export const neuralVoicePlayer = {
  // Stop any active speech or TTS playback
  stop() {
    isCurrentlySpeaking = false;
    currentVisemes = [];
    currentEmotion = null;
    if (activeSourceNode) {
      try {
        activeSourceNode.stop();
        activeSourceNode.disconnect();
      } catch (e) {}
      activeSourceNode = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  },

  // Check if speech text already has cached humanized audio for instant replay
  hasCachedAudio(text: string, voice = 'Aoede'): boolean {
    const cleanText = prepareForTTS(text);
    if (!cleanText) return false;
    return clientAudioCache.has(getClientCacheKey(cleanText, voice));
  },

  // Preload or store audio directly in client cache
  cacheAudio(text: string, base64Audio: string, sampleRate = 24000, voice = 'Aoede') {
    const cleanText = prepareForTTS(text);
    if (!cleanText || !base64Audio) return;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!activeAudioContext || activeAudioContext.state === 'closed') {
        activeAudioContext = new AudioContextClass();
      }
      const buffer = pcmBase64ToAudioBuffer(activeAudioContext, base64Audio, sampleRate);
      clientAudioCache.set(getClientCacheKey(cleanText, voice), {
        audioBuffer: buffer,
        sampleRate,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.warn('[NeuralVoicePlayer] Failed to pre-cache audio:', err);
    }
  },

  // Shared clock and output analyser access for the digital avatar
  getPlaybackClock(): number {
    if (!activeAudioContext || !isCurrentlySpeaking) return 0;
    return Math.max(0, activeAudioContext.currentTime - playbackStartTime);
  },

  getOutputAnalyser(): AnalyserNode | null {
    return voiceOutputAnalyser;
  },

  isPlaying(): boolean {
    return isCurrentlySpeaking;
  },

  getCurrentVisemes(): any[] {
    return currentVisemes;
  },

  getCurrentEmotion(): AvatarEmotion | null {
    return currentEmotion;
  },

  setCurrentVisemes(visemes: any[]) {
    currentVisemes = visemes;
  },

  async fetchVisemesForText(text: string, durationSec: number, audioBase64?: string, sampleRate?: number) {
    if (!text || durationSec <= 0) return;
    try {
      const res = await fetch('/api/avatar/visemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          duration: durationSec,
          audioBase64: audioBase64 || '',
          sampleRate: sampleRate || 24000,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.visemes) && data.visemes.length > 0) {
          currentVisemes = data.visemes;
        }
      }
    } catch {}
  },

  // Main Speak function: EXCLUSIVELY plays humanized neural voice (Gemini TTS)
  // Generic robotic browser speech fallback is permanently disabled
  async speak(text: string, options: NeuralSpeakOptions = {}) {
    this.stop();

    // Extract any contextual emotion directive for avatar expression
    currentEmotion = extractEmotionFromText(text);

    const cleanText = prepareForTTS(text);

    if (!cleanText) {
      options.onEnd?.();
      return;
    }

    const voice = options.geminiVoice || 'Aoede';

    // Extract performance style if specified or inferred from teasing/naughty context
    let style = options.style || '';
    if (!style) {
      if (/\[(?:teasing|naughty)\]/i.test(text) || /\[(?:giggles?|chuckles?)\]/i.test(text)) {
        style = (
          "Speak as Kyrsten, an adult woman with a subtle, clever, teasing tone and a quiet, knowing chuckle. " +
          "Sound amused, witty, and discreet, playfully acknowledging that you overheard their conversation and are gracefully shutting down to give them privacy. " +
          "Read and speak the exact transcript verbatim without skipping words."
        );
      }
    }

    const cacheKey = getClientCacheKey(cleanText, voice, style);

    // Initialize AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!activeAudioContext || activeAudioContext.state === 'closed') {
      activeAudioContext = new AudioContextClass();
    }
    if (activeAudioContext.state === 'suspended') {
      try {
        await activeAudioContext.resume();
      } catch (e) {}
    }

    // Ensure output AnalyserNode for audio visualization and lip sync
    if (!voiceOutputAnalyser || voiceOutputAnalyser.context !== activeAudioContext) {
      try {
        voiceOutputAnalyser = activeAudioContext.createAnalyser();
        voiceOutputAnalyser.fftSize = 256;
        voiceOutputAnalyser.smoothingTimeConstant = 0.5;
      } catch {}
    }

    // 1. INSTANT CLIENT REPLAY CACHE CHECK:
    // If this message was already synthesized, replay it immediately with 0ms latency!
    const cached = clientAudioCache.get(cacheKey);
    if (cached && cached.audioBuffer) {
      options.onStart?.();

      const source = activeAudioContext.createBufferSource();
      source.buffer = cached.audioBuffer;

      const gainNode = activeAudioContext.createGain();
      gainNode.gain.value = options.volume ?? 1.0;

      source.connect(gainNode);
      gainNode.connect(activeAudioContext.destination);

      if (voiceOutputAnalyser) {
        try {
          gainNode.connect(voiceOutputAnalyser);
        } catch {}
      }

      if (options.analyserNode && options.analyserNode !== voiceOutputAnalyser) {
        try {
          gainNode.connect(options.analyserNode);
        } catch {}
      }

      playbackStartTime = activeAudioContext.currentTime;
      isCurrentlySpeaking = true;

      source.onended = () => {
        activeSourceNode = null;
        isCurrentlySpeaking = false;
        currentVisemes = [];
        currentEmotion = null;
        options.onEnd?.();
      };

      // Immediately compute full phonetic visemes at 0ms latency
      currentVisemes = extractVisemesFromText(cleanText, cached.audioBuffer.duration);

      activeSourceNode = source;
      source.start(0);

      // Optionally refine with server viseme extractor if needed
      this.fetchVisemesForText(cleanText, cached.audioBuffer.duration);
      return;
    }

    // 2. FETCH FROM HUMANIZED NEURAL TTS ENDPOINT WITH RETRIES
    // NEVER fall back to generic robotic browser voice
    options.onStart?.();

    const MAX_ATTEMPTS = 3;
    let attempt = 0;
    let audioData: { audioBase64: string; sampleRate?: number } | null = null;
    let lastError: any = null;

    while (attempt < MAX_ATTEMPTS && !audioData) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s window for neural synthesis

      try {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            text: cleanText,
            voice,
            style,
          }),
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.audioBase64) {
            audioData = data;
            break;
          } else if (data.quotaExceeded) {
            lastError = new Error(data.error || 'Neural voice quota limit reached');
            // Do not retry repeatedly when quota is exhausted
            break;
          } else if (data.error) {
            lastError = new Error(data.error);
          }
        } else {
          lastError = new Error(`Server returned ${response.status}`);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;
      }

      // If not succeeded yet, pause briefly before retrying
      if (!audioData && attempt < MAX_ATTEMPTS) {
        await new Promise((res) => setTimeout(res, 350 * attempt));
      }
    }

    // If neural audio was successfully retrieved
    if (audioData && audioData.audioBase64) {
      try {
        const audioBuffer = pcmBase64ToAudioBuffer(
          activeAudioContext,
          audioData.audioBase64,
          audioData.sampleRate || 24000
        );

        // Store in client cache for immediate replay next time
        clientAudioCache.set(cacheKey, {
          audioBuffer,
          sampleRate: audioData.sampleRate || 24000,
          timestamp: Date.now(),
        });

        const source = activeAudioContext.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = activeAudioContext.createGain();
        gainNode.gain.value = options.volume ?? 1.0;

        source.connect(gainNode);
        gainNode.connect(activeAudioContext.destination);

        if (voiceOutputAnalyser) {
          try {
            gainNode.connect(voiceOutputAnalyser);
          } catch {}
        }

        if (options.analyserNode && options.analyserNode !== voiceOutputAnalyser) {
          try {
            gainNode.connect(options.analyserNode);
          } catch {}
        }

        playbackStartTime = activeAudioContext.currentTime;
        isCurrentlySpeaking = true;

        source.onended = () => {
          activeSourceNode = null;
          isCurrentlySpeaking = false;
          currentVisemes = [];
          currentEmotion = null;
          options.onEnd?.();
        };

        // Immediately compute full phonetic visemes at 0ms latency
        currentVisemes = extractVisemesFromText(cleanText, audioBuffer.duration);

        activeSourceNode = source;
        source.start(0);

        // Optionally refine with server viseme extractor if needed
        this.fetchVisemesForText(cleanText, audioBuffer.duration, audioData.audioBase64, audioData.sampleRate);
        return;
      } catch (decodeErr) {
        console.warn('[NeuralVoicePlayer] Audio decode error:', decodeErr);
      }
    }

    // Under no circumstances do we trigger generic robotic browser voices.
    // If neural synthesis failed, gracefully inform caller without robotic audio.
    console.info('[NeuralVoicePlayer] Voice playback note:', lastError?.message || 'deferred');
    options.onError?.(lastError);
    options.onEnd?.();
  },
};

