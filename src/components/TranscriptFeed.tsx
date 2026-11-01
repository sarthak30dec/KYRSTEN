import React from 'react';
import Markdown from 'react-markdown';
import { User, Sparkles, Copy, Check, Volume2 } from 'lucide-react';
import { Message, BossVoiceprint, VoiceSettings } from '../types';

interface TranscriptFeedProps {
  messages: Message[];
  onSpeakText: (text: string) => void;
  onClearHistory: () => void;
  voiceprint?: BossVoiceprint;
  voiceSettings?: VoiceSettings;
}

export const TranscriptFeed: React.FC<TranscriptFeedProps> = ({
  messages,
  onSpeakText,
  voiceprint,
  voiceSettings,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isVoiceLocked = voiceSettings?.bossVoiceLock ?? true;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Card: Translation & Context Telemetry */}
      <div className="rounded-2xl bg-[#121824]/85 backdrop-blur-xl border border-[#202b3d] p-4 flex flex-col flex-1 min-h-[360px] shadow-xl overflow-hidden">
        <div className="flex items-center justify-between mb-3 border-b border-[#1d273a] pb-2">
          <h2 className="text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase font-sans">
            TRANSLATION &amp; CONTEXT TELEMETRY
          </h2>
          <span className="text-[10px] font-mono text-slate-400">
            {messages.length} Events
          </span>
        </div>

        {/* Scrollable chat messages stream */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 no-scrollbar text-xs">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className="flex items-start gap-2.5">
                {/* Circular Avatar Badge */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white ${
                    isUser
                      ? 'bg-cyan-600 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]'
                  }`}
                >
                  <User className="w-4 h-4" />
                </div>

                {/* Message Content Container */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-sans">
                    <span className="font-semibold text-slate-300">
                      {isUser ? 'Boss' : 'Assistant'}
                    </span>
                    <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-cyan-300 cursor-pointer"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      {!isUser && (
                        <button
                          onClick={() => onSpeakText(msg.content)}
                          className="hover:text-cyan-300 cursor-pointer"
                          title="Speak response"
                        >
                          <Volume2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-[#162132]/80 border border-[#233148] text-slate-200 text-xs leading-relaxed font-sans">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Card: Biometric Security Alerts */}
      <div className="rounded-2xl bg-[#121824]/85 backdrop-blur-xl border border-[#202b3d] p-4 flex flex-col gap-2.5 shadow-xl relative">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase font-sans">
            BIOMETRIC SECURITY ALERTS
          </div>
        </div>

        {/* Coral Alert Box */}
        <div className="rounded-xl bg-[#381a20]/80 border border-[#5e222c] p-3 text-left">
          <div className="text-xs font-semibold text-rose-300 mb-1">
            Biometric Security Alerts
          </div>
          <p className="text-[11px] text-rose-200/80 leading-snug">
            {isVoiceLocked
              ? 'The biometric security alerts is security in persons to monitor and manage route authority.'
              : 'Voice lock is currently disabled. Open access mode is active.'}
          </p>
        </div>

        {/* Subtle Decorative Star Glyph in bottom right */}
        <div className="flex justify-end pt-1">
          <svg
            className="w-5 h-5 text-slate-500/80"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
          </svg>
        </div>
      </div>
    </div>
  );
};
