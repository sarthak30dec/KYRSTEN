import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Circle,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  ExternalLink,
  CalendarDays,
  ListFilter,
  Check,
  Tag,
  AlertCircle,
  LogOut,
  Sliders,
  Trophy,
  Flame,
  Tv,
  MapPin,
  Radio,
} from 'lucide-react';
import { CalendarTask, TaskPriority, TaskStatus } from '../types';
import {
  GoogleCalendarManager,
  formatTimeDisplay,
  formatDateHeader,
} from '../services/googleCalendarService';
import { SportsCalendarView } from './SportsCalendarView';
import { LiveSportsModal } from './LiveSportsModal';
import { SPORTS_SCHEDULES, SportsEvent } from '../data/sportsSchedules';
import { getCustomSportsFixtures } from '../services/dynamicSportsService';

interface TaskCalendarSectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask?: (task: CalendarTask) => void;
  externalCommand?: {
    action: string;
    task?: any;
    taskId?: string;
    query?: string;
    timestamp: number;
  } | null;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  urgent: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/50' },
  high: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/50' },
  medium: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/50' },
  low: { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/50' },
};

const CATEGORY_COLORS: Record<string, string> = {
  work: '#06b6d4',
  focus: '#8b5cf6',
  meeting: '#3b82f6',
  personal: '#ec4899',
  health: '#10b981',
  reminder: '#f59e0b',
};

export const TaskCalendarSection: React.FC<TaskCalendarSectionProps> = ({
  isOpen,
  onClose,
  onSelectTask,
  externalCommand,
}) => {
  const calendarManager = useMemo(() => GoogleCalendarManager.getInstance(), []);
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [authStatus, setAuthStatus] = useState(calendarManager.getAuthStatus());
  const [mainTab, setMainTab] = useState<'schedule' | 'sports'>('schedule');
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'agenda'>('day');
  const [showSportsOverlay, setShowSportsOverlay] = useState<boolean>(true);
  const [isLiveSportsModalOpen, setIsLiveSportsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Modal / Form state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    date: selectedDate,
    startTime: `${selectedDate}T10:00`,
    endTime: `${selectedDate}T11:00`,
    priority: 'medium' as TaskPriority,
    category: 'work' as 'work' | 'personal' | 'focus' | 'meeting' | 'health' | 'reminder',
    allDay: false,
    color: '#06b6d4',
    location: '',
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Direct Token Input for manual import
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [manualToken, setManualToken] = useState('');

  // Set of sports event IDs currently added to user's schedule
  const scheduledEventIds = useMemo(() => {
    const ids = new Set<string>();
    tasks.forEach((t) => {
      if (t.id.startsWith('sports-')) {
        ids.add(t.id.replace('sports-', ''));
      }
    });
    return ids;
  }, [tasks]);

  // Handler to toggle adding a sports event directly to Kyrsten tasks / Google Calendar
  const handleAddSportsToSchedule = (event: SportsEvent) => {
    const taskId = `sports-${event.id}`;
    const exists = tasks.some((t) => t.id === taskId);
    if (exists) {
      calendarManager.deleteTask(taskId);
      setSyncNotice(`Removed "${event.title}" from your schedule`);
    } else {
      calendarManager.addTask({
        id: taskId,
        title: `${event.flag} ${event.title} (${event.format})`,
        description: `${event.tournament} | Venue: ${event.venue}, ${event.location} | Timing: ${event.startTime} (${event.timeZoneInfo}) | TV: ${event.tvBroadcast || 'F1 TV / Hotstar / JioCinema'} | ${event.description}`,
        date: event.startDate,
        startTime: `${event.startDate}T${event.startTime}`,
        endTime: `${event.startDate}T${event.endTime}`,
        priority: 'high',
        status: 'pending',
        category: 'personal',
        location: `${event.venue}, ${event.location}`,
        color:
          event.sport === 'f1'
            ? '#ef4444'
            : event.category === 'cricket_women'
            ? '#ec4899'
            : event.category === 'cricket_ipl'
            ? '#eab308'
            : '#0284c7',
      });
      setSyncNotice(`Added "${event.title}" to your schedule`);
    }
    setTimeout(() => setSyncNotice(null), 4000);
  };

  // Compute sportsInitialCategory from externalCommand query if available
  const sportsInitialCategory = useMemo(() => {
    if (!externalCommand?.query) return 'all';
    const q = externalCommand.query.toLowerCase();
    if (q.includes('ipl')) return 'cricket_ipl';
    if (q.includes('women')) return 'cricket_women';
    if (q.includes('cricket') || q.includes('score') || q.includes('india') || q.includes('west indies') || q.includes('australia') || q.includes('match')) return 'cricket';
    if (q.includes('f1') || q.includes('formula 1') || q.includes('grand prix') || q.includes('standings')) return 'f1';
    return 'all';
  }, [externalCommand?.query, externalCommand?.timestamp]);

  // Find any official sports fixtures occurring on the selected date
  const selectedDateSportsEvents = useMemo(() => {
    const combined = [...SPORTS_SCHEDULES, ...getCustomSportsFixtures()];
    return combined.filter((e) => {
      return e.startDate <= selectedDate && e.endDate >= selectedDate;
    });
  }, [selectedDate]);

  // Load and subscribe to task & auth updates
  useEffect(() => {
    setTasks(calendarManager.getTasks());
    setAuthStatus(calendarManager.getAuthStatus());

    const unsubscribe = calendarManager.subscribe(() => {
      setTasks(calendarManager.getTasks());
      setAuthStatus(calendarManager.getAuthStatus());
    });

    return () => unsubscribe();
  }, [calendarManager]);

  // Handle external Kyrsten voice commands dispatched to calendar safely
  const lastProcessedCmdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!externalCommand) return;
    if (externalCommand.timestamp && lastProcessedCmdRef.current === externalCommand.timestamp) {
      return;
    }
    lastProcessedCmdRef.current = externalCommand.timestamp || Date.now();

    if (
      externalCommand.action === 'open_sports' ||
      (externalCommand.query &&
        /sport|cricket|ipl|f1|formula 1|grand prix|race|match|premier league|nba|wimbledon/i.test(
          externalCommand.query
        ))
    ) {
      setMainTab('sports');
      setSyncNotice('Kyrsten switched to Sports Calendar');
      setTimeout(() => setSyncNotice(null), 3000);
    } else if (externalCommand.action === 'open_schedule') {
      setMainTab('schedule');
    } else if (externalCommand.action === 'add_task' && externalCommand.task) {
      calendarManager.addTask(externalCommand.task);
      setSyncNotice(`Kyrsten added task: "${externalCommand.task.title}"`);
      setTimeout(() => setSyncNotice(null), 4000);
    } else if (externalCommand.action === 'delete_task' && externalCommand.taskId) {
      calendarManager.deleteTask(externalCommand.taskId);
      setSyncNotice(`Kyrsten removed task from schedule`);
      setTimeout(() => setSyncNotice(null), 4000);
    } else if (externalCommand.action === 'update_task' && externalCommand.taskId && externalCommand.task) {
      calendarManager.updateTask(externalCommand.taskId, externalCommand.task);
      setSyncNotice(`Kyrsten updated schedule`);
      setTimeout(() => setSyncNotice(null), 4000);
    } else if (externalCommand.action === 'sync') {
      handleSyncGoogle();
    }
  }, [externalCommand, calendarManager]);

  // Filter tasks for current date view
  const dayTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterCategory !== 'all' && t.category !== filterCategory) return false;
      return t.date === selectedDate || t.startTime?.startsWith(selectedDate);
    });
  }, [tasks, selectedDate, filterCategory]);

  const allFilteredTasks = useMemo(() => {
    if (filterCategory === 'all') return tasks;
    return tasks.filter((t) => t.category === filterCategory);
  }, [tasks, filterCategory]);

  // Navigation handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    const d = new Date();
    setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  // Google Sync
  const handleSyncGoogle = async () => {
    setIsSyncing(true);
    setSyncNotice('Connecting to Google Calendar...');
    try {
      const res = await calendarManager.importGoogleCalendarEvents();
      if (res.error) {
        setSyncNotice(`Sync Notice: ${res.error}`);
      } else {
        setSyncNotice(`Synced ${res.importedCount} event(s) from Google Calendar`);
      }
    } catch (err: any) {
      setSyncNotice(`Failed to sync: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncNotice(null), 5000);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSyncing(true);
    const success = await calendarManager.requestGoogleCalendarLogin();
    setIsSyncing(false);
    if (!success) {
      // If popup was blocked or GIS client was restricted, offer direct token input
      setShowTokenInput(true);
    }
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    calendarManager.setAccessTokenDirect(manualToken.trim(), 'Google Workspace User');
    setManualToken('');
    setShowTokenInput(false);
    setSyncNotice('Google OAuth token connected! Syncing events...');
    setTimeout(() => setSyncNotice(null), 4000);
  };

  // Open Create Modal
  const openNewTaskModal = (hour?: number) => {
    setEditingTaskId(null);
    const h = hour !== undefined ? String(hour).padStart(2, '0') : '09';
    const endH = hour !== undefined ? String((hour + 1) % 24).padStart(2, '0') : '10';

    setTaskForm({
      title: '',
      description: '',
      date: selectedDate,
      startTime: `${selectedDate}T${h}:00`,
      endTime: `${selectedDate}T${endH}:00`,
      priority: 'medium',
      category: 'work',
      allDay: false,
      color: '#06b6d4',
      location: '',
    });
    setIsTaskModalOpen(true);
  };

  // Open Edit Modal
  const openEditTaskModal = (task: CalendarTask) => {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      date: task.date,
      startTime: task.startTime,
      endTime: task.endTime,
      priority: task.priority,
      category: task.category || 'work',
      allDay: !!task.allDay,
      color: task.color || '#06b6d4',
      location: task.location || '',
    });
    setIsTaskModalOpen(true);
  };

  // Save Task
  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    if (editingTaskId) {
      calendarManager.updateTask(editingTaskId, {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        date: taskForm.date,
        startTime: taskForm.startTime,
        endTime: taskForm.endTime,
        priority: taskForm.priority,
        category: taskForm.category,
        allDay: taskForm.allDay,
        color: CATEGORY_COLORS[taskForm.category] || taskForm.color,
        location: taskForm.location.trim(),
      });
      setSyncNotice('Task updated');
    } else {
      calendarManager.addTask({
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        date: taskForm.date,
        startTime: taskForm.startTime,
        endTime: taskForm.endTime,
        priority: taskForm.priority,
        status: 'pending',
        category: taskForm.category,
        allDay: taskForm.allDay,
        color: CATEGORY_COLORS[taskForm.category] || taskForm.color,
        location: taskForm.location.trim(),
      });
      setSyncNotice('Task added to schedule');
    }

    setIsTaskModalOpen(false);
    setTimeout(() => setSyncNotice(null), 3000);
  };

  const handleToggleTaskStatus = (task: CalendarTask) => {
    const nextStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    calendarManager.updateTask(task.id, { status: nextStatus });
  };

  const handleDeleteTask = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    calendarManager.deleteTask(id);
    setSyncNotice('Task deleted');
    setTimeout(() => setSyncNotice(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div
        id="kyrsten-task-calendar-modal"
        className="relative w-full max-w-6xl h-[92vh] flex flex-col rounded-2xl bg-slate-900/95 border border-cyan-500/30 shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-cyan-500/20 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-wider text-white font-mono uppercase">
                  Kyrsten Schedule & Task Calendar
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 border border-cyan-500/40 text-cyan-300">
                  WORKSPACE LINKED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Google Calendar time-block layout, bidirectional task dispatch & Kyrsten voice control
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Google Sync Button */}
            {authStatus.isSignedIn ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline text-emerald-300 font-mono truncate max-w-[150px]">
                  {authStatus.userEmail || 'Google Synced'}
                </span>
                <button
                  type="button"
                  onClick={handleSyncGoogle}
                  disabled={isSyncing}
                  className="p-1 rounded hover:bg-emerald-500/20 text-emerald-300 transition-colors cursor-pointer"
                  title="Refresh Google Calendar events"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => calendarManager.signOutGoogle()}
                  className="p-1 rounded hover:bg-rose-500/20 text-rose-300 transition-colors cursor-pointer"
                  title="Disconnect Google Calendar"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 text-xs font-mono font-medium transition-all shadow-md hover:shadow-cyan-500/20 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Import Google Calendar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => openNewTaskModal()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close Calendar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync Notification Banner */}
        {syncNotice && (
          <div className="px-4 py-2 bg-cyan-950/60 border-b border-cyan-500/30 flex items-center justify-between text-xs text-cyan-200 font-mono animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>{syncNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncNotice(null)}
              className="text-cyan-400 hover:text-cyan-200 cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* Direct Token Fallback Dialog */}
        {showTokenInput && (
          <div className="p-4 bg-slate-950/90 border-b border-cyan-500/30 flex flex-col gap-2 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Manual Google OAuth Access Token Input
              </span>
              <button
                type="button"
                onClick={() => setShowTokenInput(false)}
                className="text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              If popups are restricted in this preview sandbox, paste your Google OAuth Bearer Token below to import calendar events directly.
            </p>
            <form onSubmit={handleManualTokenSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="ya29.a0AfH6SM..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-cyan-500/40 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Connect Token
              </button>
            </form>
          </div>
        )}

        {/* Navigation Sub-Tabs: Schedule vs Sports Hub */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-slate-950/90 border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMainTab('schedule')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer ${
                mainTab === 'schedule'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>My Schedule & Tasks</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  mainTab === 'schedule'
                    ? 'bg-slate-950/20 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMainTab('sports')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all cursor-pointer ${
                mainTab === 'sports'
                  ? 'bg-gradient-to-r from-rose-500 via-sky-500 to-pink-500 text-white font-bold shadow-md shadow-rose-500/25'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span>Sports Calendar</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/30 border border-white/20 text-white tracking-wider">
                IPL, CRICKET & F1
              </span>
            </button>

            {/* Separate Pop-up Button for Live Scores */}
            <button
              type="button"
              onClick={() => setIsLiveSportsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/40 transition-all cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.15)]"
              title="Open Live Scores in a separate pop-up screen"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </span>
              <span>Live Scores</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/30 text-rose-200">
                POP-UP
              </span>
            </button>
          </div>

          {mainTab === 'schedule' && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer select-none hover:text-cyan-300 transition-colors">
                <input
                  type="checkbox"
                  checked={showSportsOverlay}
                  onChange={(e) => setShowSportsOverlay(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <span className="text-[11px]">Overlay Sports Fixtures</span>
              </label>
            </div>
          )}
        </div>

        {/* View Controls & Date Bar (Only shown in My Schedule mode) */}
        {mainTab === 'schedule' && (
          <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-2.5 bg-slate-900/80 border-b border-white/5 gap-3">
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 border border-white/10 transition-colors cursor-pointer"
              >
                Today
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextDay}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm font-semibold text-white tracking-wide font-mono ml-1">
                {formatDateHeader(selectedDate)}
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="ml-2 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* View Mode & Filter */}
            <div className="flex items-center gap-3">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ListFilter className="w-3.5 h-3.5" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-slate-950 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="work">Work</option>
                  <option value="focus">Deep Focus</option>
                  <option value="meeting">Meeting</option>
                  <option value="personal">Personal</option>
                  <option value="health">Health</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>

              {/* View switcher */}
              <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-white/10 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setViewMode('day')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'day' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Day
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('agenda')}
                  className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'agenda' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Agenda
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative p-4 sm:p-6">
          {mainTab === 'sports' ? (
            <SportsCalendarView
              onAddToSchedule={handleAddSportsToSchedule}
              scheduledEventIds={scheduledEventIds}
              initialCategory={sportsInitialCategory}
            />
          ) : (
            <>
              {/* Daily Sports Overlay Banner if sports events occur on selectedDate */}
              {showSportsOverlay && selectedDateSportsEvents.length > 0 && (
                <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/40 shadow-lg space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-300">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>OFFICIAL SPORTS FIXTURES ON THIS DAY ({formatDateHeader(selectedDate)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMainTab('sports')}
                      className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                    >
                      View All in Sports Hub →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDateSportsEvents.map((evt) => {
                      const isScheduled = scheduledEventIds.has(evt.id);
                      return (
                        <div
                          key={evt.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/90 border border-white/10 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base select-none">{evt.flag}</span>
                            <div className="min-w-0">
                              <h5 className="font-bold text-white truncate">{evt.title}</h5>
                              <p className="text-[10px] text-slate-400 truncate">
                                {evt.venue} · {evt.startTime} ({evt.timeZoneInfo})
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddSportsToSchedule(evt)}
                            className={`ml-2 px-2.5 py-1 rounded text-[10px] font-mono font-bold shrink-0 transition-colors cursor-pointer ${
                              isScheduled
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                            }`}
                          >
                            {isScheduled ? '✓ Scheduled' : '+ Add'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
          {viewMode === 'day' ? (
            /* Google Calendar Hourly Time-Slot Grid */
            <div className="relative min-h-[1440px] border-l border-cyan-500/20 ml-14 sm:ml-16">
              {HOURS.map((hour) => {
                const hourFormatted = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
                return (
                  <div
                    key={`slot-${hour}`}
                    onClick={() => openNewTaskModal(hour)}
                    className="group relative h-16 border-b border-white/5 hover:bg-cyan-500/[0.03] transition-colors cursor-pointer flex items-center"
                  >
                    {/* Hour Label */}
                    <div className="absolute -left-14 sm:-left-16 w-12 text-right text-[11px] font-mono text-slate-500 select-none">
                      {hourFormatted}
                    </div>

                    {/* Half-hour subtle divider */}
                    <div className="absolute top-1/2 left-0 right-0 border-b border-white/[0.02]" />

                    {/* Quick Add indicator on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-4 flex items-center gap-1 text-[11px] text-cyan-400/80 font-mono">
                      <Plus className="w-3 h-3" />
                      <span>Click to schedule at {hourFormatted}</span>
                    </div>
                  </div>
                );
              })}

              {/* Render Tasks Positioned on Time Grid */}
              {dayTasks.map((task) => {
                let topPx = 9 * 60; // default 9:00 AM
                let heightPx = 60; // 1 hour default

                try {
                  const sTime = task.startTime ? new Date(task.startTime) : null;
                  const eTime = task.endTime ? new Date(task.endTime) : null;

                  if (sTime && !isNaN(sTime.getTime())) {
                    const startMin = sTime.getHours() * 60 + sTime.getMinutes();
                    topPx = (startMin / 60) * 64; // each hour is 64px (h-16)

                    if (eTime && !isNaN(eTime.getTime())) {
                      const endMin = eTime.getHours() * 60 + eTime.getMinutes();
                      const diff = Math.max(30, endMin - startMin);
                      heightPx = (diff / 60) * 64;
                    }
                  }
                } catch (_) {}

                const priorityStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
                const isDone = task.status === 'completed';

                return (
                  <div
                    key={task.id}
                    style={{
                      top: `${topPx}px`,
                      height: `${Math.max(48, heightPx)}px`,
                      backgroundColor: `${task.color || '#06b6d4'}22`,
                      borderColor: task.color || '#06b6d4',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditTaskModal(task);
                    }}
                    className={`absolute left-2 right-2 sm:right-6 rounded-xl border p-2.5 transition-all hover:scale-[1.005] hover:shadow-xl cursor-pointer select-none group flex flex-col justify-between overflow-hidden z-10 ${
                      isDone ? 'opacity-60 border-slate-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTaskStatus(task);
                          }}
                          className="mt-0.5 text-cyan-400 hover:text-cyan-200 transition-colors shrink-0"
                          title={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-400 group-hover:text-cyan-400" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <h4
                            className={`text-xs sm:text-sm font-semibold tracking-wide truncate ${
                              isDone ? 'line-through text-slate-400' : 'text-white'
                            }`}
                          >
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                        {task.syncedWithGoogle && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40"
                            title="Synced with Google Calendar"
                          >
                            G-CAL
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-bold border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
                        >
                          {task.priority}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTask(task.id, e)}
                          className="p-1 rounded hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                      <span className="flex items-center gap-1 text-cyan-300">
                        <Clock className="w-3 h-3" />
                        {formatTimeDisplay(task.startTime)} – {formatTimeDisplay(task.endTime)}
                      </span>
                      {task.category && (
                        <span className="capitalize text-slate-400 font-sans">
                          {task.category}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Agenda List View */
            <div className="space-y-3 max-w-4xl mx-auto">
              {allFilteredTasks.length === 0 ? (
                <div className="py-16 text-center text-slate-500 font-mono text-sm">
                  No tasks recorded for this filter. Ask Kyrsten or click &quot;New Task&quot; to schedule.
                </div>
              ) : (
                allFilteredTasks.map((task) => {
                  const isDone = task.status === 'completed';
                  const priorityStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;

                  return (
                    <div
                      key={task.id}
                      onClick={() => openEditTaskModal(task)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border bg-slate-950/60 transition-all hover:border-cyan-500/50 cursor-pointer ${
                        isDone ? 'border-slate-800 opacity-60' : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTaskStatus(task);
                          }}
                          className="text-slate-400 hover:text-cyan-400"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-500" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: task.color || '#06b6d4' }}
                            />
                            <h4
                              className={`text-sm font-semibold truncate ${
                                isDone ? 'line-through text-slate-500' : 'text-white'
                              }`}
                            >
                              {task.title}
                            </h4>
                          </div>
                          {task.description && (
                            <p className="text-xs text-slate-400 line-clamp-1 ml-4.5 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
                        <span className="text-slate-400">
                          {task.date} · {formatTimeDisplay(task.startTime)}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
                        >
                          {task.priority}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTask(task.id, e)}
                          className="p-1.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}
    </div>

        {/* Task Create / Edit Modal */}
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-cyan-500/40 p-5 sm:p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-cyan-400" />
                  {editingTaskId ? 'Edit Calendar Task' : 'Schedule New Task'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTask} className="mt-4 space-y-3.5 text-xs">
                {/* Title */}
                <div>
                  <label className="block text-slate-300 font-mono mb-1">TASK TITLE *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deep Work Session, Team Meeting..."
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 text-sm"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-300 font-mono mb-1">DESCRIPTION</label>
                  <textarea
                    rows={2}
                    placeholder="Notes, links, agenda items or goals..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Date & Time Slot */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-slate-300 font-mono mb-1">DATE</label>
                    <input
                      type="date"
                      required
                      value={taskForm.date}
                      onChange={(e) => {
                        const newD = e.target.value;
                        const sTime = taskForm.startTime.split('T')[1] || '09:00';
                        const eTime = taskForm.endTime.split('T')[1] || '10:00';
                        setTaskForm({
                          ...taskForm,
                          date: newD,
                          startTime: `${newD}T${sTime}`,
                          endTime: `${newD}T${eTime}`,
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-mono mb-1">START TIME</label>
                    <input
                      type="time"
                      required
                      value={taskForm.startTime.split('T')[1] || '09:00'}
                      onChange={(e) =>
                        setTaskForm({
                          ...taskForm,
                          startTime: `${taskForm.date}T${e.target.value}`,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-mono mb-1">END TIME</label>
                    <input
                      type="time"
                      required
                      value={taskForm.endTime.split('T')[1] || '10:00'}
                      onChange={(e) =>
                        setTaskForm({
                          ...taskForm,
                          endTime: `${taskForm.date}T${e.target.value}`,
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Priority & Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-mono mb-1">PRIORITY</label>
                    <select
                      value={taskForm.priority}
                      onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-mono mb-1">CATEGORY</label>
                    <select
                      value={taskForm.category}
                      onChange={(e) =>
                        setTaskForm({
                          ...taskForm,
                          category: e.target.value as any,
                          color: CATEGORY_COLORS[e.target.value] || '#06b6d4',
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                    >
                      <option value="work">Work</option>
                      <option value="focus">Deep Focus</option>
                      <option value="meeting">Meeting</option>
                      <option value="personal">Personal</option>
                      <option value="health">Health</option>
                      <option value="reminder">Reminder</option>
                    </select>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsTaskModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold tracking-wide shadow-lg shadow-cyan-500/20 cursor-pointer"
                  >
                    {editingTaskId ? 'Update Task' : 'Save Task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Live Sports Telemetry Pop-up Modal */}
        <LiveSportsModal
          isOpen={isLiveSportsModalOpen}
          onClose={() => setIsLiveSportsModalOpen(false)}
        />
      </div>
    </div>
  );
};
