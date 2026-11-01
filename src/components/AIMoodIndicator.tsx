import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Sparkles,
  Heart,
  Smile,
  Compass,
  Shield,
  AlertTriangle,
  LifeBuoy,
  ChevronDown,
  Info,
} from 'lucide-react';
import { Message } from '../types';
import { analyzeAssistantSentiment, AIMoodData, MoodType } from '../utils/sentimentAnalyzer';

interface AIMoodIndicatorProps {
  recentMessage?: Message | null;
  className?: string;
  compact?: boolean;
}

export const AIMoodIndicator: React.FC<AIMoodIndicatorProps> = ({
  recentMessage,
  className = '',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Compute sentiment parameters based on the most recent assistant message
  const mood: AIMoodData = useMemo(() => {
    return analyzeAssistantSentiment(recentMessage?.content);
  }, [recentMessage?.content, recentMessage?.id]);

  // Dynamically update root CSS variables for global and component-level smooth transitions
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--mood-color', mood.color);
    root.style.setProperty('--mood-glow', mood.glow);
    root.style.setProperty('--mood-bg', mood.bg);
    root.style.setProperty('--mood-border', mood.border);
  }, [mood.color, mood.glow, mood.bg, mood.border]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mood Icon Mapper
  const renderMoodIcon = (type: MoodType) => {
    const iconClass = 'w-3.5 h-3.5 transition-transform duration-500';
    switch (type) {
      case 'playful':
        return <Sparkles className={`${iconClass} text-pink-400`} />;
      case 'warm':
        return <Heart className={`${iconClass} text-amber-400`} />;
      case 'cheerful':
        return <Smile className={`${iconClass} text-emerald-400`} />;
      case 'curious':
        return <Compass className={`${iconClass} text-violet-400`} />;
      case 'alert':
        return <AlertTriangle className={`${iconClass} text-rose-400`} />;
      case 'empathetic':
        return <LifeBuoy className={`${iconClass} text-teal-400`} />;
      case 'focused':
      default:
        return <Shield className={`${iconClass} text-cyan-400`} />;
    }
  };

  // Truncate recent message preview for the popover
  const previewText = useMemo(() => {
    if (!recentMessage?.content) return 'System standby initialized.';
    const cleaned = recentMessage.content
      .replace(/\[[a-zA-Z\s]{3,20}\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.length > 100 ? `${cleaned.slice(0, 97)}...` : cleaned;
  }, [recentMessage?.content]);

  // Valence percentage from -1.0 to +1.0 mapped to 0% - 100%
  const valencePct = Math.round(((mood.valence + 1) / 2) * 100);

  return (
    <div
      ref={popoverRef}
      className={`relative inline-flex items-center shrink-0 ${className}`}
      style={
        {
          '--mood-color': mood.color,
          '--mood-glow': mood.glow,
          '--mood-bg': mood.bg,
          '--mood-border': mood.border,
        } as React.CSSProperties
      }
    >
      {/* Dynamic Mood Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="ai-mood-container group relative flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-medium tracking-wide cursor-pointer transition-all duration-700 select-none shadow-[0_0_12px_var(--mood-glow)] bg-[var(--mood-bg)] border-[var(--mood-border)] hover:brightness-110"
        title={`AI Mood: ${mood.label} (${mood.summary}) — Click for sentiment telemetry`}
      >
        {/* Pulsing Orb with Dynamic CSS Variable Color */}
        <span className="relative flex items-center justify-center w-2.5 h-2.5 shrink-0">
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-60 ai-mood-orb"
            style={{
              animationDuration:
                mood.pulseSpeed === 'fast' ? '1.5s' : mood.pulseSpeed === 'slow' ? '3.5s' : '2.5s',
            }}
          />
          <span className="relative w-2 h-2 rounded-full ai-mood-orb" />
        </span>

        {/* Mood Icon */}
        <span className="shrink-0 flex items-center opacity-90 group-hover:scale-110 transition-transform duration-300">
          {renderMoodIcon(mood.type)}
        </span>

        {/* Dynamic Mood Label */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] text-slate-300/80 uppercase font-semibold tracking-wider">
            MOOD:
          </span>
          <span
            className="ai-mood-text font-bold uppercase tracking-wider text-[11px]"
            style={{ color: 'var(--mood-color)' }}
          >
            {mood.label}
          </span>
        </div>

        {/* Subtle Dropdown Chevron */}
        <ChevronDown
          className={`w-3 h-3 text-slate-400 group-hover:text-white transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Interactive Mood Detail Popover */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-72 sm:w-80 rounded-2xl p-4 bg-[#0c1422]/95 border backdrop-blur-xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200"
          style={{
            borderColor: 'var(--mood-border)',
            boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.7), 0 0 20px var(--mood-glow)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#1f2d42]">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#141f32] border border-[#23354f]">
                {renderMoodIcon(mood.type)}
              </span>
              <div>
                <div className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  AI Sentiment Telemetry
                  <span
                    className="px-1.5 py-0.2 rounded text-[9px] font-mono border"
                    style={{
                      color: 'var(--mood-color)',
                      borderColor: 'var(--mood-border)',
                      backgroundColor: 'var(--mood-bg)',
                    }}
                  >
                    LIVE
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Real-time CSS Variable Pipeline
                </div>
              </div>
            </div>
          </div>

          {/* Current State & Summary */}
          <div className="mb-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Primary Valence:</span>
              <span
                className="font-bold font-mono text-[11px]"
                style={{ color: 'var(--mood-color)' }}
              >
                {mood.valence > 0 ? `+${mood.valence.toFixed(2)}` : mood.valence.toFixed(2)}
              </span>
            </div>

            {/* Valence Spectrum Bar */}
            <div className="w-full h-1.5 rounded-full bg-[#152030] overflow-hidden p-0.5 border border-[#203045]">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${valencePct}%`,
                  backgroundColor: 'var(--mood-color)',
                  boxShadow: '0 0 8px var(--mood-color)',
                }}
              />
            </div>

            <p className="text-[11px] text-slate-300 pt-1 leading-relaxed">
              {mood.summary}
            </p>
          </div>

          {/* Detected Cues / Emotion Markers */}
          <div className="mb-3 pt-2 border-t border-[#1a2638] text-[11px]">
            <span className="text-slate-400 text-[10px] uppercase tracking-wider block mb-1.5">
              Sentiment Triggers:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {mood.detectedTags && mood.detectedTags.length > 0 ? (
                mood.detectedTags.map((tag, idx) => (
                  <span
                    key={`tag-${idx}`}
                    className="px-2 py-0.5 rounded text-[10px] font-mono border"
                    style={{
                      color: 'var(--mood-color)',
                      borderColor: 'var(--mood-border)',
                      backgroundColor: 'var(--mood-bg)',
                    }}
                  >
                    [{tag}]
                  </span>
                ))
              ) : mood.keywordsMatched && mood.keywordsMatched.length > 0 ? (
                mood.keywordsMatched.map((kw, idx) => (
                  <span
                    key={`kw-${idx}`}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#131d2c] border border-[#233349] text-slate-300"
                  >
                    {kw}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-400 font-mono italic">
                  Harmonic baseline tone
                </span>
              )}
            </div>
          </div>

          {/* Context Snippet */}
          <div className="pt-2 border-t border-[#1a2638] text-[10px]">
            <div className="flex items-center gap-1 text-slate-400 mb-1">
              <Info className="w-3 h-3 text-slate-500" />
              <span>Source: Most Recent Assistant Message</span>
            </div>
            <div className="p-2 rounded-lg bg-[#090e18] border border-[#182333] text-slate-300 font-mono text-[10px] leading-normal line-clamp-2">
              "{previewText}"
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
