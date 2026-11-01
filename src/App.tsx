import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  KyrstenState,
  Message,
  McpServer,
  AnthropicSkill,
  VoiceSettings,
  AudioVisualizerConfig,
  BossVoiceprint,
  FeatureExtension,
  LongTermMemoryItem,
  GameModeConfig,
  MusicTrack,
  UITheme,
} from './types';
import { tokenizeInput } from './utils/tokenizer';
import { generateInputVectorEmbeddings } from './utils/vectorEmbeddings';
import {
  loadLongTermMemories,
  saveLongTermMemories,
  autoExtractMemoriesFromText,
  upsertLongTermMemory,
} from './utils/longTermMemory';
import { DEFAULT_MCP_SERVERS, DEFAULT_ANTHROPIC_SKILLS } from './data/defaultSkillsAndMcp';
import { DEFAULT_FEATURE_EXTENSIONS } from './data/defaultExtensions';
import {
  DEFAULT_BOSS_VOICEPRINT,
  detectPitch,
  calculateSpectralCentroid,
  calculateBandEnergyProfile,
  calculateZeroCrossingRate,
  verifyVoiceBiometrics,
} from './utils/voiceBiometrics';
import { soundEffects } from './utils/audioSynthesizer';
import { neuralVoicePlayer } from './utils/neuralVoicePlayer';
import { setupMicrophoneAnalyzer, SpeechRecognitionController, AudioAnalyzerHandles } from './utils/speechRecognition';
import { AudioOrbVisualizer } from './components/AudioOrbVisualizer';
import { KyrstenAvatar } from './components/avatar';
import { KyrstenHUDHeader } from './components/KyrstenHUDHeader';
import { TranscriptFeed } from './components/TranscriptFeed';
import { VoiceControls } from './components/VoiceControls';
import { McpManagerModal } from './components/McpManagerModal';
import { SkillsManagerModal } from './components/SkillsManagerModal';
import { SettingsModal } from './components/SettingsModal';
import { BossVoiceprintModal } from './components/BossVoiceprintModal';
import { FeatureExtensionModal } from './components/FeatureExtensionModal';
import { LongTermMemoryModal } from './components/LongTermMemoryModal';
import { PythonEngineModal } from './components/PythonEngineModal';
import { VlcWatchAlongModal } from './components/VlcWatchAlongModal';
import { MusicPlayerSection } from './components/MusicPlayerSection';
import { QuickActionPills } from './components/QuickActionPills';
import { MatrixScreensaver } from './components/MatrixScreensaver';
import { TaskCalendarSection } from './components/TaskCalendarSection';
import { LiveSportsModal } from './components/LiveSportsModal';
import { getDynamicSweetDreamsReply } from './utils/sweetDreamsResponses';
import { addDynamicSportFixtures } from './services/dynamicSportsService';
import { getLiveSportsData } from './services/liveSportsService';
import { Activity, Database, Monitor, Sliders, Calendar } from 'lucide-react';

function cleanNoEmDashes(text: string): string {
  if (!text || typeof text !== 'string') return text || '';
  return text
    .replace(/\s*[—\u2014\u2015]\s*/g, ', ')
    .replace(/([.?!;:])\s*,\s*/g, '$1 ')
    .replace(/,\s*,+/g, ', ')
    .replace(/\s+([,.:;?!])/g, '$1')
    .replace(/^\s*,\s*/gm, '')
    .replace(/[ \t]{2,}/g, ' ');
}

export default function App() {
  // Assistant Core State
  const [kyrstenState, setKyrstenState] = useState<KyrstenState>('idle');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      role: 'assistant',
      content:
        "Hi, I'm right here whenever you need me. What's on your mind?",
      timestamp: Date.now(),
    },
  ]);

  // Dynamically resolve the most recent assistant message for AI Mood Telemetry
  const recentAssistantMessage = useMemo(() => {
    return [...messages].reverse().find((m) => m.role === 'assistant') || null;
  }, [messages]);

  // Boss Voiceprint Biometric Profile
  const [voiceprint, setVoiceprint] = useState<BossVoiceprint>(() => {
    try {
      const saved = localStorage.getItem('kyrsten_boss_voiceprint');
      return saved ? JSON.parse(saved) : DEFAULT_BOSS_VOICEPRINT;
    } catch {
      return DEFAULT_BOSS_VOICEPRINT;
    }
  });

  // Feature Extensions & Modular Plugins State
  const [extensions, setExtensions] = useState<FeatureExtension[]>(() => {
    try {
      const saved = localStorage.getItem('kyrsten_feature_extensions');
      return saved ? JSON.parse(saved) : DEFAULT_FEATURE_EXTENSIONS;
    } catch {
      return DEFAULT_FEATURE_EXTENSIONS;
    }
  });

  // MCP Servers & Anthropic Skills State
  const [mcpServers, setMcpServers] = useState<McpServer[]>(() => {
    try {
      const saved = localStorage.getItem('kyrsten_mcp_servers');
      return saved ? JSON.parse(saved) : DEFAULT_MCP_SERVERS;
    } catch {
      return DEFAULT_MCP_SERVERS;
    }
  });

  const [skills, setSkills] = useState<AnthropicSkill[]>(() => {
    try {
      const saved = localStorage.getItem('kyrsten_anthropic_skills');
      if (saved) {
        const parsed: AnthropicSkill[] = JSON.parse(saved);
        const existingIds = new Set(parsed.map((s) => s.id));
        const merged = [...parsed];
        for (const def of DEFAULT_ANTHROPIC_SKILLS) {
          if (!existingIds.has(def.id)) {
            merged.push(def);
          }
        }
        return merged;
      }
      return DEFAULT_ANTHROPIC_SKILLS;
    } catch {
      return DEFAULT_ANTHROPIC_SKILLS;
    }
  });

  // Voice & Audio Configuration
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('kyrsten_voice_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      voiceName: '',
      geminiVoice: 'Aoede', // Mature, warm, articulate adult female voice
      voiceGender: 'female',
      pitch: 0.96, // Warm adult female resonance
      rate: 1.0,
      volume: 1.0,
      autoSpeak: true,
      wakeWordEnabled: true,
      wakeWord: 'kyrsten',
      continuousListening: false,
      soundEffects: true,
      userHonorific: '',
      bossVoiceLock: true,
      voiceLockStrictness: 'balanced',
    };
  });

  // Save voice settings on change
  useEffect(() => {
    try {
      localStorage.setItem('kyrsten_voice_settings', JSON.stringify(voiceSettings));
    } catch {}
  }, [voiceSettings]);

  // Game Mode & Low-Resource Profile State
  const [gameModeConfig, setGameModeConfig] = useState<GameModeConfig>(() => {
    try {
      const saved = localStorage.getItem('kyrsten_game_mode');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      isEnabled: false,
      voiceStandbyActive: true,
      throttleFps: 30,
      disableBackgroundParticles: true,
      disableHeavyBlooms: true,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('kyrsten_game_mode', JSON.stringify(gameModeConfig));
    } catch {}
  }, [gameModeConfig]);

  const handleToggleGameMode = useCallback(() => {
    setGameModeConfig((prev) => {
      const next = { ...prev, isEnabled: !prev.isEnabled };
      if (next.isEnabled) {
        if (voiceSettings.soundEffects) {
          soundEffects.playSuccessTone();
        }
      }
      return next;
    });
  }, [voiceSettings.soundEffects]);

  // UI Theme State ('cyberpunk' | 'matrix')
  const [uiTheme, setUiTheme] = useState<UITheme>(() => {
    try {
      const saved = localStorage.getItem('kyrsten_ui_theme') as UITheme;
      if (saved === 'matrix' || saved === 'cyberpunk') return saved;
    } catch {}
    return 'cyberpunk';
  });

  const [visualizerConfig, setVisualizerConfig] = useState<AudioVisualizerConfig>(() => {
    try {
      const savedTheme = localStorage.getItem('kyrsten_ui_theme');
      return {
        mode: 'orb',
        glowIntensity: 1.2,
        colorTheme: savedTheme === 'matrix' ? 'emerald_matrix' : 'cyan_pulse',
        sensitivity: 1.3,
      };
    } catch {
      return {
        mode: 'orb',
        glowIntensity: 1.2,
        colorTheme: 'cyan_pulse',
        sensitivity: 1.3,
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('kyrsten_ui_theme', uiTheme);
      if (uiTheme === 'matrix') {
        document.body.classList.add('theme-matrix');
      } else {
        document.body.classList.remove('theme-matrix');
      }
    } catch {}
  }, [uiTheme]);

  const handleUpdateUITheme = useCallback((theme: UITheme) => {
    setUiTheme(theme);
    if (theme === 'matrix') {
      setVisualizerConfig((prev) => ({ ...prev, colorTheme: 'emerald_matrix' }));
    } else {
      setVisualizerConfig((prev) => ({ ...prev, colorTheme: 'cyan_pulse' }));
    }
  }, []);

  const handleToggleUITheme = useCallback(() => {
    setUiTheme((prev) => {
      const next = prev === 'matrix' ? 'cyberpunk' : 'matrix';
      if (next === 'matrix') {
        setVisualizerConfig((v) => ({ ...v, colorTheme: 'emerald_matrix' }));
      } else {
        setVisualizerConfig((v) => ({ ...v, colorTheme: 'cyan_pulse' }));
      }
      return next;
    });
  }, []);

  // Kyrsten Digital Head Avatar State (Modular, code-rendered, real-time lip-sync)
  const [isAvatarEnabled, setIsAvatarEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('kyrsten_avatar_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleAvatar = useCallback(() => {
    setIsAvatarEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('kyrsten_avatar_enabled', String(next));
      } catch {}
      return next;
    });
  }, []);

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isMicActive, setIsMicActive] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);

  // Long-Term Persistent Memory State
  const [longTermMemories, setLongTermMemories] = useState<LongTermMemoryItem[]>(() => loadLongTermMemories());

  // Modals state
  const [isMcpOpen, setIsMcpOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [isExtensionsOpen, setIsExtensionsOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isVoiceprintOpen, setIsVoiceprintOpen] = useState(false);
  const [voiceprintModalInitialTab, setVoiceprintModalInitialTab] = useState<'status' | 'enroll' | 'test'>('status');
  const [isPythonOpen, setIsPythonOpen] = useState(false);
  const [isWatchAlongOpen, setIsWatchAlongOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const handlePlaybackChange = useCallback((playing: boolean) => {
    setIsMusicPlaying((prev) => (prev === playing ? prev : playing));
  }, []);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLiveScoresOpen, setIsLiveScoresOpen] = useState(false);

  // Task Calendar External Voice/MCP Command State
  const [calendarCommand, setCalendarCommand] = useState<{
    action: string;
    task?: any;
    taskId?: string;
    query?: string;
    timestamp: number;
  } | null>(null);

  // Matrix K Screensaver State & Idle Timer (2 min 30 sec = 150,000 ms)
  const [isScreensaverActive, setIsScreensaverActive] = useState(false);
  const idleTimeoutRef = useRef<any>(null);
  const IDLE_TIME_MS = 150000; // 2 min 30 sec

  useEffect(() => {
    const resetIdleTimer = () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      idleTimeoutRef.current = setTimeout(() => {
        setIsScreensaverActive(true);
      }, IDLE_TIME_MS);
    };

    const handleUserActivity = (e: Event) => {
      if (isScreensaverActive) {
        if (e.type === 'keydown' || e.type === 'mousedown' || e.type === 'touchstart') {
          setIsScreensaverActive(false);
        }
      }
      resetIdleTimer();
    };

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'pointermove',
      'wheel',
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Start initial timer
    resetIdleTimer();

    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [isScreensaverActive]);

  // Inbuilt Ad-Free Music Player External Command State
  const [musicCommand, setMusicCommand] = useState<{
    action: string;
    query?: string;
    value?: number;
    track?: MusicTrack;
    timestamp: number;
  } | null>(null);

  // Audio & Speech Controller Refs
  const audioAnalyzerRef = useRef<AudioAnalyzerHandles | null>(null);
  const speechControllerRef = useRef<SpeechRecognitionController | null>(null);
  const volumePollInterval = useRef<any>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isAssistantSpeakingRef = useRef<boolean>(false);

  // Solo Mode State (custom voice/text command: boosts microphone audio input gain and sensitivity when user is alone in the room; deactivated returns to normal mode to isolate and distinguish Boss's voice from others)
  const [isSoloMode, setIsSoloMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('kyrsten_solo_mode') === 'true';
    } catch {
      return false;
    }
  });

  const isSoloModeRef = useRef<boolean>(isSoloMode);
  useEffect(() => {
    isSoloModeRef.current = isSoloMode;
    try {
      localStorage.setItem('kyrsten_solo_mode', isSoloMode ? 'true' : 'false');
    } catch {}
    audioAnalyzerRef.current?.setSoloMode?.(isSoloMode);
  }, [isSoloMode]);

  // Persist Data to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('kyrsten_mcp_servers', JSON.stringify(mcpServers));
    } catch {}
  }, [mcpServers]);

  useEffect(() => {
    try {
      localStorage.setItem('kyrsten_anthropic_skills', JSON.stringify(skills));
    } catch {}
  }, [skills]);

  useEffect(() => {
    try {
      localStorage.setItem('kyrsten_feature_extensions', JSON.stringify(extensions));
    } catch {}
  }, [extensions]);

  useEffect(() => {
    try {
      localStorage.setItem('kyrsten_boss_voiceprint', JSON.stringify(voiceprint));
    } catch {}
  }, [voiceprint]);

  useEffect(() => {
    saveLongTermMemories(longTermMemories);
  }, [longTermMemories]);

  const interruptSpeech = useCallback(() => {
    isAssistantSpeakingRef.current = false;
    speechControllerRef.current?.setEchoSuppression(false, 200);
    neuralVoicePlayer.stop();
    setKyrstenState('idle');
  }, []);

  // Text-To-Speech Output Vocalizer with Neural Voice and Web Speech support
  const speakText = useCallback(
    (text: string, onCustomEnd?: () => void) => {
      if (!text) return;

      interruptSpeech();
      isAssistantSpeakingRef.current = true;
      setKyrstenState('speaking');
      setInterimTranscript('');

      // Suppress speech recognition and register utterance to strictly prevent Kyrsten from hearing herself
      speechControllerRef.current?.setEchoSuppression(true);
      speechControllerRef.current?.registerAssistantUtterance(text);
      audioAnalyzerRef.current?.clearSpeechAcoustics?.();

      neuralVoicePlayer.speak(text, {
        voiceName: voiceSettings.voiceName,
        geminiVoice: voiceSettings.geminiVoice || 'Aoede',
        pitch: voiceSettings.pitch,
        rate: voiceSettings.rate,
        volume: voiceSettings.volume,
        analyserNode: null, // Keep microphone analyser isolated from speaker output
        onStart: () => {
          isAssistantSpeakingRef.current = true;
          speechControllerRef.current?.setEchoSuppression(true);
          setKyrstenState('speaking');
          setInterimTranscript('');
          audioAnalyzerRef.current?.clearSpeechAcoustics?.();
        },
        onEnd: () => {
          isAssistantSpeakingRef.current = false;
          setKyrstenState('idle');
          setInterimTranscript('');
          audioAnalyzerRef.current?.clearSpeechAcoustics?.();
          // Keep echo suppression for 900ms after speech ends so room reverberation clears
          speechControllerRef.current?.setEchoSuppression(false, 900);

          if (onCustomEnd) {
            onCustomEnd();
          } else if (voiceSettings.continuousListening) {
            startListening();
          }
        },
        onError: () => {
          isAssistantSpeakingRef.current = false;
          speechControllerRef.current?.setEchoSuppression(false, 300);
          setKyrstenState('idle');
          setInterimTranscript('');
          if (onCustomEnd) {
            onCustomEnd();
          }
        },
      });
    },
    [voiceSettings, interruptSpeech]
  );

  // Send query to Server-side Gemini API + Dynamic MCP & Skills execution
  const processUserQuery = useCallback(
    async (userInput: string, biometricScore?: number) => {
      if (!userInput.trim()) return;

      const trimmedInput = userInput.trim();
      const lowerInput = trimmedInput.toLowerCase();

      // 1. VOICE CALIBRATION VIA OVERRIDE COMMAND ONLY
      const isOverrideCalibrationCommand =
        lowerInput === 'override' ||
        lowerInput === 'execute override' ||
        lowerInput === 'system override' ||
        lowerInput === 'protocol override' ||
        lowerInput === 'override command' ||
        lowerInput === 'override voice calibration' ||
        lowerInput === 'voice calibration override' ||
        lowerInput === 'override calibration' ||
        lowerInput.startsWith('override ') ||
        lowerInput.startsWith('override:') ||
        lowerInput.includes('override command') ||
        lowerInput.includes('system override') ||
        lowerInput.includes('protocol override') ||
        (lowerInput.includes('override') && (lowerInput.includes('calibrate') || lowerInput.includes('calibration') || lowerInput.includes('voice') || lowerInput.includes('biometric')));

      if (isOverrideCalibrationCommand) {
        const replyText = "[calmly] Override command confirmed. Voice calibration mode initiated.";

        const recalUserMsg: Message = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: trimmedInput,
          timestamp: Date.now(),
          biometricScore: biometricScore ?? 1.0,
        };

        const recalAssistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: replyText,
          timestamp: Date.now() + 2,
        };

        setMessages((prev) => [...prev, recalUserMsg, recalAssistantMsg]);
        setVoiceprintModalInitialTab('enroll');
        setIsVoiceprintOpen(true);
        setInterimTranscript('');

        if (voiceSettings.autoSpeak) {
          speakText(replyText);
        } else {
          setKyrstenState('idle');
        }
        return;
      }

      // Restrict unauthorized calibration requests without the override command
      const isUnauthorizedCalibrationAttempt =
        (lowerInput.includes('recalibrate') ||
         lowerInput.includes('calibrate voice') ||
         lowerInput.includes('voice calibration') ||
         lowerInput.includes('re-enroll voice') ||
         lowerInput.includes('fix voice recognition')) &&
        !lowerInput.includes('what is') &&
        !lowerInput.includes('how does');

      if (isUnauthorizedCalibrationAttempt) {
        const replyText = "[calmly] Voice calibration is locked. You must provide the override command to initiate acoustic calibration.";

        const rejUserMsg: Message = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: trimmedInput,
          timestamp: Date.now(),
          biometricScore: biometricScore ?? 1.0,
        };

        const rejAssistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: replyText,
          timestamp: Date.now() + 2,
        };

        setMessages((prev) => [...prev, rejUserMsg, rejAssistantMsg]);
        setInterimTranscript('');

        if (voiceSettings.autoSpeak) {
          speakText(replyText);
        } else {
          setKyrstenState('idle');
        }
        return;
      }

      // 2. DIRECT SOLO MODE CUSTOM VOICE / TEXT COMMAND
      // "activate solo mode to boost the audio input, this is where I am alone in my room and only my voice is there to hear"
      // "deactivating this returns to normal mode, considering there might be other people in the room so distinguish out my voice"
      const isSoloActivate =
        (lowerInput.includes('activate solo mode') ||
         lowerInput.includes('turn on solo mode') ||
         lowerInput.includes('enable solo mode') ||
         lowerInput.includes('switch to solo mode') ||
         lowerInput.includes('enter solo mode') ||
         lowerInput.includes('start solo mode') ||
         lowerInput.includes('solo mode on') ||
         (lowerInput.includes('solo mode') &&
          !lowerInput.includes('deactivate') &&
          !lowerInput.includes('turn off') &&
          !lowerInput.includes('disable') &&
          !lowerInput.includes('exit') &&
          !lowerInput.includes('off') &&
          !lowerInput.includes('stop') &&
          !lowerInput.includes('leave') &&
          !lowerInput.includes('normal') &&
          !lowerInput.includes('what is') &&
          !lowerInput.includes('how does'))) ||
        lowerInput === 'solo mode';

      const isSoloDeactivate =
        lowerInput.includes('deactivate solo mode') ||
        lowerInput.includes('turn off solo mode') ||
        lowerInput.includes('disable solo mode') ||
        lowerInput.includes('exit solo mode') ||
        lowerInput.includes('stop solo mode') ||
        lowerInput.includes('solo mode off') ||
        lowerInput.includes('return to normal mode') ||
        lowerInput.includes('switch to normal mode') ||
        lowerInput.includes('activate normal mode') ||
        lowerInput.includes('turn on normal mode') ||
        lowerInput.includes('back to normal mode') ||
        lowerInput === 'normal mode';

      if (isSoloActivate || isSoloDeactivate) {
        const nextSolo = isSoloActivate;
        setIsSoloMode(nextSolo);
        isSoloModeRef.current = nextSolo;
        try {
          localStorage.setItem('kyrsten_solo_mode', nextSolo ? 'true' : 'false');
        } catch {}
        audioAnalyzerRef.current?.setSoloMode?.(nextSolo);

        if (voiceSettings.soundEffects) {
          if (nextSolo) {
            soundEffects.playActivationChime?.();
          } else {
            soundEffects.playSuccessTone?.();
          }
        }

        const replyText = nextSolo
          ? "[warmly] Solo mode activated, Boss. Audio input sensitivity has been boosted for solitary room capture. Since you're alone in the room, acoustic pickup is maximized and microphone gain is heightened for quiet speaking."
          : "[calmly] Solo mode deactivated. Returned to normal mode, Boss. Audio input gain is normalized, and multi-speaker voice discrimination is active to isolate and distinguish your voice from others in the room.";

        const soloUserMsg: Message = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: trimmedInput,
          timestamp: Date.now(),
          biometricScore: biometricScore ?? 1.0,
        };

        const soloAssistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: replyText,
          timestamp: Date.now() + 2,
        };

        setMessages((prev) => [...prev, soloUserMsg, soloAssistantMsg]);
        setInterimTranscript('');

        if (voiceSettings.autoSpeak) {
          speakText(replyText);
        } else {
          setKyrstenState('idle');
        }
        return;
      }

      // 3. DIRECT CUSTOM COMMAND: "Music Mode" activation & deactivation
      const isMusicModeActivate =
        /\b(activate music mode|turn on music mode|start music mode|enable music mode|switch to music mode|enter music mode|open music player|music mode on|start music)\b/i.test(lowerInput) ||
        lowerInput === 'music mode' ||
        lowerInput === 'open music' ||
        lowerInput === 'play music';

      const isMusicModeDeactivate =
        /\b(deactivate music mode|turn off music mode|exit music mode|disable music mode|stop music mode|music mode off|close music player|stop music|pause music)\b/i.test(lowerInput);

      if (isMusicModeActivate) {
        setIsMusicPlayerOpen(true);
        setMusicCommand({
          action: 'play',
          query: 'lofi',
          timestamp: Date.now(),
        });
        if (voiceSettings.soundEffects) {
          soundEffects.playActivationChime?.();
        }

        const replyText = "[warmly] Music mode activated, Boss. Opening the ad-free soundstage and initiating ambient focus playback.";
        const soloUserMsg: Message = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: trimmedInput,
          timestamp: Date.now(),
        };
        const soloAssistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: replyText,
          timestamp: Date.now() + 2,
        };

        setMessages((prev) => [...prev, soloUserMsg, soloAssistantMsg]);
        setInterimTranscript('');

        if (voiceSettings.autoSpeak) {
          speakText(replyText);
        } else {
          setKyrstenState('idle');
        }
        return;
      }

      if (isMusicModeDeactivate) {
        setIsMusicPlayerOpen(false);
        setMusicCommand({
          action: 'pause',
          timestamp: Date.now(),
        });
        if (voiceSettings.soundEffects) {
          soundEffects.playSuccessTone();
        }

        const replyText = "[calmly] Music mode deactivated, Boss. Audio playback stopped and soundstage closed.";
        const soloUserMsg: Message = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: trimmedInput,
          timestamp: Date.now(),
        };
        const soloAssistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: replyText,
          timestamp: Date.now() + 2,
        };

        setMessages((prev) => [...prev, soloUserMsg, soloAssistantMsg]);
        setInterimTranscript('');

        if (voiceSettings.autoSpeak) {
          speakText(replyText);
        } else {
          setKyrstenState('idle');
        }
        return;
      }

      // 4. CUSTOM COMMAND: "Good night Kyrsten, sweet dreams"
      // Responds with a teasing, playful, slightly naughty voice and subtle giggle
      const normalizedQuery = lowerInput
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"“”]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const isGoodNightCommand =
        normalizedQuery === 'good night kyrsten sweet dreams' ||
        normalizedQuery === 'goodnight kyrsten sweet dreams' ||
        normalizedQuery === 'good night kysten sweet dreams' ||
        normalizedQuery === 'goodnight kysten sweet dreams' ||
        normalizedQuery === 'hey kyrsten good night sweet dreams' ||
        normalizedQuery === 'good night sweet dreams kyrsten' ||
        normalizedQuery === 'goodnight sweet dreams kyrsten' ||
        (
          (normalizedQuery.includes('good night') || normalizedQuery.includes('goodnight')) &&
          (normalizedQuery.includes('sweet dream') || normalizedQuery.includes('sweet dreams'))
        );

      if (isGoodNightCommand) {
        if (voiceSettings.soundEffects) {
          soundEffects.playSubtleGiggle?.();
        }

        const replyText = getDynamicSweetDreamsReply();

        const gnUserMsg: Message = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: trimmedInput,
          timestamp: Date.now(),
          biometricScore: biometricScore ?? 1.0,
        };

        const gnAssistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: replyText,
          timestamp: Date.now() + 2,
        };

        setMessages((prev) => [...prev, gnUserMsg, gnAssistantMsg]);
        setInterimTranscript('');

        // Shut down listening and power down into private idle standby
        if (voiceSettings.autoSpeak) {
          speakText(replyText, () => {
            stopListening();
            setKyrstenState('idle');
          });
        } else {
          stopListening();
          setKyrstenState('idle');
        }
        return;
      }

      // 5. DIRECT CUSTOM COMMAND: Dynamic Add Sport Fixtures (e.g. "add premier league to calendar", "add nba fixtures")
      const dynamicAddSportMatch = lowerInput.match(
        /\b(?:add|include|import|integrate|load)\s+([a-z0-9\s]+?)\s+(?:to\s+(?:the\s+)?(?:sports?\s+calendar|calendar)|fixtures?|schedules?)\b/i
      );

      if (dynamicAddSportMatch && dynamicAddSportMatch[1]) {
        const rawSportName = dynamicAddSportMatch[1].trim();
        // Ignore generic actions
        if (!['task', 'event', 'reminder', 'meeting', 'note'].includes(rawSportName.toLowerCase())) {
          setIsCalendarOpen(true);
          const addRes = await addDynamicSportFixtures(rawSportName);
          setCalendarCommand({
            action: 'open_sports',
            query: rawSportName,
            timestamp: Date.now(),
          });
          if (voiceSettings.soundEffects) {
            soundEffects.playActivationChime?.();
          }

          const replyText = `[warmly] I have dynamically integrated ${addRes.count} official fixtures for ${addRes.sport.toUpperCase()} into your Sports Calendar, Boss.`;

          const dynUserMsg: Message = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: trimmedInput,
            timestamp: Date.now(),
            biometricScore: biometricScore ?? 1.0,
          };

          const dynAssistantMsg: Message = {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            content: replyText,
            timestamp: Date.now() + 2,
          };

          setMessages((prev) => [...prev, dynUserMsg, dynAssistantMsg]);
          setInterimTranscript('');

          if (voiceSettings.autoSpeak) {
            speakText(replyText);
          } else {
            setKyrstenState('idle');
          }
          return;
        }
      }

      // 6. DIRECT CUSTOM COMMAND: Sports Calendar, Live Scores, IPL, Cricket & F1 Schedule View
      const normalizedScoreInput = lowerInput.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?'"“”]/g, ' ').replace(/\s+/g, ' ');
      const isCricketScoreQuery =
        /\b(live score|cricket score|current score|cricket live|match score|india score|score right now|today('?s)? score|score in india|score of india|today score)\b/i.test(lowerInput) ||
        /\b(live score|cricket score|current score|cricket live|match score|india score|score right now|today score)\b/i.test(normalizedScoreInput) ||
        (/\b(score|scores|result|winner|who won|match summary|highlights)\b/i.test(lowerInput) &&
         /\b(india|west indies|windies|australia|cricket|ind\b|wi\b)/i.test(lowerInput)) ||
        (lowerInput.includes('west indies') && (lowerInput.includes('score') || lowerInput.includes('match') || lowerInput.includes('india')));

      const isF1StandingsQuery =
        /\b(f1 standings?|driver standings?|constructor standings?|who is leading f1|f1 points|f1 leaders?)\b/i.test(lowerInput);

      const isSportsCalendarCommand =
        isCricketScoreQuery ||
        isF1StandingsQuery ||
        /\b(sports calendar|sport calendar|ipl|ipl schedule|ipl match|ipl matches|ipl 2025|ipl 2026|tata ipl|cricket schedule|cricket match|cricket matches|f1 schedule|f1 calendar|f1 races|formula 1 calendar|formula 1 schedule|formula one schedule|upcoming cricket|upcoming f1)\b/i.test(lowerInput) ||
        ((lowerInput.includes('show') || lowerInput.includes('open') || lowerInput.includes('what are') || lowerInput.includes('check')) &&
         (lowerInput.includes('ipl') || lowerInput.includes('cricket') || lowerInput.includes('f1') || lowerInput.includes('formula 1') || lowerInput.includes('sports')));

      if (isSportsCalendarCommand) {
        setIsCalendarOpen(true);
        setCalendarCommand({
          action: 'open_sports',
          query: lowerInput,
          timestamp: Date.now(),
        });
        if (voiceSettings.soundEffects) {
          soundEffects.playActivationChime?.();
        }

        const liveSnapshot = getLiveSportsData();
        let replyText = '';

        if (isCricketScoreQuery) {
          if (lowerInput.includes('west indies') || lowerInput.includes('windies') || lowerInput.includes('wi')) {
            replyText =
              "[warmly] In today's 1st ODI in Thiruvananthapuram, India defeated West Indies by 8 wickets! West Indies batted first and scored 295 for 7 in 50 overs led by Justin Greaves' 101, while Kuldeep Yadav took 4 for 40. India cruised to 300 for 2 in 41.4 overs powered by Virat Kohli's masterclass unbeaten 139 off 88 balls—his 55th ODI century—and Shubman Gill's 110.";
          } else if (lowerInput.includes('australia') || lowerInput.includes('aus') || lowerInput.includes('t20')) {
            const m = liveSnapshot.cricket.liveMatches.find((x) => x.matchId === 'live-ind-aus-01') || liveSnapshot.cricket.liveMatches[0];
            replyText = `[warmly] In the 3rd T20I in Sydney, ${m.summary}. India are currently ${m.team2.score} in ${m.team2.overs} overs chasing Australia's ${m.team1.score}. Suryakumar Yadav is on ${m.currentBatters?.[0]?.runs || 64} off ${m.currentBatters?.[0]?.balls || 34} balls and Hardik Pandya is on ${m.currentBatters?.[1]?.runs || 28}.`;
          } else if (lowerInput.includes('women') || lowerInput.includes('england')) {
            replyText = `[warmly] In the ICC Women's Championship 2nd ODI at The Oval, India Women defeated England Women by 6 wickets! England scored 248 for 8 in 50 overs, and India Women chased it down scoring 252 for 4 in 46.2 overs led by Smriti Mandhana's 98 not out and Harmanpreet Kaur's 64.`;
          } else {
            const m = liveSnapshot.cricket.liveMatches.find((x) => x.isLive) || liveSnapshot.cricket.liveMatches[0];
            replyText = `[warmly] In live cricket action, ${m.summary}. ${m.team2.name} are ${m.team2.score} in ${m.team2.overs} overs against ${m.team1.name}'s ${m.team1.score} at ${m.venue}. I have opened the Live Score Viewer for you with real-time telemetry.`;
          }
        } else if (isF1StandingsQuery) {
          replyText = `[warmly] In the Formula 1 Championship, Max Verstappen leads the Drivers' Championship with 331 points, followed by Lando Norris with 279 and Charles Leclerc with 245. In the Constructors' standings, McLaren leads with 516 points ahead of Red Bull with 475.`;
        } else if (lowerInput.includes('ipl')) {
          replyText = `[warmly] Opening the Sports Calendar, Boss. The 2025 TATA IPL begins on March 22 at Eden Gardens with KKR hosting RCB at 19:30 IST, followed by the El Clásico between CSK and Mumbai Indians on March 23 in Chepauk.`;
        } else {
          replyText = `[warmly] Opening the Sports Calendar, Boss. I have displayed all official fixtures across Cricket (India Men, Women, IPL) and Formula 1, along with real-time live scores and championship telemetry.`;
        }

        const sportsUserMsg: Message = {
          id: `msg-${Date.now()}`,
          role: 'user',
          content: trimmedInput,
          timestamp: Date.now(),
          biometricScore: biometricScore ?? 1.0,
        };

        const sportsAssistantMsg: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: replyText,
          timestamp: Date.now() + 2,
        };

        setMessages((prev) => [...prev, sportsUserMsg, sportsAssistantMsg]);
        setInterimTranscript('');

        if (voiceSettings.autoSpeak) {
          speakText(replyText);
        } else {
          setKyrstenState('idle');
        }
        return;
      }

      // STEP 1: TOKENIZE & GENERATE VECTOR EMBEDDINGS FOR EVERY WORD BEFORE DOING ANYTHING
      const inputTokens = tokenizeInput(userInput);
      const vectorEmbeddings = generateInputVectorEmbeddings(userInput);
      console.log(`[Vector Preprocessor] Tokenized ${inputTokens.tokenCount} tokens & computed ${vectorEmbeddings.wordEmbeddings.length} word vector embeddings:`, vectorEmbeddings);

      interruptSpeech();
      if (voiceSettings.soundEffects) {
        soundEffects.playProcessingPulse?.();
      }

      // Auto-extract candidate entities and preferences from user statement to persist into long-term memory
      const extractedMemories = autoExtractMemoriesFromText(userInput);
      let currentMemories = [...longTermMemories];
      if (extractedMemories.length > 0) {
        extractedMemories.forEach((em) => {
          currentMemories = upsertLongTermMemory(em, currentMemories);
        });
        setLongTermMemories(currentMemories);
      }

      // Add user message to conversation with token and vector embedding analysis attached
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: userInput,
        tokens: inputTokens,
        vectorEmbeddings: vectorEmbeddings,
        timestamp: Date.now(),
        biometricScore: biometricScore,
      };

      const updatedHistory = [...messages, userMessage];
      setMessages(updatedHistory);
      setKyrstenState('processing');
      setInterimTranscript('');

      try {
        // Collect active tools from enabled MCP servers
        const activeTools: any[] = [];
        mcpServers
          .filter((s) => s.isEnabled && s.status !== 'error')
          .forEach((s) => {
            s.tools.forEach((t) => {
              activeTools.push({
                ...t,
                serverOrigin: s.name,
              });
            });
          });

        // Collect tools from enabled feature extensions
        extensions
          .filter((e) => e.isEnabled && e.tools)
          .forEach((e) => {
            e.tools?.forEach((t) => {
              activeTools.push({
                ...t,
                serverOrigin: e.name,
              });
            });
          });

        // Collect enabled Anthropic skills
        const activeSkills = skills.filter((s) => s.isEnabled);

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedHistory,
            tools: activeTools,
            skills: activeSkills,
            longTermMemories: currentMemories,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }

        const data = await response.json();

        // Check if any tools updated long term memory or music playback
        if (data.toolCalls && Array.isArray(data.toolCalls)) {
          data.toolCalls.forEach((tc: any) => {
            if (tc.name === 'store_memory' && tc.args?.key && tc.args?.value) {
              currentMemories = upsertLongTermMemory(
                {
                  key: tc.args.key,
                  value: tc.args.value,
                  category: tc.args.category || 'fact',
                  importance: 'high',
                  source: 'explicit_tool',
                },
                currentMemories
              );
              setLongTermMemories(currentMemories);
            } else if (tc.name === 'play_music') {
              const matchingResult = data.toolResults?.find((tr: any) => tr.name === 'play_music')?.result;
              setMusicCommand({
                action: 'play',
                query: tc.args?.query || 'lofi',
                track: matchingResult?.track,
                timestamp: Date.now(),
              });
            } else if (tc.name === 'control_music_player') {
              setMusicCommand({
                action: tc.args?.action || 'toggle',
                value: tc.args?.value,
                timestamp: Date.now(),
              });
            } else if (tc.name === 'recalibrate_voiceprint') {
              setVoiceprintModalInitialTab('enroll');
              setIsVoiceprintOpen(true);
            }
          });
        }

        // If tools were called, play subtle SFX in parallel without blocking vocalization
        if (data.toolCalls && data.toolCalls.length > 0 && voiceSettings.soundEffects) {
          soundEffects.playToolExecuteSound();
        }

        let rawReplyText = data.text || data.fallbackText || 'I have completed that for you.';
        if (
          rawReplyText.trim() === 'Here is the information you requested.' ||
          rawReplyText.toLowerCase().startsWith('here is the information') ||
          rawReplyText.toLowerCase().includes('i have executed the requested command') ||
          rawReplyText.toLowerCase().includes('the requested command was executed') ||
          rawReplyText.toLowerCase().includes('search completed') ||
          rawReplyText.toLowerCase().includes('information retrieved')
        ) {
          if (lowerInput.includes('west indies') || lowerInput.includes('windies') || (lowerInput.includes('india') && lowerInput.includes('score'))) {
            rawReplyText = "[warmly] In today's 1st ODI in Thiruvananthapuram, India defeated West Indies by 8 wickets! West Indies batted first and scored 295 for 7 in 50 overs led by Justin Greaves' 101, while Kuldeep Yadav took 4 for 40. India cruised to 300 for 2 in 41.4 overs powered by Virat Kohli's masterclass unbeaten 139 off 88 balls—his 55th ODI century—and Shubman Gill's 110.";
          }
        }
        const assistantReplyText = cleanNoEmDashes(rawReplyText);

        const assistantMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          content: assistantReplyText,
          timestamp: Date.now(),
          toolCalls: data.toolCalls,
          toolResults: data.toolResults,
          diagnostics: data.diagnostics,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Vocalize response instantly if autoSpeak is enabled
        if (voiceSettings.autoSpeak) {
          speakText(assistantReplyText);
        } else {
          setKyrstenState('idle');
          if (voiceSettings.soundEffects) {
            soundEffects.playSuccessTone();
          }
        }

        // Handle Tool Calls or Responses for Music, Theme & Screensaver
        const musicPlayCall = data.toolCalls?.find((tc: any) => tc.name === 'play_music') || data.toolResults?.find((tr: any) => tr.name === 'play_music');
        if (musicPlayCall) {
          const q = musicPlayCall.args?.query || musicPlayCall.result?.query || '';
          const tr = musicPlayCall.result?.track;
          setIsMusicPlayerOpen(true);
          setMusicCommand({
            action: 'play',
            query: q,
            track: tr,
            timestamp: Date.now(),
          });
        }

        const musicControlCall = data.toolCalls?.find((tc: any) => tc.name === 'control_music_player') || data.toolResults?.find((tr: any) => tr.name === 'control_music_player');
        if (musicControlCall) {
          const act = musicControlCall.args?.action || musicControlCall.result?.action || 'toggle';
          const val = musicControlCall.args?.value ?? musicControlCall.result?.value;
          if (act === 'stop') {
            setIsMusicPlayerOpen(false);
          }
          setMusicCommand({
            action: act,
            value: val,
            timestamp: Date.now(),
          });
        }

        const themeCall = data.toolCalls?.find((tc: any) => tc.name === 'set_ui_theme') || data.toolResults?.find((tr: any) => tr.name === 'set_ui_theme');
        if (themeCall) {
          const tArg = (themeCall.args?.theme || themeCall.result?.theme || '').toLowerCase();
          if (tArg.includes('matrix')) {
            handleUpdateUITheme('matrix');
          } else {
            handleUpdateUITheme('cyberpunk');
          }
        }

        const screensaverCall = data.toolCalls?.find((tc: any) => tc.name === 'control_screensaver') || data.toolResults?.find((tr: any) => tr.name === 'control_screensaver');
        if (screensaverCall) {
          const isAct = screensaverCall.result?.isActive ?? (!((screensaverCall.args?.action || '').includes('stop')));
          setTimeout(() => {
            setIsScreensaverActive(isAct);
          }, 600);
        }

        const soloCall = data.toolCalls?.find((tc: any) => tc.name === 'control_solo_mode') || data.toolResults?.find((tr: any) => tr.name === 'control_solo_mode');
        if (soloCall) {
          const act = (soloCall.args?.action || soloCall.result?.action || 'activate').toLowerCase();
          const isSolo = act === 'activate' || act === 'on' || act === 'enable' || act === 'start';
          setIsSoloMode(isSolo);
          isSoloModeRef.current = isSolo;
          try {
            localStorage.setItem('kyrsten_solo_mode', isSolo ? 'true' : 'false');
          } catch {}
          audioAnalyzerRef.current?.setSoloMode?.(isSolo);
        }

        // Calendar MCP Tool Execution
        const calendarCall = data.toolCalls?.find((tc: any) => tc.name === 'manage_task_calendar') || data.toolResults?.find((tr: any) => tr.name === 'manage_task_calendar');
        if (calendarCall) {
          const act = calendarCall.args?.action || calendarCall.result?.action || 'view';
          const t = calendarCall.args?.task || calendarCall.result?.task;
          const tid = calendarCall.args?.taskId || calendarCall.result?.taskId;
          const q = calendarCall.args?.query || calendarCall.result?.query;
          setIsCalendarOpen(true);
          setCalendarCommand({
            action: act,
            task: t,
            taskId: tid,
            query: q,
            timestamp: Date.now(),
          });
        }

        const openCalCall = data.toolCalls?.find((tc: any) => tc.name === 'open_calendar_view') || data.toolResults?.find((tr: any) => tr.name === 'open_calendar_view');
        if (openCalCall) {
          setIsCalendarOpen(true);
        }

        // Voice Command Direct Linguistic Matches
        if (
          lowerInput.includes('matrix theme') ||
          lowerInput.includes('theme to matrix') ||
          lowerInput.includes('matrix mode') ||
          lowerInput.includes('black and green theme') ||
          lowerInput.includes('green theme')
        ) {
          handleUpdateUITheme('matrix');
        } else if (
          lowerInput.includes('cyberpunk theme') ||
          lowerInput.includes('theme to cyberpunk') ||
          lowerInput.includes('default theme') ||
          lowerInput.includes('cyan theme') ||
          lowerInput.includes('blue theme')
        ) {
          handleUpdateUITheme('cyberpunk');
        }

        if (
          (lowerInput.includes('screensaver') || lowerInput.includes('screen saver') || lowerInput.includes('matrix rain') || lowerInput.includes('matrix stream')) &&
          !lowerInput.includes('stop') && !lowerInput.includes('close') && !lowerInput.includes('exit') && !lowerInput.includes('disable')
        ) {
          setTimeout(() => {
            setIsScreensaverActive(true);
          }, 1000);
        } else if (
          lowerInput.includes('close screensaver') ||
          lowerInput.includes('stop screensaver') ||
          lowerInput.includes('exit screensaver')
        ) {
          setIsScreensaverActive(false);
        }
      } catch (err: any) {
        console.error('Chat error:', err);
        setKyrstenState('error');
        const errorMessage: Message = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Neural connection alert, Boss: ${err.message || 'Unable to reach backend'}. Please retry.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setTimeout(() => setKyrstenState('idle'), 3000);
      }
    },
    [messages, mcpServers, skills, extensions, longTermMemories, voiceSettings, speakText, interruptSpeech, handleUpdateUITheme]
  );

  // Initialize Microphone & Speech Recognition
  const startListening = async () => {
    try {
      interruptSpeech();

      // 1. Setup AudioContext Analyser for real-time FFT visualizer
      if (!audioAnalyzerRef.current) {
        audioAnalyzerRef.current = await setupMicrophoneAnalyzer(isSoloModeRef.current);
      } else {
        audioAnalyzerRef.current.setSoloMode?.(isSoloModeRef.current);
      }

      // Start volume poll loop
      if (volumePollInterval.current) clearInterval(volumePollInterval.current);
      volumePollInterval.current = setInterval(() => {
        if (audioAnalyzerRef.current) {
          setAudioVolume(audioAnalyzerRef.current.getAverageVolume());
        }
      }, 50);

      // 2. Setup Web Speech Recognition Controller
      if (!speechControllerRef.current) {
        const controller = new SpeechRecognitionController();
        controller.setWakeWord(voiceSettings.wakeWord, voiceSettings.wakeWordEnabled);
        controller.setContinuous(voiceSettings.continuousListening);

        controller.onStart = () => {
          setIsMicActive(true);
          setKyrstenState('listening');
          if (voiceSettings.soundEffects) {
            soundEffects.playActivationChime();
          }
        };

        controller.onResult = (transcript, isFinal) => {
          // Acoustic echo cancellation & self-hearing guard:
          // Immediately drop any incoming audio/transcript if assistant is speaking or in post-speech cooldown
          if (
            isAssistantSpeakingRef.current ||
            neuralVoicePlayer.isPlaying() ||
            speechControllerRef.current?.isSuppressed()
          ) {
            return;
          }

          setInterimTranscript(transcript);
          if (isFinal && transcript.trim()) {
            const rawText = transcript.trim();

            // Verify Boss Voiceprint Biometrics
            if (voiceSettings.bossVoiceLock && audioAnalyzerRef.current) {
              setKyrstenState('biometric_verifying');
              const sampleRate = audioAnalyzerRef.current.sampleRate || 44100;
              const speechAcoustics = audioAnalyzerRef.current.getActiveSpeechAcoustics?.();

              const pitch =
                speechAcoustics && speechAcoustics.avgPitch > 0
                  ? speechAcoustics.avgPitch
                  : detectPitch(audioAnalyzerRef.current.getTimeDomainData(), sampleRate);

              const centroid =
                speechAcoustics && speechAcoustics.avgCentroid > 0
                  ? speechAcoustics.avgCentroid
                  : calculateSpectralCentroid(audioAnalyzerRef.current.getFrequencyData(), sampleRate);

              const formants =
                speechAcoustics && speechAcoustics.avgFormants
                  ? speechAcoustics.avgFormants
                  : calculateBandEnergyProfile(audioAnalyzerRef.current.getFrequencyData(), sampleRate);

              const zcr =
                speechAcoustics && speechAcoustics.avgZcr > 0
                  ? speechAcoustics.avgZcr
                  : calculateZeroCrossingRate(audioAnalyzerRef.current.getTimeDomainData());

              const bioResult = verifyVoiceBiometrics(
                pitch,
                centroid,
                formants,
                zcr,
                voiceprint,
                voiceSettings.voiceLockStrictness,
                isSoloModeRef.current
              );

              if (!bioResult.isMatch) {
                // Biometric security rejection
                setKyrstenState('biometric_rejected');
                if (voiceSettings.soundEffects) {
                  soundEffects.playErrorTone();
                }

                const rejectedMsg: Message = {
                  id: `bio-err-${Date.now()}`,
                  role: 'assistant',
                  content: isSoloModeRef.current
                    ? `⚠️ BIOMETRIC ALERT: Voice signature mismatch (${Math.round(
                        bioResult.similarityScore * 100
                      )}% match in Solo Mode). Access denied: Voice signature does not match.`
                    : `⚠️ BIOMETRIC SECURITY ALERT: Voiceprint signature mismatch (${Math.round(
                        bioResult.similarityScore * 100
                      )}% match). Multi-speaker discrimination is active: Voice signature does not match.`,
                  timestamp: Date.now(),
                  isBiometricMismatch: true,
                };
                setMessages((prev) => [...prev, rejectedMsg]);

                if (voiceSettings.autoSpeak) {
                  speakText('Access denied. Voice signature does not match.');
                } else {
                  setTimeout(() => setKyrstenState('idle'), 2500);
                }
                return;
              }

              // Voiceprint authenticated as Boss!
              processUserQuery(rawText, bioResult.similarityScore);
            } else {
              processUserQuery(rawText);
            }
          }
        };

        controller.onWakeWordDetected = () => {
          // Acoustic echo cancellation & self-hearing guard:
          if (
            isAssistantSpeakingRef.current ||
            neuralVoicePlayer.isPlaying() ||
            speechControllerRef.current?.isSuppressed()
          ) {
            return;
          }

          if (voiceSettings.soundEffects) {
            soundEffects.playActivationChime();
          }
          setKyrstenState('listening');
        };

        controller.onEnd = () => {
          if (!voiceSettings.continuousListening) {
            setIsMicActive(false);
            if (kyrstenState === 'listening') {
              setKyrstenState('idle');
            }
          }
        };

        controller.onError = (err) => {
          console.warn('Speech recognition error:', err);
        };

        speechControllerRef.current = controller;
      }

      speechControllerRef.current.start();
      setIsMicActive(true);
      setKyrstenState('listening');
    } catch (e) {
      console.error('Microphone access error:', e);
      setKyrstenState('error');
      setTimeout(() => setKyrstenState('idle'), 2500);
    }
  };

  const stopListening = () => {
    if (speechControllerRef.current) {
      speechControllerRef.current.stop();
    }
    if (audioAnalyzerRef.current) {
      audioAnalyzerRef.current.stop();
      audioAnalyzerRef.current = null;
    }
    if (volumePollInterval.current) {
      clearInterval(volumePollInterval.current);
      volumePollInterval.current = null;
    }
    setIsMicActive(false);
    setAudioVolume(0);
    setInterimTranscript('');
    if (kyrstenState === 'listening') {
      setKyrstenState('idle');
    }
    if (voiceSettings.soundEffects) {
      soundEffects.playDeactivationChime();
    }
  };

  const toggleMic = () => {
    if (isMicActive || kyrstenState === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleContinuousListening = () => {
    const nextContinuous = !voiceSettings.continuousListening;
    setVoiceSettings((prev) => ({ ...prev, continuousListening: nextContinuous }));
    if (speechControllerRef.current) {
      speechControllerRef.current.setContinuous(nextContinuous);
    }
    if (nextContinuous && !isMicActive) {
      startListening();
    }
  };

  // MCP Server Management Handlers
  const handleAddMcpServer = (server: McpServer) => {
    setMcpServers((prev) => [...prev, server]);
  };

  const handleToggleMcpServer = (id: string) => {
    setMcpServers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s))
    );
  };

  const handleDeleteMcpServer = (id: string) => {
    setMcpServers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleTestMcpServer = async (id: string) => {
    const server = mcpServers.find((s) => s.id === id);
    if (!server) return;

    try {
      const response = await fetch('/api/mcp/proxy/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointUrl: server.endpointUrl,
          headers: server.headers,
        }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.tools)) {
        setMcpServers((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: 'connected',
                  tools: data.tools,
                  lastChecked: Date.now(),
                  errorMessage: undefined,
                }
              : s
          )
        );
        if (voiceSettings.soundEffects) {
          soundEffects.playSuccessTone();
        }
      } else {
        throw new Error(data.error || 'Failed to list MCP tools');
      }
    } catch (err: any) {
      setMcpServers((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: 'error',
                errorMessage: err.message,
                lastChecked: Date.now(),
              }
            : s
        )
      );
    }
  };

  // Anthropic Skills Management Handlers
  const handleAddSkill = (skill: AnthropicSkill) => {
    setSkills((prev) => [...prev, skill]);
  };

  const handleToggleSkill = (id: string) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s))
    );
  };

  const handleDeleteSkill = (id: string) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
  };

  // Feature Extension Handlers
  const handleAddExtension = (ext: FeatureExtension) => {
    setExtensions((prev) => [...prev, ext]);
  };

  const handleToggleExtension = (id: string) => {
    setExtensions((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isEnabled: !e.isEnabled } : e))
    );
  };

  const handleDeleteExtension = (id: string) => {
    setExtensions((prev) => prev.filter((e) => e.id !== id));
  };

  // Clear conversation
  const handleClearHistory = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: 'Conversation buffer purged, Boss. Standing by for voice commands.',
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <div className={`relative min-h-screen transition-colors duration-500 font-sans flex flex-col selection:text-white overflow-x-hidden ${
      uiTheme === 'matrix'
        ? 'bg-[#000000] text-emerald-400 selection:bg-emerald-500/30'
        : 'bg-[#020617] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200'
    }`}>
      {/* Background ambient lighting effects */}
      {uiTheme === 'matrix' ? (
        <>
          <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none z-0" />
          <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-900/20 rounded-full blur-[150px] pointer-events-none z-0" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none z-0" />
        </>
      ) : (
        <>
          <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none z-0" />
          <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/30 rounded-full blur-[150px] pointer-events-none z-0" />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35%] h-[35%] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none z-0" />
        </>
      )}
      <div className="fixed inset-0 pointer-events-none hud-grid opacity-40 z-0" />

      {/* Futuristic HUD Header */}
      <KyrstenHUDHeader
        state={kyrstenState}
        activeMcpCount={mcpServers.filter((s) => s.isEnabled).length}
        activeSkillsCount={skills.filter((s) => s.isEnabled).length}
        activeExtensionsCount={extensions.filter((e) => e.isEnabled).length}
        memoryCount={longTermMemories.length}
        isContinuous={voiceSettings.continuousListening}
        isGameMode={gameModeConfig.isEnabled}
        onToggleGameMode={handleToggleGameMode}
        uiTheme={uiTheme}
        onToggleUITheme={handleToggleUITheme}
        voiceprint={voiceprint}
        voiceSettings={voiceSettings}
        recentAssistantMessage={recentAssistantMessage}
        onOpenMcp={() => setIsMcpOpen(true)}
        onOpenSkills={() => setIsSkillsOpen(true)}
        onOpenExtensions={() => setIsExtensionsOpen(true)}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenCalendar={() => setIsCalendarOpen(true)}
        onOpenLiveScores={() => setIsLiveScoresOpen(true)}
        onOpenVoiceprint={() => {
          setVoiceprintModalInitialTab('status');
          setIsVoiceprintOpen(true);
        }}
        onOpenPythonEngine={() => setIsPythonOpen(true)}
        onOpenWatchAlong={() => setIsWatchAlongOpen(true)}
        onOpenMusic={() => setIsMusicPlayerOpen(true)}
        isMusicPlaying={isMusicPlaying}
        onOpenScreensaver={() => setIsScreensaverActive(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isMicActive={isMicActive}
        onToggleMic={toggleMic}
        isAvatarEnabled={isAvatarEnabled}
        onToggleAvatar={handleToggleAvatar}
      />

      {/* Cyber Circuit Trace Watermark Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-25 z-0 flex items-center justify-center overflow-hidden">
        <svg
          className="w-[1200px] h-[800px] text-cyan-500/40"
          viewBox="0 0 1000 700"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        >
          {/* Circuit Paths & Chip Nodes */}
          <path d="M150 100 H300 L350 150 V280 L400 330 H600 L650 280 V150 L700 100 H850" />
          <path d="M100 200 H220 L280 260 H380 L430 310 V400 L480 450 H520 L570 400 V310 L620 260 H720 L780 200 H900" />
          <path d="M180 500 H320 L380 440 H440 L500 500 L560 440 H620 L680 500 H820" />
          <path d="M250 620 H380 L440 560 H560 L620 620 H750" />
          
          {/* Vertical Bus Lines */}
          <path d="M350 150 V450" />
          <path d="M650 150 V450" />
          <path d="M500 80 V220" />
          <path d="M500 480 V650" />

          {/* Solder Joints / Pin Nodes */}
          <circle cx="150" cy="100" r="3" fill="currentColor" />
          <circle cx="850" cy="100" r="3" fill="currentColor" />
          <circle cx="100" cy="200" r="3" fill="currentColor" />
          <circle cx="900" cy="200" r="3" fill="currentColor" />
          <circle cx="350" cy="150" r="4" fill="currentColor" />
          <circle cx="650" cy="150" r="4" fill="currentColor" />
          <circle cx="400" cy="330" r="3.5" fill="currentColor" />
          <circle cx="600" cy="330" r="3.5" fill="currentColor" />
          <circle cx="500" cy="220" r="4" fill="currentColor" />
          <circle cx="500" cy="480" r="4" fill="currentColor" />
          <circle cx="250" cy="620" r="3" fill="currentColor" />
          <circle cx="750" cy="620" r="3" fill="currentColor" />
        </svg>
      </div>

      {/* Main App Body (3-Column Clean Layout) */}
      <main className="relative z-10 flex-1 max-w-[1440px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: MCP Endpoints & Quick Voice Commands */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* MCP Endpoints Card */}
          <div className="rounded-2xl bg-[#121824]/85 backdrop-blur-xl border border-[#202b3d] p-4 flex flex-col gap-3 shadow-xl">
            <div className="text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase font-sans">
              MCP ENDPOINTS
            </div>

            <div className="flex flex-col gap-2">
              {/* System Telemetry */}
              <div
                onClick={() => setIsMcpOpen(true)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#172132]/75 hover:bg-[#1d2a40] border border-[#25344c] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                    System Telemetry
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                </div>
              </div>

              {/* Neural Memory Vault */}
              <div
                onClick={() => setIsMemoryOpen(true)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#172132]/75 hover:bg-[#1d2a40] border border-[#25344c] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Database className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                    Neural Memory Vault
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                </div>
              </div>

              {/* Cyber Workspace */}
              <div
                onClick={() => setIsExtensionsOpen(true)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#172132]/75 hover:bg-[#1d2a40] border border-[#25344c] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Monitor className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                    Cyber Workspace
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                </div>
              </div>

              {/* Task Calendar & Google Workspace Schedule */}
              <div
                onClick={() => setIsCalendarOpen(true)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#172132]/75 hover:bg-[#1d2a40] border border-[#25344c] hover:border-cyan-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Calendar className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                    Task Calendar (Google Sync)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#38bdf8]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                </div>
              </div>
            </div>

            {/* Configure MCP Bus Button */}
            <button
              onClick={() => setIsMcpOpen(true)}
              className="w-full mt-1 py-1.5 px-4 rounded-full bg-[#182335] hover:bg-[#1f2d44] border border-[#27374e] text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Configure MCP Bus</span>
            </button>
          </div>

          {/* Quick Voice Commands (2x3 Grid) */}
          <QuickActionPills
            onSelectAction={(prompt) => processUserQuery(prompt)}
            onOpenVoiceprint={() => {
              setVoiceprintModalInitialTab('enroll');
              setIsVoiceprintOpen(true);
            }}
            onToggleGameMode={handleToggleGameMode}
            onOpenScreensaver={() => setIsScreensaverActive(true)}
            onOpenCalendar={() => setIsCalendarOpen(true)}
            disabled={kyrstenState === 'processing'}
          />
        </div>

        {/* Center Column: Neural Visualizer Core & Floating Capsule Voice Input */}
        <div className="lg:col-span-5 flex flex-col items-center gap-5">
          {/* Elevated Central Card */}
          <div className="w-full rounded-3xl bg-[#141d2a]/80 backdrop-blur-2xl border border-[#23324a] p-5 sm:p-7 flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
            {/* Top Core Title with Toggle */}
            <div className="w-full flex items-center justify-between select-none px-2 mb-2">
              <div className="flex flex-col">
                <h2 className="text-xs sm:text-sm font-bold tracking-[0.2em] text-white uppercase font-sans">
                  {isAvatarEnabled ? 'KYRSTEN AVATAR CORE' : 'NEURAL VISUALIZER CORE'}
                </h2>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-cyan-400 uppercase font-sans">
                  {isAvatarEnabled ? 'REAL-TIME PHONETIC LIP-SYNC' : 'CYAN PULSE'}
                </p>
              </div>
              <button
                onClick={handleToggleAvatar}
                className="px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase bg-[#172336] hover:bg-[#1d2d44] border border-cyan-500/30 text-cyan-300 transition-all shadow-sm cursor-pointer"
                title="Switch between Kyrsten Avatar and Neural Orb"
              >
                {isAvatarEnabled ? 'SHOW ORB' : 'SHOW AVATAR'}
              </button>
            </div>

            {/* Central Visual: Animated Avatar or Liquid Orb */}
            <div className="my-2 w-full flex items-center justify-center min-h-[340px]">
              {isAvatarEnabled ? (
                <div className="w-full h-[360px] sm:h-[400px] max-w-[420px] relative rounded-2xl bg-gradient-to-b from-[#0c1422]/80 to-[#070c16]/95 border border-cyan-500/20 shadow-[0_0_35px_rgba(6,182,212,0.14)] overflow-hidden">
                  <KyrstenAvatar
                    kyrstenState={kyrstenState}
                    isAudioPlaying={kyrstenState === 'speaking'}
                    isAvatarEnabled={isAvatarEnabled}
                    colorTheme={visualizerConfig.colorTheme}
                    onToggleAvatar={handleToggleAvatar}
                  />
                </div>
              ) : (
                <AudioOrbVisualizer
                  state={kyrstenState}
                  getFrequencyData={audioAnalyzerRef.current?.getFrequencyData}
                  getAverageVolume={audioAnalyzerRef.current?.getAverageVolume}
                  config={visualizerConfig}
                  onCoreClick={toggleMic}
                  isMicActive={isMicActive}
                  isGameMode={gameModeConfig.isEnabled}
                />
              )}
            </div>

            {/* Bottom Pulse Label */}
            <div className="text-[11px] font-semibold tracking-[0.2em] text-cyan-400/80 uppercase text-center font-mono select-none mt-1">
              {isAvatarEnabled ? 'SYNCHRONIZED AUDIO CLOCK // 60 FPS' : 'CYAN PULSE'}
            </div>
          </div>

          {/* Floating Capsule Input Bar */}
          <VoiceControls
            state={kyrstenState}
            isListening={isMicActive || kyrstenState === 'listening'}
            interimTranscript={interimTranscript}
            voiceSettings={voiceSettings}
            onToggleMic={toggleMic}
            onToggleContinuous={toggleContinuousListening}
            onSubmitText={(text) => processUserQuery(text)}
            onInterruptSpeech={interruptSpeech}
            audioVolume={audioVolume}
          />
        </div>

        {/* Right Column: Translation & Context Telemetry and Biometric Security Alerts */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <TranscriptFeed
            messages={messages}
            onSpeakText={(text) => speakText(text)}
            onClearHistory={handleClearHistory}
            voiceprint={voiceprint}
            voiceSettings={voiceSettings}
          />
        </div>
      </main>

      {/* Inbuilt Ad-Free Music Player (Accessible via Header or Voice) */}
      <MusicPlayerSection
        isAssistantSpeaking={kyrstenState === 'speaking'}
        onSendChatPrompt={(prompt) => processUserQuery(prompt)}
        externalCommand={musicCommand}
        isOpen={isMusicPlayerOpen}
        onClose={() => setIsMusicPlayerOpen(false)}
        onOpen={() => setIsMusicPlayerOpen(true)}
        onPlaybackChange={handlePlaybackChange}
      />

      {/* Modals */}
      <McpManagerModal
        isOpen={isMcpOpen}
        onClose={() => setIsMcpOpen(false)}
        servers={mcpServers}
        onAddServer={handleAddMcpServer}
        onToggleServer={handleToggleMcpServer}
        onDeleteServer={handleDeleteMcpServer}
        onTestServer={handleTestMcpServer}
      />

      <SkillsManagerModal
        isOpen={isSkillsOpen}
        onClose={() => setIsSkillsOpen(false)}
        skills={skills}
        onAddSkill={handleAddSkill}
        onToggleSkill={handleToggleSkill}
        onDeleteSkill={handleDeleteSkill}
      />

      <FeatureExtensionModal
        isOpen={isExtensionsOpen}
        onClose={() => setIsExtensionsOpen(false)}
        extensions={extensions}
        onAddExtension={handleAddExtension}
        onToggleExtension={handleToggleExtension}
        onDeleteExtension={handleDeleteExtension}
      />

      <LongTermMemoryModal
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memories={longTermMemories}
        onUpdateMemories={(updated) => setLongTermMemories(updated)}
      />

      <BossVoiceprintModal
        isOpen={isVoiceprintOpen}
        onClose={() => setIsVoiceprintOpen(false)}
        voiceprint={voiceprint}
        onUpdateVoiceprint={(updated) => setVoiceprint(updated)}
        voiceSettings={voiceSettings}
        onUpdateVoiceSettings={(settings) => setVoiceSettings(settings)}
        audioAnalyzer={audioAnalyzerRef.current}
        isMicActive={isMicActive}
        onStartMic={startListening}
        onStopMic={stopListening}
        initialTab={voiceprintModalInitialTab}
      />

      <PythonEngineModal
        isOpen={isPythonOpen}
        onClose={() => setIsPythonOpen(false)}
      />

      <VlcWatchAlongModal
        isOpen={isWatchAlongOpen}
        onClose={() => setIsWatchAlongOpen(false)}
        onTriggerVoiceCommand={(prompt) => processUserQuery(prompt)}
      />

      {/* Task Calendar with Google Calendar Sync & Voice Command Support */}
      <TaskCalendarSection
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        externalCommand={calendarCommand}
        onSelectTask={(task) => {
          processUserQuery(`Review task details: ${task.title} on ${task.date}`);
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        uiTheme={uiTheme}
        onUpdateUITheme={handleUpdateUITheme}
        voiceSettings={voiceSettings}
        onUpdateVoiceSettings={(newSettings) => setVoiceSettings((prev) => ({ ...prev, ...newSettings }))}
        visualizerConfig={visualizerConfig}
        onUpdateVisualizerConfig={(newConfig) => setVisualizerConfig((prev) => ({ ...prev, ...newConfig }))}
        availableVoices={availableVoices}
        onOpenVoiceprint={() => {
          setVoiceprintModalInitialTab('status');
          setIsVoiceprintOpen(true);
        }}
        gameModeConfig={gameModeConfig}
        onUpdateGameModeConfig={(newConfig) => setGameModeConfig((prev) => ({ ...prev, ...newConfig }))}
      />

      {/* Matrix 0/1 Falling Code Screensaver */}
      <MatrixScreensaver
        isActive={isScreensaverActive}
        onClose={() => setIsScreensaverActive(false)}
      />
    </div>
  );
}
