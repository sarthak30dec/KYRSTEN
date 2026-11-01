import React from 'react';
import {
  Mic,
  Brain,
  Gamepad2,
  Boxes,
  Terminal,
  Radio,
  Monitor,
  Settings,
  Tv,
  Calendar,
} from 'lucide-react';
import { KyrstenState, BossVoiceprint, VoiceSettings, UITheme, Message } from '../types';
import { AIMoodIndicator } from './AIMoodIndicator';

interface KyrstenHUDHeaderProps {
  state: KyrstenState;
  activeMcpCount: number;
  activeSkillsCount: number;
  activeExtensionsCount: number;
  memoryCount: number;
  isContinuous: boolean;
  isGameMode?: boolean;
  onToggleGameMode?: () => void;
  uiTheme?: UITheme;
  onToggleUITheme?: () => void;
  voiceprint: BossVoiceprint;
  voiceSettings: VoiceSettings;
  recentAssistantMessage?: Message | null;
  onOpenMcp: () => void;
  onOpenSkills: () => void;
  onOpenExtensions: () => void;
  onOpenMemory: () => void;
  onOpenVoiceprint: () => void;
  onOpenCalendar?: () => void;
  onOpenLiveScores?: () => void;
  onOpenPythonEngine?: () => void;
  onOpenMusic?: () => void;
  isMusicPlaying?: boolean;
  onOpenScreensaver?: () => void;
  onOpenWatchAlong?: () => void;
  onOpenSettings: () => void;
  isMicActive?: boolean;
  onToggleMic?: () => void;
  isAvatarEnabled?: boolean;
  onToggleAvatar?: () => void;
}

export const KyrstenHUDHeader: React.FC<KyrstenHUDHeaderProps> = ({
  state,
  activeExtensionsCount,
  memoryCount,
  isGameMode = false,
  onToggleGameMode,
  recentAssistantMessage,
  onOpenExtensions,
  onOpenMemory,
  onOpenVoiceprint,
  onOpenCalendar,
  onOpenLiveScores,
  onOpenPythonEngine,
  onOpenMusic,
  isMusicPlaying = false,
  onOpenScreensaver,
  onOpenSettings,
  isMicActive = false,
  onToggleMic,
  isAvatarEnabled = true,
  onToggleAvatar,
}) => {
  const isVoiceActive = isMicActive || state === 'listening' || state === 'speaking' || state === 'processing';

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-[#1c273a]/80 bg-[#0c121c]/90 backdrop-blur-md sticky top-0 z-30 select-none gap-3">
      {/* Brand Logo, Name & Live AI Mood Indicator */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
        <div className="relative flex items-center justify-center">
          {/* Futuristic atom / geometric rings icon */}
          <svg
            className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(0 12 12)" />
            <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
            <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
            <circle cx="12" cy="12" r="2.2" fill="currentColor" />
          </svg>
        </div>
        <span className="text-base sm:text-lg font-bold tracking-[0.16em] text-white uppercase font-sans">
          KYRSTEN
        </span>

        {/* Dynamic AI Mood Indicator with smooth CSS variable color transitions */}
        <div className="hidden sm:block h-4 w-px bg-[#1f2d42]" />
        <AIMoodIndicator recentMessage={recentAssistantMessage} />
      </div>

      {/* Inline Pill Badges & Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1 pr-1 no-scrollbar">
        {/* Boss Mode Badge */}
        <div
          onClick={onOpenVoiceprint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#131b28]/80 border border-[#233148] text-slate-300 text-[11px] font-medium tracking-wide hover:border-cyan-500/40 hover:text-white transition-all cursor-pointer shrink-0"
          title="Boss Mode & Voice Biometrics"
        >
          <Tv className="w-3.5 h-3.5 text-slate-400" />
          <span className="uppercase">BOSS MODE</span>
        </div>

        {/* Voice Active Pill (Glowing Cyan Highlight) */}
        <button
          onClick={onToggleMic}
          className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-medium tracking-wide transition-all cursor-pointer shrink-0 ${
            isVoiceActive
              ? 'bg-[#15273b] border border-cyan-400/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
              : 'bg-[#131b28]/80 border border-[#233148] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40'
          }`}
          title="Toggle Voice Recognition"
        >
          <Mic className={`w-3.5 h-3.5 ${isVoiceActive ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
          <span className="uppercase">{isVoiceActive ? 'VOICE ACTIVE' : 'VOICE STANDBY'}</span>
          {isVoiceActive && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
          )}
        </button>

        {/* Avatar Toggle Pill */}
        {onToggleAvatar && (
          <button
            onClick={onToggleAvatar}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide transition-all cursor-pointer shrink-0 ${
              isAvatarEnabled
                ? 'bg-[#122438] border border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'bg-[#131b28]/80 border border-[#233148] text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40'
            }`}
            title="Toggle Kyrsten Digital Head Avatar (Real-time lip-sync)"
          >
            <span className={`w-2 h-2 rounded-full ${isAvatarEnabled ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="uppercase">AVATAR: {isAvatarEnabled ? 'ON' : 'OFF'}</span>
          </button>
        )}

        {/* Memory Count */}
        <button
          onClick={onOpenMemory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#131b28]/80 border border-[#233148] text-slate-300 text-[11px] font-medium tracking-wide hover:border-cyan-500/40 hover:text-white transition-all cursor-pointer shrink-0"
          title="Long-Term Memory Vault"
        >
          <Brain className="w-3.5 h-3.5 text-slate-400" />
          <span className="uppercase">MEMORY: {memoryCount}</span>
        </button>

        {/* Task Calendar */}
        {onOpenCalendar && (
          <button
            onClick={onOpenCalendar}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#131b28]/80 border border-[#233148] text-slate-300 text-[11px] font-medium tracking-wide hover:border-cyan-500/40 hover:text-cyan-300 transition-all cursor-pointer shrink-0"
            title="Google Calendar & Task Schedule"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span className="uppercase">CALENDAR</span>
          </button>
        )}

        {/* Live Scores & Telemetry Pop-up */}
        {onOpenLiveScores && (
          <button
            onClick={onOpenLiveScores}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 border border-rose-500/40 text-rose-300 text-[11px] font-semibold tracking-wide hover:border-rose-400 hover:text-white transition-all cursor-pointer shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
            title="Open Live Scores & Telemetry Pop-up"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span className="uppercase">LIVE SCORES</span>
          </button>
        )}

        {/* Game Mode */}
        <button
          onClick={onToggleGameMode}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide transition-all cursor-pointer shrink-0 ${
            isGameMode
              ? 'bg-[#12281e] border border-emerald-400/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              : 'bg-[#131b28]/80 border border-[#233148] text-slate-300 hover:text-white hover:border-emerald-500/40'
          }`}
          title="Game Mode / Low-Resource Profile"
        >
          <Gamepad2 className={`w-3.5 h-3.5 ${isGameMode ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span className="uppercase">GAME MODE</span>
        </button>

        {/* Extensions Hub */}
        <button
          onClick={onOpenExtensions}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#131b28]/80 border border-[#233148] text-slate-300 text-[11px] font-medium tracking-wide hover:border-indigo-500/40 hover:text-white transition-all cursor-pointer shrink-0"
          title="Feature Extensions Hub"
        >
          <Boxes className="w-3.5 h-3.5 text-slate-400" />
          <span>Hub: {activeExtensionsCount} Ext</span>
        </button>

        {/* Python AI Engine */}
        {onOpenPythonEngine && (
          <button
            onClick={onOpenPythonEngine}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#131b28]/80 border border-[#233148] text-slate-300 text-[11px] font-medium tracking-wide hover:border-amber-500/40 hover:text-white transition-all cursor-pointer shrink-0"
            title="Python 3.10 Engine Core"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-400" />
            <span>Py: 3.10</span>
          </button>
        )}

        {/* Audio Music Player */}
        {onOpenMusic && (
          <button
            onClick={onOpenMusic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide transition-all cursor-pointer shrink-0 ${
              isMusicPlaying
                ? 'bg-cyan-950/70 border border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                : 'bg-[#131b28]/80 border border-[#233148] text-slate-300 hover:border-cyan-500/40 hover:text-white'
            }`}
            title={isMusicPlaying ? 'Music Mode Active — Click to open deck' : 'Ad-Free Ambient Music Player'}
          >
            {isMusicPlaying ? (
              <span className="flex items-center gap-0.5 h-3">
                <span className="w-0.5 h-full bg-cyan-400 animate-pulse" />
                <span className="w-0.5 h-2/3 bg-cyan-400 animate-pulse delay-75" />
                <span className="w-0.5 h-4/5 bg-cyan-400 animate-pulse delay-150" />
              </span>
            ) : (
              <Radio className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>{isMusicPlaying ? 'Music Mode: ON' : 'Audio: Music'}</span>
          </button>
        )}

        {/* Screensaver */}
        {onOpenScreensaver && (
          <button
            onClick={onOpenScreensaver}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#131b28]/80 border border-[#233148] text-slate-300 text-[11px] font-medium tracking-wide hover:border-emerald-500/40 hover:text-white transition-all cursor-pointer shrink-0"
            title="Activate Screensaver"
          >
            <Monitor className="w-3.5 h-3.5 text-slate-400" />
            <span>Screensaver</span>
          </button>
        )}

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#131b28]/80 border border-[#233148] text-slate-300 text-[11px] font-medium tracking-wide hover:border-cyan-500/40 hover:text-white transition-all cursor-pointer shrink-0"
          title="System Settings"
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
          <span className="uppercase">SETTINGS</span>
        </button>
      </div>
    </header>
  );
};
