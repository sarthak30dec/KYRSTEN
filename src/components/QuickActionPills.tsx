import React from 'react';
import { Sun, Activity, Zap, Power, Volume2, Monitor, Moon, Calendar, Radio } from 'lucide-react';

interface QuickActionPillsProps {
  onSelectAction: (prompt: string) => void;
  onOpenVoiceprint?: () => void;
  onToggleGameMode?: () => void;
  onOpenScreensaver?: () => void;
  onOpenCalendar?: () => void;
  onOpenLiveScores?: () => void;
  disabled?: boolean;
}

export const QuickActionPills: React.FC<QuickActionPillsProps> = ({
  onSelectAction,
  onOpenVoiceprint: _onOpenVoiceprint,
  onToggleGameMode,
  onOpenScreensaver,
  onOpenCalendar,
  onOpenLiveScores,
  disabled,
}) => {
  const commands = [
    {
      id: 'wake',
      icon: <Sun className="w-4 h-4 text-slate-300" />,
      label: 'Wake Up',
      onClick: () => onSelectAction("Wake up, daddy's home"),
    },
    {
      id: 'goodnight',
      icon: <Moon className="w-4 h-4 text-purple-300" />,
      label: 'Sweet Dreams',
      onClick: () => onSelectAction('Good night Kyrsten, sweet dreams'),
    },
    {
      id: 'livescores',
      icon: <Radio className="w-4 h-4 text-rose-400 animate-pulse" />,
      label: 'Live Scores Pop-up',
      onClick: () => {
        if (onOpenLiveScores) onOpenLiveScores();
        else onSelectAction('Kyrsten, open live score viewer pop-up.');
      },
    },
    {
      id: 'calendar',
      icon: <Calendar className="w-4 h-4 text-cyan-300" />,
      label: 'Task Calendar',
      onClick: () => {
        if (onOpenCalendar) onOpenCalendar();
        else onSelectAction('Kyrsten, show my task calendar and schedule.');
      },
    },
    {
      id: 'diagnostics',
      icon: <Activity className="w-4 h-4 text-slate-300" />,
      label: 'System Diagnostic',
      onClick: () => onSelectAction('Kyrsten, run neural subsystem diagnostics.'),
    },
    {
      id: 'lowpower',
      icon: <Zap className="w-4 h-4 text-slate-300" />,
      label: 'Activate Low-Power',
      onClick: () => {
        if (onToggleGameMode) onToggleGameMode();
        else onSelectAction('Kyrsten, activate game mode low resource profile.');
      },
    },
    {
      id: 'solo',
      icon: <Power className="w-4 h-4 text-slate-300" />,
      label: 'Standby Solo Mode',
      onClick: () => {
        if (onToggleGameMode) onToggleGameMode();
        else onSelectAction('Kyrsten, enter standby solo power mode.');
      },
    },
    {
      id: 'alerts',
      icon: <Volume2 className="w-4 h-4 text-slate-300" />,
      label: 'Activate Alerts',
      onClick: () => onSelectAction('Kyrsten, system alert integrity scan status report.'),
    },
    {
      id: 'modator',
      icon: <Monitor className="w-4 h-4 text-slate-300" />,
      label: 'Activate Modator',
      onClick: () => {
        if (onOpenScreensaver) onOpenScreensaver();
        else onSelectAction('Kyrsten, activate matrix screensaver mode.');
      },
    },
  ];

  return (
    <div className="rounded-2xl bg-[#121824]/85 backdrop-blur-xl border border-[#202b3d] p-4 flex flex-col gap-3 shadow-xl">
      <div className="text-[11px] font-bold tracking-[0.14em] text-slate-400 uppercase font-sans">
        QUICK VOICE COMMANDS
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {commands.map((cmd) => (
          <button
            key={cmd.id}
            onClick={cmd.onClick}
            disabled={disabled}
            className="flex flex-col items-start gap-2 p-3 rounded-xl bg-[#172132]/75 hover:bg-[#1d2a40] border border-[#25344c] hover:border-cyan-500/40 text-left transition-all duration-150 cursor-pointer disabled:opacity-50 group"
          >
            <div className="p-1 rounded-md text-slate-300 group-hover:text-cyan-300 transition-colors">
              {cmd.icon}
            </div>
            <span className="text-xs font-medium text-slate-200 group-hover:text-white leading-snug">
              {cmd.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
