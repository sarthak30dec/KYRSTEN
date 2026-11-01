import React, { useState } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import { KyrstenState, VoiceSettings } from '../types';

interface VoiceControlsProps {
  state: KyrstenState;
  isListening: boolean;
  interimTranscript: string;
  voiceSettings: VoiceSettings;
  onToggleMic: () => void;
  onToggleContinuous: () => void;
  onSubmitText: (text: string) => void;
  onInterruptSpeech: () => void;
  audioVolume: number;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  state,
  isListening,
  interimTranscript,
  onToggleMic,
  onSubmitText,
  onInterruptSpeech,
}) => {
  const [textInput, setTextInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || state === 'processing') return;
    onSubmitText(textInput.trim());
    setTextInput('');
  };

  const isSpeaking = state === 'speaking';

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* Interim Voice Recognition Transcript Bubble (Appears cleanly when talking) */}
      {isListening && interimTranscript && (
        <div className="mb-2 px-4 py-1.5 rounded-full bg-[#132235]/90 border border-cyan-400/40 text-cyan-200 text-xs font-mono shadow-[0_0_15px_rgba(6,182,212,0.2)] animate-pulse max-w-md truncate">
          &ldquo;{interimTranscript}&rdquo;
        </div>
      )}

      {/* Elongated Capsule Pill Input Bar */}
      <form
        onSubmit={handleSend}
        className="w-full max-w-[420px] rounded-full bg-[#131b27]/90 border border-[#24334a] hover:border-[#324564] focus-within:border-cyan-500/60 p-1.5 flex items-center shadow-2xl transition-all"
      >
        {/* Left Circular Microphone Button */}
        <button
          type="button"
          onClick={isSpeaking ? onInterruptSpeech : onToggleMic}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
            isListening
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)] animate-pulse'
              : isSpeaking
              ? 'bg-blue-500/20 text-blue-300 border border-blue-400/50'
              : 'bg-[#1b2535] hover:bg-[#233044] text-slate-300 hover:text-white'
          }`}
          title={isListening ? 'Stop Listening' : 'Push to Talk'}
        >
          {isListening ? (
            <Mic className="w-4 h-4 text-cyan-400" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>

        {/* Text Input */}
        <input
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={isListening ? 'Listening...' : 'Type a voice command...'}
          className="bg-transparent border-0 text-xs text-white placeholder-slate-400 focus:outline-none flex-1 px-3 font-sans"
        />

        {/* Right Circular Send Button */}
        <button
          type="submit"
          disabled={!textInput.trim() || state === 'processing'}
          className="w-9 h-9 rounded-full bg-[#1f2b3e] hover:bg-cyan-600 disabled:opacity-40 disabled:hover:bg-[#1f2b3e] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          title="Send command"
        >
          <Send className="w-4 h-4 -rotate-12 translate-x-0.5" />
        </button>
      </form>

      {/* Subtext info */}
      <div className="text-[11px] font-sans text-slate-400 tracking-wide text-center mt-3">
        Wake Word info • Integrated: clean
      </div>
    </div>
  );
};
