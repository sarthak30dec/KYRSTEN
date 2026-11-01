import React, { useState } from 'react';
import { VoiceSettings, AudioVisualizerConfig, GameModeConfig, UITheme } from '../types';
import { X, Sliders, Volume2, Palette, Mic, Sparkles, Play, CheckCircle2, Gamepad2, Cpu, Terminal, Monitor } from 'lucide-react';
import { neuralVoicePlayer } from '../utils/neuralVoicePlayer';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiTheme: UITheme;
  onUpdateUITheme: (theme: UITheme) => void;
  voiceSettings: VoiceSettings;
  onUpdateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  visualizerConfig: AudioVisualizerConfig;
  onUpdateVisualizerConfig: (config: Partial<AudioVisualizerConfig>) => void;
  availableVoices: SpeechSynthesisVoice[];
  onOpenVoiceprint?: () => void;
  gameModeConfig?: GameModeConfig;
  onUpdateGameModeConfig?: (config: Partial<GameModeConfig>) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  uiTheme,
  onUpdateUITheme,
  voiceSettings,
  onUpdateVoiceSettings,
  visualizerConfig,
  onUpdateVisualizerConfig,
  availableVoices,
  onOpenVoiceprint,
  gameModeConfig,
  onUpdateGameModeConfig,
}) => {
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  if (!isOpen) return null;

  const handleTestVoice = () => {
    setIsPlayingTest(true);
    neuralVoicePlayer.speak(
      `Hey Boss, I'm right here and ready whenever you are. What would you like to do?`,
      {
        voiceName: voiceSettings.voiceName,
        geminiVoice: voiceSettings.geminiVoice || 'Aoede',
        pitch: voiceSettings.pitch,
        rate: voiceSettings.rate,
        volume: voiceSettings.volume,
        onEnd: () => setIsPlayingTest(false),
        onError: () => setIsPlayingTest(false),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-xl backdrop-blur-2xl bg-slate-950/85 rounded-3xl border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-hud tracking-widest text-white uppercase">
                Kyrsten Neural Configuration
              </h2>
              <p className="text-xs font-mono text-cyan-400/80">
                Vocal synthesis parameters and holographic audio visualizer matrix
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-mono">
          {/* Section 0: Boss Persona & Security */}
          <div className="space-y-3 pb-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold uppercase tracking-wider text-sm font-hud">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Boss Persona & Security Lock</span>
              </div>
              {onOpenVoiceprint && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenVoiceprint();
                  }}
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  Configure Biometrics →
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-slate-300">USER HONORIFIC / TITLE</label>
                <input
                  type="text"
                  value={voiceSettings.userHonorific || 'Boss'}
                  onChange={(e) => onUpdateVoiceSettings({ userHonorific: e.target.value })}
                  placeholder="Boss"
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-slate-100 bg-slate-900 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300">VOICE LOCK REJECTION LEVEL</label>
                <select
                  value={voiceSettings.voiceLockStrictness || 'balanced'}
                  onChange={(e) => onUpdateVoiceSettings({ voiceLockStrictness: e.target.value as any })}
                  className="w-full glass-input px-3.5 py-2 rounded-xl text-slate-100 bg-slate-900 font-mono text-xs"
                >
                  <option value="balanced">Balanced (70% Confidence)</option>
                  <option value="high">High Security (75% Confidence)</option>
                  <option value="maximum">Maximum Lock (85% Confidence)</option>
                </select>
              </div>
            </div>

            <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800 cursor-pointer mt-2">
              <div>
                <span className="text-slate-200 font-semibold block">Enforce Boss Voice Biometrics</span>
                <span className="text-[11px] text-slate-400">Kyrsten will only execute commands spoken by Boss's voice signature</span>
              </div>
              <input
                type="checkbox"
                checked={voiceSettings.bossVoiceLock ?? true}
                onChange={(e) => onUpdateVoiceSettings({ bossVoiceLock: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 rounded"
              />
            </label>
          </div>

          {/* Section 1: UI System Visual Theme */}
          <div className="space-y-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-slate-200 font-semibold uppercase tracking-wider text-sm font-hud">
              <Monitor className="w-4 h-4 text-cyan-400" />
              <span>UI System Visual Theme</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Select overall interface color palette. Voice AI can also toggle this at any time with voice commands like <span className="text-cyan-300 font-mono">"Switch theme to Matrix"</span> or <span className="text-cyan-300 font-mono">"Set theme to Cyberpunk"</span>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cyberpunk Theme */}
              <button
                type="button"
                onClick={() => {
                  onUpdateUITheme('cyberpunk');
                  onUpdateVisualizerConfig({ colorTheme: 'cyan_pulse' });
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  uiTheme === 'cyberpunk'
                    ? 'border-cyan-400 bg-cyan-950/40 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-white flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Cyberpunk Cyan (Default)
                  </span>
                  {uiTheme === 'cyberpunk' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Frosted glass panels, neon cyan highlights, and deep cosmic slate HUD aesthetics.
                </p>
              </button>

              {/* Matrix Theme */}
              <button
                type="button"
                onClick={() => {
                  onUpdateUITheme('matrix');
                  onUpdateVisualizerConfig({ colorTheme: 'emerald_matrix' });
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  uiTheme === 'matrix'
                    ? 'border-emerald-400 bg-emerald-950/40 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-xs text-white flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    Matrix Terminal (Black & Green)
                  </span>
                  {uiTheme === 'matrix' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Pure pitch black backdrop, phosphor green monospace typography, and monochrome green terminal glows.
                </p>
              </button>
            </div>
          </div>

          {/* Section 2: Holographic Visualizer Theme */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-200 font-semibold uppercase tracking-wider text-sm font-hud">
              <Palette className="w-4 h-4 text-cyan-400" />
              <span>Audio Visualizer Matrix</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'cyan_pulse', name: 'Cyber Cyan', border: 'border-cyan-400', bg: 'bg-cyan-500/20 text-cyan-300' },
                { id: 'electric_violet', name: 'Electric Violet', border: 'border-purple-400', bg: 'bg-purple-500/20 text-purple-300' },
                { id: 'amber_plasma', name: 'Amber Plasma', border: 'border-amber-400', bg: 'bg-amber-500/20 text-amber-300' },
                { id: 'emerald_matrix', name: 'Emerald Matrix', border: 'border-emerald-400', bg: 'bg-emerald-500/20 text-emerald-300' },
                { id: 'quantum_fusion', name: 'Quantum Fusion', border: 'border-pink-400', bg: 'bg-pink-500/20 text-pink-300' },
              ].map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => onUpdateVisualizerConfig({ colorTheme: theme.id as any })}
                  className={`p-2.5 rounded-xl border text-left font-semibold transition-all cursor-pointer ${
                    visualizerConfig.colorTheme === theme.id
                      ? `${theme.border} ${theme.bg} shadow-md`
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {theme.name}
                </button>
              ))}
            </div>

            {/* Sensitivity Slider */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-slate-300">
                <span>Microphone FFT Sensitivity</span>
                <span className="text-cyan-300">{Math.round((visualizerConfig.sensitivity || 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.1"
                value={visualizerConfig.sensitivity || 1}
                onChange={(e) => onUpdateVisualizerConfig({ sensitivity: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>

          {/* Section 2: Speech Synthesis Engine */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-200 font-semibold uppercase tracking-wider text-sm font-hud">
                <Volume2 className="w-4 h-4 text-cyan-400" />
                <span>Voice Synthesizer (Neural Female TTS)</span>
              </div>
              <button
                onClick={handleTestVoice}
                disabled={isPlayingTest}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-[11px] font-mono transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isPlayingTest ? 'Playing Test...' : 'Test Voice'}</span>
              </button>
            </div>

            {/* Neural Voice Persona (Gemini TTS) */}
            <div className="space-y-2">
              <label className="text-slate-300 block">PRIMARY NEURAL FEMALE VOICE</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {[
                  { id: 'Aoede', label: 'Aoede', gender: 'Female', desc: 'Warm, Mature & Articulate (Default)', badge: 'Recommended' },
                  { id: 'Zephyr', label: 'Zephyr', gender: 'Female', desc: 'Velvet, Soft & Intimate' },
                  { id: 'Kore', label: 'Kore', gender: 'Female', desc: 'Gentle & Calming' },
                  { id: 'Leda', label: 'Leda', gender: 'Female', desc: 'Bright & Expressive' },
                ].map((voice) => {
                  const isSelected = (voiceSettings.geminiVoice || 'Aoede') === voice.id;
                  return (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => onUpdateVoiceSettings({ geminiVoice: voice.id as any })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'border-pink-400/60 bg-pink-500/15 text-pink-200 shadow-md ring-1 ring-pink-400/40'
                          : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-white flex items-center gap-1">
                          {voice.label}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                            ♀ {voice.gender}
                          </span>
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-pink-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">{voice.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Humanized Voice Engine Status */}
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[11px] font-mono tracking-wider uppercase text-cyan-300">
                  Voice Engine: 100% Neural Humanized Voice
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Robotic Fallback Removed
              </span>
            </div>

            {/* Voice Pitch & Speed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Voice Pitch (Feminine Resonance)</span>
                  <span className="text-cyan-300">{voiceSettings.pitch}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.5"
                  step="0.02"
                  value={voiceSettings.pitch}
                  onChange={(e) => onUpdateVoiceSettings({ pitch: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Speech Rate</span>
                  <span className="text-cyan-300">{voiceSettings.rate}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.5"
                  step="0.05"
                  value={voiceSettings.rate}
                  onChange={(e) => onUpdateVoiceSettings({ rate: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-2">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-slate-200 font-semibold block">Automatic Voice Response</span>
                  <span className="text-[11px] text-slate-400">Kyrsten vocalizes all answers through TTS automatically</span>
                </div>
                <input
                  type="checkbox"
                  checked={voiceSettings.autoSpeak}
                  onChange={(e) => onUpdateVoiceSettings({ autoSpeak: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800 cursor-pointer">
                <div>
                  <span className="text-slate-200 font-semibold block">Futuristic SFX Synthesizer</span>
                  <span className="text-[11px] text-slate-400">Harmonic activation chimes and tool execution data blips</span>
                </div>
                <input
                  type="checkbox"
                  checked={voiceSettings.soundEffects}
                  onChange={(e) => onUpdateVoiceSettings({ soundEffects: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded"
                />
              </label>
            </div>
          </div>

          {/* Section 4: Game Mode & Low-Resource Profile */}
          {gameModeConfig && onUpdateGameModeConfig && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-slate-200 font-semibold uppercase tracking-wider text-sm font-hud">
                <Gamepad2 className="w-4 h-4 text-emerald-400" />
                <span>Game Mode & Low-Resource Hardware Profile</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                When active, Kyrsten reduces UI animation loops, particles, and background canvas draws to low-power standby so host games receive maximum CPU and GPU resources. Voice recognition stays actively attentive in the background.
              </p>

              <div className="space-y-2">
                <label className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 cursor-pointer hover:bg-emerald-950/50 transition-colors">
                  <div>
                    <span className="text-emerald-300 font-semibold block flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5" />
                      Game Mode Status
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {gameModeConfig.isEnabled
                        ? 'Active: Minimum resource profile engaged. CPU/GPU yielded to games.'
                        : 'Inactive: Full holographic visual fidelity and 60 FPS telemetry.'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={gameModeConfig.isEnabled}
                    onChange={(e) => onUpdateGameModeConfig({ isEnabled: e.target.checked })}
                    className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800 cursor-pointer">
                  <div>
                    <span className="text-slate-200 font-semibold block">Continuous Voice Standby During Games</span>
                    <span className="text-[11px] text-slate-400">Keep voice listener hot in the background so you can call Kyrsten at any time</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={gameModeConfig.voiceStandbyActive}
                    onChange={(e) => onUpdateGameModeConfig({ voiceStandbyActive: e.target.checked })}
                    className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/70 border border-slate-800 cursor-pointer">
                  <div>
                    <span className="text-slate-200 font-semibold block">Disable Background Particles & Heavy Shaders</span>
                    <span className="text-[11px] text-slate-400">Cuts particle count and disables GPU-intensive bloom effects</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={gameModeConfig.disableBackgroundParticles}
                    onChange={(e) => onUpdateGameModeConfig({ disableBackgroundParticles: e.target.checked })}
                    className="w-4 h-4 accent-emerald-400 rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-600/30 transition-all cursor-pointer font-mono text-xs"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
