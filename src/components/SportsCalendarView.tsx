import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Tv,
  Search,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  Share2,
  Trash2,
  CheckCircle2,
  Zap,
  RefreshCw,
  Radio,
  Activity,
  X,
  Flame,
} from 'lucide-react';
import { SPORTS_SCHEDULES, SportsEvent } from '../data/sportsSchedules';
import {
  getCustomSportsFixtures,
  addDynamicSportFixtures,
  removeCustomSportFixtures,
  clearAllCustomSports,
} from '../services/dynamicSportsService';
import {
  fetchLiveSports,
  getLiveSportsData,
  LiveSportsPayload,
} from '../services/liveSportsService';
import { LiveSportsModal } from './LiveSportsModal';

interface SportsCalendarViewProps {
  onAddToSchedule: (event: SportsEvent) => void;
  scheduledEventIds: Set<string>;
  initialCategory?: string;
}

interface DateGroup {
  date: string;
  isToday: boolean;
  isSyntheticToday?: boolean;
  events: SportsEvent[];
}

export type CricketSubCategory = 'all_cricket' | 'cricket_men' | 'cricket_women' | 'cricket_ipl';

export const SportsCalendarView: React.FC<SportsCalendarViewProps> = ({
  onAddToSchedule,
  scheduledEventIds,
  initialCategory = 'all',
}) => {
  // Main Sport Selection (Decluttered: 'all' | 'cricket' | 'f1' | custom)
  const [selectedMainSport, setSelectedMainSport] = useState<string>(() => {
    if (initialCategory.startsWith('cricket')) return 'cricket';
    if (initialCategory === 'f1') return 'f1';
    return 'all';
  });

  // Cricket Sub-Category Filter (Selected via clean Pop-up)
  const [cricketSubCategory, setCricketSubCategory] = useState<CricketSubCategory>(() => {
    if (initialCategory === 'cricket_ipl') return 'cricket_ipl';
    if (initialCategory === 'cricket_women') return 'cricket_women';
    if (initialCategory === 'cricket_men') return 'cricket_men';
    return 'all_cricket';
  });

  // Pop-up state for Cricket Sub-Category Selector
  const [isCricketPopupOpen, setIsCricketPopupOpen] = useState(false);
  const cricketButtonRef = useRef<HTMLButtonElement | null>(null);

  // Search & Year filter
  const [selectedYear, setSelectedYear] = useState<'all' | '2025' | '2026'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Accordion state: Track which single-date line rows are expanded
  const [expandedEventIds, setExpandedEventIds] = useState<Set<string>>(new Set());

  // Dynamic sports fixtures stored in localStorage
  const [customFixtures, setCustomFixtures] = useState<SportsEvent[]>(() => getCustomSportsFixtures());
  const [newSportInput, setNewSportInput] = useState('');
  const [isAddingDynamicSport, setIsAddingDynamicSport] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Real-Time Live Sports Telemetry (Cricket Live Score & F1 Standings)
  const [liveData, setLiveData] = useState<LiveSportsPayload>(() => getLiveSportsData());
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);
  const [liveTelemetryMode, setLiveTelemetryMode] = useState<'cricket' | 'f1'>('cricket');
  const [selectedCricketMatchId, setSelectedCricketMatchId] = useState<string>('live-ind-aus-01');
  const [showFullScorecard, setShowFullScorecard] = useState(false);
  const [copiedScoreId, setCopiedScoreId] = useState<string | null>(null);

  // Active cricket match to display in live viewer
  const activeCricketMatch = useMemo(() => {
    return (
      liveData.cricket.liveMatches.find((m) => m.matchId === selectedCricketMatchId) ||
      liveData.cricket.liveMatches.find((m) => m.isLive) ||
      liveData.cricket.liveMatches[0]
    );
  }, [liveData.cricket.liveMatches, selectedCricketMatchId]);

  // Sync initialCategory safely if it changes
  useEffect(() => {
    if (!initialCategory) return;
    if (initialCategory.startsWith('cricket')) {
      setSelectedMainSport('cricket');
      if (initialCategory === 'cricket_ipl') {
        setCricketSubCategory('cricket_ipl');
        setSelectedCricketMatchId('ipl-countdown');
      } else if (initialCategory === 'cricket_women') {
        setCricketSubCategory('cricket_women');
        setSelectedCricketMatchId('live-indw-engw-02');
      } else if (initialCategory === 'cricket_men') {
        setCricketSubCategory('cricket_men');
      }
    } else if (initialCategory === 'f1') {
      setSelectedMainSport('f1');
    }
  }, [initialCategory]);

  const handleCopyScore = (match: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const text = `${match.matchTitle}: ${match.team1.shortName} ${match.team1.score} (${match.team1.overs} ov) vs ${match.team2.shortName} ${match.team2.score} (${match.team2.overs} ov) - ${match.summary} [${match.venue}]`;
      navigator.clipboard.writeText(text);
      setCopiedScoreId(match.matchId);
      setStatusNotice(`Copied scorecard for ${match.matchTitle}`);
      setTimeout(() => setCopiedScoreId(null), 3000);
    } catch {}
  };

  // Today reference to auto-scroll when opened
  const todayNodeRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Compute Today's ISO date string (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Sync Live Telemetry Mode to Main Sport choice
  useEffect(() => {
    if (selectedMainSport === 'cricket') {
      setLiveTelemetryMode((prev) => (prev === 'cricket' ? prev : 'cricket'));
    } else if (selectedMainSport === 'f1') {
      setLiveTelemetryMode((prev) => (prev === 'f1' ? prev : 'f1'));
    }
  }, [selectedMainSport]);

  // Real-Time Periodic Polling (every 8 seconds to update live scores & standings)
  useEffect(() => {
    let isMounted = true;
    const updateLive = async () => {
      try {
        const fresh = await fetchLiveSports();
        if (isMounted) setLiveData({ ...fresh });
      } catch {}
    };

    updateLive();
    const interval = setInterval(updateLive, 8000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleManualLiveRefresh = async () => {
    setIsRefreshingLive(true);
    try {
      const fresh = await fetchLiveSports();
      setLiveData({ ...fresh });
      setStatusNotice('Live telemetry refreshed in real-time');
    } finally {
      setIsRefreshingLive(false);
    }
  };

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isCricketPopupOpen &&
        cricketButtonRef.current &&
        !cricketButtonRef.current.contains(e.target as Node) &&
        !(e.target as HTMLElement).closest('.cricket-popup-container')
      ) {
        setIsCricketPopupOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCricketPopupOpen]);

  // Auto-dismiss status notice after 4s
  useEffect(() => {
    if (statusNotice) {
      const timer = setTimeout(() => setStatusNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusNotice]);

  // Combine static official schedules with dynamically added fixtures
  const allEvents = useMemo(() => {
    return [...SPORTS_SCHEDULES, ...customFixtures];
  }, [customFixtures]);

  // Available custom dynamically added sports
  const customMainSports = useMemo(() => {
    const sports = new Set<string>();
    customFixtures.forEach((evt) => {
      if (evt.sport && evt.sport !== 'cricket' && evt.sport !== 'f1') {
        sports.add(evt.sport);
      }
    });
    return Array.from(sports);
  }, [customFixtures]);

  // Filtered sports list based on decluttered main sport & cricket sub-category
  const filteredEvents = useMemo(() => {
    return allEvents
      .filter((event) => {
        // Main sport filter
        if (selectedMainSport !== 'all') {
          if (selectedMainSport === 'cricket') {
            if (event.sport !== 'cricket') return false;
            // Sub-category popup selection
            if (cricketSubCategory === 'cricket_men' && event.category !== 'cricket_men') return false;
            if (cricketSubCategory === 'cricket_women' && event.category !== 'cricket_women') return false;
            if (cricketSubCategory === 'cricket_ipl' && event.category !== 'cricket_ipl') return false;
          } else if (selectedMainSport === 'f1') {
            if (event.sport !== 'f1') return false;
          } else {
            // Custom main sport
            if (event.sport !== selectedMainSport && event.category !== selectedMainSport) return false;
          }
        }

        // Year filter
        if (selectedYear !== 'all') {
          const startYear = event.startDate.split('-')[0];
          const endYear = event.endDate.split('-')[0];
          if (startYear !== selectedYear && endYear !== selectedYear) return false;
        }

        // Text search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = event.title.toLowerCase().includes(q);
          const matchOpponent = event.opponentOrCircuit.toLowerCase().includes(q);
          const matchVenue = event.venue.toLowerCase().includes(q);
          const matchLocation = event.location.toLowerCase().includes(q);
          const matchTournament = event.tournament.toLowerCase().includes(q);
          const matchDescription = event.description.toLowerCase().includes(q);
          return matchTitle || matchOpponent || matchVenue || matchLocation || matchTournament || matchDescription;
        }

        return true;
      })
      .sort((a, b) => {
        const dateComp = a.startDate.localeCompare(b.startDate);
        if (dateComp !== 0) return dateComp;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [allEvents, selectedMainSport, cricketSubCategory, selectedYear, searchQuery]);

  // Group events by date along timeline line, always ensuring TODAY is present
  const timelineDateGroups = useMemo<DateGroup[]>(() => {
    const groupsMap = new Map<string, SportsEvent[]>();

    filteredEvents.forEach((evt) => {
      const d = evt.startDate;
      if (!groupsMap.has(d)) {
        groupsMap.set(d, []);
      }
      groupsMap.get(d)!.push(evt);
    });

    const dateKeys = Array.from(groupsMap.keys()).sort();
    const hasToday = groupsMap.has(todayStr);
    const result: DateGroup[] = [];

    if (!hasToday) {
      let inserted = false;
      for (const d of dateKeys) {
        if (!inserted && d > todayStr) {
          result.push({
            date: todayStr,
            isToday: true,
            isSyntheticToday: true,
            events: [],
          });
          inserted = true;
        }
        result.push({
          date: d,
          isToday: d === todayStr,
          events: groupsMap.get(d)!,
        });
      }
      if (!inserted) {
        result.push({
          date: todayStr,
          isToday: true,
          isSyntheticToday: true,
          events: [],
        });
      }
    } else {
      for (const d of dateKeys) {
        result.push({
          date: d,
          isToday: d === todayStr,
          events: groupsMap.get(d)!,
        });
      }
    }

    return result;
  }, [filteredEvents, todayStr]);

  // Next upcoming fixture after today
  const nextUpcomingEvent = useMemo(() => {
    return allEvents
      .filter((e) => e.startDate >= todayStr)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] || null;
  }, [allEvents, todayStr]);

  // Auto-scroll to Today on open
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (todayNodeRef.current) {
        todayNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, []);

  const handleScrollToToday = () => {
    if (todayNodeRef.current) {
      todayNodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Format date display (e.g. "SEP 27, 2026")
  const formatDateTitle = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const month = dt.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
      const dayNum = String(d).padStart(2, '0');
      const weekday = dt.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        formatted: `${month} ${dayNum}, ${y}`,
        weekday,
      };
    } catch {
      return {
        formatted: dateStr,
        weekday: '',
      };
    }
  };

  // Toggle expanding an event's extra info accordion
  const toggleEventExpand = (eventId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  // Expand / collapse all visible
  const handleToggleExpandAll = () => {
    if (expandedEventIds.size >= filteredEvents.length && filteredEvents.length > 0) {
      setExpandedEventIds(new Set());
    } else {
      setExpandedEventIds(new Set(filteredEvents.map((e) => e.id)));
    }
  };

  // Dynamic Sport Addition Handler
  const handleAddSport = async (sportName: string) => {
    if (!sportName.trim()) return;
    setIsAddingDynamicSport(true);
    try {
      const result = await addDynamicSportFixtures(sportName.trim());
      const updated = getCustomSportsFixtures();
      setCustomFixtures(updated);
      setNewSportInput('');
      setStatusNotice(result.message);

      if (result.fixtures.length > 0) {
        setSelectedMainSport(result.fixtures[0].sport);
      }
    } catch {
      setStatusNotice('Unable to add fixtures for requested sport.');
    } finally {
      setIsAddingDynamicSport(false);
    }
  };

  // Copy fixture details
  const handleCopyFixture = (event: SportsEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const details = `${event.title}\nDate: ${event.startDate} at ${event.startTime} (${event.timeZoneInfo})\nVenue: ${event.venue}, ${event.location}\nBroadcast: ${event.tvBroadcast || 'Official Sports TV'}\nTournament: ${event.tournament}`;
    navigator.clipboard?.writeText(details);
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Helper for Category Badge & Circle Styling
  const getCategoryBadge = (event: SportsEvent) => {
    switch (event.category) {
      case 'cricket_ipl':
        return { label: 'IPL', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', circle: '#eab308' };
      case 'cricket_men':
        return { label: 'IND MEN', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40', circle: '#0284c7' };
      case 'cricket_women':
        return { label: 'IND WOMEN', bg: 'bg-pink-500/20 text-pink-300 border-pink-500/40', circle: '#ec4899' };
      case 'f1':
        return { label: 'F1 GP', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40', circle: '#ef4444' };
      case 'football':
        return { label: 'FOOTBALL', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40', circle: '#3b82f6' };
      case 'basketball':
        return { label: 'NBA', bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40', circle: '#f97316' };
      case 'tennis':
        return { label: 'TENNIS', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', circle: '#10b981' };
      case 'motorsport':
        return { label: 'MOTOGP', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40', circle: '#8b5cf6' };
      case 'badminton':
        return { label: 'BWF', bg: 'bg-teal-500/20 text-teal-300 border-teal-500/40', circle: '#14b8a6' };
      default:
        return { label: event.sport.toUpperCase(), bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', circle: '#06b6d4' };
    }
  };

  // Label for Cricket Button
  const cricketButtonLabel = useMemo(() => {
    switch (cricketSubCategory) {
      case 'cricket_ipl':
        return 'Cricket: IPL (2025–26)';
      case 'cricket_men':
        return 'Cricket: India Men';
      case 'cricket_women':
        return 'Cricket: India Women';
      default:
        return 'Cricket (All)';
    }
  }, [cricketSubCategory]);

  return (
    <div className="flex flex-col h-full space-y-3 relative">
      {/* Toast Notice */}
      {statusNotice && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-950/95 border border-cyan-400 text-xs font-mono text-cyan-200 shadow-xl shadow-cyan-950/50 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400 shrink-0 animate-bounce" />
            <span>{statusNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-cyan-400 hover:text-white px-2 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. DEDICATED LIVE SCORES POP-UP BUTTON BANNER (User Request: Live section as a button for a separate pop-up screen) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-rose-950/50 via-slate-900 to-sky-950/40 border border-rose-500/40 shadow-xl font-mono">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3.5 w-3.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                LIVE SCORE & TELEMETRY CENTER
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                SEPARATE POP-UP SCREEN
              </span>
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
              <span className="text-amber-300 font-semibold">🔴 IND 178/3 (18.4) vs AUS · Need 9 off 8</span>
              <span className="text-slate-500">•</span>
              <span className="text-cyan-300">Choose any live match to inspect full live scores</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsLiveModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-400 hover:to-pink-400 text-white font-bold text-xs shadow-lg shadow-rose-500/30 transition-all cursor-pointer shrink-0"
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Open Live Match Center (Pop-up)</span>
        </button>
      </div>

      {/* 2. REAL-TIME LIVE STATUS SECTION (Clean, Minimal Scorecard or F1 Standings) */}
      <div className="rounded-xl border border-white/10 bg-slate-950/90 overflow-hidden shadow-lg">
        {/* Header Bar with Live Indicator & Telemetry Switcher */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-900/90 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-slate-300 flex items-center gap-1.5">
              <span>LIVE STATUS & TELEMETRY</span>
              <span className="text-[9px] text-emerald-400 font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/30">
                REAL-TIME
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Pop-up Screen Button */}
            <button
              type="button"
              onClick={() => setIsLiveModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-mono transition-colors cursor-pointer"
              title="Open Live Scores in a separate pop-up screen"
            >
              <Radio className="w-3 h-3 text-rose-400" />
              <span>Pop-up Screen</span>
            </button>

            {/* Live Sports Switcher (Cricket vs F1) */}
            <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-white/10 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setLiveTelemetryMode('cricket')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  liveTelemetryMode === 'cricket'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏏 Cricket Score
              </button>
              <button
                type="button"
                onClick={() => setLiveTelemetryMode('f1')}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  liveTelemetryMode === 'f1'
                    ? 'bg-rose-500 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏎️ F1 Standings
              </button>
            </div>

            {/* Real-time Refresh Button */}
            <button
              type="button"
              onClick={handleManualLiveRefresh}
              disabled={isRefreshingLive}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh live score and standings"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingLive ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Content Panel */}
        <div className="p-3">
          {liveTelemetryMode === 'cricket' ? (
            <div className="space-y-3">
              {/* Cricket Match Selector Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-white/5">
                {liveData.cricket.liveMatches.map((m) => {
                  const isSelected = activeCricketMatch.matchId === m.matchId;
                  return (
                    <button
                      key={m.matchId}
                      type="button"
                      onClick={() => {
                        setSelectedCricketMatchId(m.matchId);
                        setShowFullScorecard(false);
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/20 text-sky-200 border border-sky-400/50 shadow-sm'
                          : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-white/5'
                      }`}
                    >
                      {m.isLive ? (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                        </span>
                      ) : (
                        <span className="text-emerald-400 text-[10px]">✓</span>
                      )}
                      <span className="font-semibold">{m.team1.shortName} vs {m.team2.shortName}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                          m.isLive ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.isLive ? 'LIVE' : 'RESULT'}
                      </span>
                    </button>
                  );
                })}

                {/* TATA IPL Countdown Tab */}
                <button
                  type="button"
                  onClick={() => setSelectedCricketMatchId('ipl-countdown')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap transition-all cursor-pointer ${
                    selectedCricketMatchId === 'ipl-countdown'
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/50 shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-white/5'
                  }`}
                >
                  <span className="text-amber-400 text-xs">🏆</span>
                  <span className="font-semibold">TATA IPL 2025</span>
                  <span className="text-[9px] px-1 py-0.2 rounded font-bold uppercase bg-amber-500/20 text-amber-300">
                    OPENER
                  </span>
                </button>
              </div>

              {selectedCricketMatchId === 'ipl-countdown' ? (
                /* IPL COUNTDOWN SHOWCASE */
                <div className="p-3 rounded-lg bg-gradient-to-r from-amber-950/30 via-slate-900 to-amber-950/20 border border-amber-500/30 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-bold flex items-center gap-1.5">
                      <span>🏆</span>
                      <span>TATA IPL 2025/2026 SEASON COUNTDOWN</span>
                    </span>
                    <span className="text-[10px] text-amber-300/80 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      MARCH 22, 2025
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-white/5">
                    <div>
                      <div className="text-white font-bold text-sm">
                        {liveData.cricket.iplCountdown.teams}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        Venue: {liveData.cricket.iplCountdown.venue} · 19:30 IST Broadcast
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMainSport('cricket');
                        setCricketSubCategory('cricket_ipl');
                      }}
                      className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold cursor-pointer shrink-0"
                    >
                      View All 74 IPL Fixtures →
                    </button>
                  </div>
                </div>
              ) : (
                /* ACTIVE CRICKET MATCH TELEMETRY */
                <div className="space-y-2.5">
                  {/* Top Match Info Row */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-amber-400 font-bold truncate">{activeCricketMatch.series}</span>
                      <span>·</span>
                      <span className="truncate">{activeCricketMatch.venue}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase flex items-center gap-1 ${
                          activeCricketMatch.isLive
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {activeCricketMatch.isLive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping inline-block" />
                        )}
                        <span>{activeCricketMatch.status}</span>
                      </span>

                      {/* Copy Match Score */}
                      <button
                        type="button"
                        onClick={(e) => handleCopyScore(activeCricketMatch, e)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 transition-colors"
                        title="Copy match scorecard"
                      >
                        {copiedScoreId === activeCricketMatch.matchId ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Share2 className="w-3 h-3" />
                        )}
                      </button>

                      {/* Toggle Full Scorecard Button */}
                      {(activeCricketMatch.team1.topBatsmen || activeCricketMatch.team2.topBatsmen) && (
                        <button
                          type="button"
                          onClick={() => setShowFullScorecard((prev) => !prev)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer border border-white/5"
                        >
                          {showFullScorecard ? 'Hide Details' : 'Full Scorecard'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Main Score Line */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/60 border border-white/5">
                    <div className="flex items-center gap-3 text-sm font-mono font-bold">
                      {/* Team 1 */}
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span className="text-base">{activeCricketMatch.team1.flag}</span>
                        <span className="text-white">{activeCricketMatch.team1.shortName}</span>
                        <span className="text-white font-bold">{activeCricketMatch.team1.score}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({activeCricketMatch.team1.overs} ov)
                        </span>
                      </span>

                      <span className="text-slate-600 font-normal">vs</span>

                      {/* Team 2 */}
                      <span className="flex items-center gap-1.5 text-cyan-300">
                        <span className="text-base">{activeCricketMatch.team2.flag}</span>
                        <span className="text-white">{activeCricketMatch.team2.shortName}</span>
                        <span className="text-white font-bold text-base">{activeCricketMatch.team2.score}</span>
                        <span className="text-[10px] text-cyan-400/80 font-normal">
                          ({activeCricketMatch.team2.overs} ov)
                        </span>
                      </span>
                    </div>

                    {/* Target or Win Margin info */}
                    <div className="text-[11px] font-mono flex items-center gap-2">
                      {activeCricketMatch.isLive ? (
                        activeCricketMatch.target && (
                          <span className="text-amber-400 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            Target: {activeCricketMatch.target}
                          </span>
                        )
                      ) : activeCricketMatch.playerOfTheMatch ? (
                        <span className="text-amber-300 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                          🏆 POTM: {activeCricketMatch.playerOfTheMatch.name}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Live Equation / Match Summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] font-mono">
                    <p
                      className={`flex items-center gap-1.5 font-medium ${
                        activeCricketMatch.isLive ? 'text-emerald-400' : 'text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          activeCricketMatch.isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                        }`}
                      />
                      <span>{activeCricketMatch.summary}</span>
                    </p>

                    {activeCricketMatch.isLive && (activeCricketMatch.crr || activeCricketMatch.rrr) && (
                      <span className="text-slate-500 text-[10px]">
                        CRR: {activeCricketMatch.crr || '—'} · RRR: {activeCricketMatch.rrr || '—'}
                      </span>
                    )}
                  </div>

                  {/* Recent Balls Strip (Live match only) */}
                  {activeCricketMatch.isLive && activeCricketMatch.recentBalls && activeCricketMatch.recentBalls.length > 0 && (
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 pt-0.5">
                      <span className="text-slate-500 text-[9px] uppercase tracking-wider">This Over:</span>
                      <div className="flex items-center gap-1">
                        {activeCricketMatch.recentBalls.map((b, idx) => {
                          const isBoundary = b === '4' || b === '6';
                          const isWicket = b === 'W' || b === 'w';
                          return (
                            <span
                              key={idx}
                              className={`w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] ${
                                isBoundary
                                  ? b === '6'
                                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/50'
                                    : 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/50'
                                  : isWicket
                                  ? 'bg-rose-500 text-white'
                                  : b === '0' || b === '.'
                                  ? 'bg-slate-800 text-slate-500 border border-white/5'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {b === '0' ? '•' : b}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Active Batters & Bowler (for LIVE match) */}
                  {activeCricketMatch.isLive && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-white/5">
                      {/* Batting pair */}
                      <div className="space-y-1 p-2 rounded-lg bg-slate-900/40 border border-white/5">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Batting</div>
                        {activeCricketMatch.currentBatters && activeCricketMatch.currentBatters.length > 0 ? (
                          activeCricketMatch.currentBatters.map((b, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 truncate text-white">
                                {b.isStriker && <span className="text-cyan-400 text-[10px]">🏏</span>}
                                <span className={b.isStriker ? 'font-semibold text-cyan-200' : 'text-slate-300'}>
                                  {b.name}
                                </span>
                              </span>
                              <span className="text-cyan-300 font-bold shrink-0 ml-2">
                                {b.runs} <span className="text-[10px] text-slate-500 font-normal">({b.balls}b)</span>
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-500 text-[10px]">Batters at crease</div>
                        )}
                      </div>

                      {/* Current Bowler */}
                      <div className="space-y-1 p-2 rounded-lg bg-slate-900/40 border border-white/5">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Bowling</div>
                        {activeCricketMatch.currentBowler ? (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-white font-semibold truncate">
                              {activeCricketMatch.currentBowler.name}
                            </span>
                            <span className="text-amber-300 font-bold shrink-0 ml-2">
                              {activeCricketMatch.currentBowler.wickets}/{activeCricketMatch.currentBowler.runs}{' '}
                              <span className="text-[10px] text-slate-500 font-normal">
                                ({activeCricketMatch.currentBowler.overs} ov)
                              </span>
                            </span>
                          </div>
                        ) : (
                          <div className="text-slate-500 text-[10px]">Active bowler</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Top Performers (for COMPLETED match) */}
                  {!activeCricketMatch.isLive && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-white/5">
                      {/* Top Batsmen */}
                      <div className="space-y-1 p-2 rounded-lg bg-slate-900/40 border border-white/5">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Top Scorers</div>
                        <div className="space-y-0.5">
                          {activeCricketMatch.team2.topBatsmen?.slice(0, 2).map((b, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-white truncate">
                                <span>{activeCricketMatch.team2.flag} </span>
                                <span className="font-semibold">{b.name}</span>
                              </span>
                              <span className="text-cyan-300 font-bold shrink-0 ml-2">
                                {b.runs}{b.notOut ? '*' : ''}{' '}
                                <span className="text-[10px] text-slate-500 font-normal">({b.balls}b)</span>
                              </span>
                            </div>
                          ))}
                          {activeCricketMatch.team1.topBatsmen?.slice(0, 1).map((b, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 truncate">
                                <span>{activeCricketMatch.team1.flag} </span>
                                <span>{b.name}</span>
                              </span>
                              <span className="text-slate-300 font-bold shrink-0 ml-2">
                                {b.runs}{b.notOut ? '*' : ''}{' '}
                                <span className="text-[10px] text-slate-500 font-normal">({b.balls}b)</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Bowlers */}
                      <div className="space-y-1 p-2 rounded-lg bg-slate-900/40 border border-white/5">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Top Bowlers</div>
                        <div className="space-y-0.5">
                          {activeCricketMatch.team2.topBowlers?.slice(0, 1).map((bw, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-white truncate">
                                <span>{activeCricketMatch.team2.flag} </span>
                                <span className="font-semibold">{bw.name}</span>
                              </span>
                              <span className="text-amber-300 font-bold shrink-0 ml-2">
                                {bw.wickets}/{bw.runs}{' '}
                                <span className="text-[10px] text-slate-500 font-normal">({bw.overs} ov)</span>
                              </span>
                            </div>
                          ))}
                          {activeCricketMatch.team1.topBowlers?.slice(0, 1).map((bw, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 truncate">
                                <span>{activeCricketMatch.team1.flag} </span>
                                <span>{bw.name}</span>
                              </span>
                              <span className="text-amber-300 font-bold shrink-0 ml-2">
                                {bw.wickets}/{bw.runs}{' '}
                                <span className="text-[10px] text-slate-500 font-normal">({bw.overs} ov)</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expandable Detailed Scorecard View */}
                  {showFullScorecard && (
                    <div className="mt-2 p-3 rounded-lg bg-slate-950 border border-white/10 text-xs font-mono space-y-3 animate-in fade-in">
                      <div className="text-cyan-300 font-bold flex items-center justify-between border-b border-white/10 pb-1">
                        <span>DETAILED INNINGS BREAKDOWN · {activeCricketMatch.matchTitle}</span>
                        <span className="text-[10px] text-slate-500 font-normal">{activeCricketMatch.venue}</span>
                      </div>

                      {/* Team 1 Scorecard */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-white font-semibold">
                          <span>{activeCricketMatch.team1.flag} {activeCricketMatch.team1.name} — {activeCricketMatch.team1.score} ({activeCricketMatch.team1.overs} ov)</span>
                        </div>
                        {activeCricketMatch.team1.topBatsmen && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 pt-1">
                            {activeCricketMatch.team1.topBatsmen.map((b, i) => (
                              <div key={i} className="p-1 rounded bg-slate-900 border border-white/5 flex items-center justify-between">
                                <span className="truncate text-slate-300">{b.name}</span>
                                <span className="text-cyan-300 font-bold ml-1">{b.runs}{b.notOut ? '*' : ''} ({b.balls})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Team 2 Scorecard */}
                      <div className="space-y-1 pt-2 border-t border-white/5">
                        <div className="flex items-center justify-between text-white font-semibold">
                          <span>{activeCricketMatch.team2.flag} {activeCricketMatch.team2.name} — {activeCricketMatch.team2.score} ({activeCricketMatch.team2.overs} ov)</span>
                        </div>
                        {activeCricketMatch.team2.topBatsmen && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 pt-1">
                            {activeCricketMatch.team2.topBatsmen.map((b, i) => (
                              <div key={i} className="p-1 rounded bg-slate-900 border border-white/5 flex items-center justify-between">
                                <span className="truncate text-slate-300">{b.name}</span>
                                <span className="text-cyan-300 font-bold ml-1">{b.runs}{b.notOut ? '*' : ''} ({b.balls})</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* CLEAN & RICH F1 LIVE STANDINGS */
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="text-rose-400 font-bold flex items-center gap-1.5">
                  <span>🏎️</span>
                  <span>{liveData.f1.season} Top Championship Standings</span>
                </span>
                <span className="text-slate-400 text-[10px]">
                  Next: <span className="text-white font-semibold">{liveData.f1.nextRace.name}</span> ({liveData.f1.nextRace.flag})
                </span>
              </div>

              {/* Top Drivers Leaderboard Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                {liveData.f1.drivers.slice(0, 8).map((d) => (
                  <div
                    key={d.code}
                    className={`p-2 rounded-lg border transition-colors flex items-center justify-between ${
                      d.pos === 1
                        ? 'bg-rose-950/20 border-rose-500/30'
                        : 'bg-slate-900/80 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-[10px] font-bold ${d.pos === 1 ? 'text-amber-400' : 'text-slate-500'}`}>
                        #{d.pos}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate text-xs">{d.driver}</div>
                        <div className="text-[9px] text-slate-400 truncate">{d.team}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-1">
                      <div className="text-cyan-300 font-bold">{d.points} pts</div>
                      <div className="text-[9px] text-slate-500">{d.wins} wins</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Minimal Constructor Strip */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-white/5">
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
                  <span className="text-slate-500 uppercase tracking-wider font-bold">Constructors:</span>
                  {liveData.f1.constructors.map((c) => (
                    <span key={c.team} className="shrink-0 flex items-center gap-1">
                      <span className="text-white font-semibold">{c.team}:</span>
                      <span className="text-amber-300 font-bold">{c.points} pts</span>
                    </span>
                  ))}
                </div>
                <span className="text-emerald-400 shrink-0 hidden sm:inline flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Telemetry Live</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. DECLUTTERED MAIN SPORTS NAVIGATION (Only Main Sports Mentioned + Pop-up for Cricket Sub-Categories) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-slate-950/80 border border-white/10 relative">
        <div className="flex items-center gap-1.5 relative">
          {/* All Sports Pill */}
          <button
            type="button"
            onClick={() => {
              setSelectedMainSport('all');
              setIsCricketPopupOpen(false);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
              selectedMainSport === 'all'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300'
            }`}
          >
            All Sports
          </button>

          {/* MAIN CRICKET BUTTON WITH POP-UP TRIGGER */}
          <div className="relative">
            <button
              ref={cricketButtonRef}
              type="button"
              onClick={() => {
                setSelectedMainSport('cricket');
                setIsCricketPopupOpen((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer shrink-0 ${
                selectedMainSport === 'cricket'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-300'
              }`}
            >
              <span>🏏</span>
              <span>{cricketButtonLabel}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCricketPopupOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* CRICKET POP-UP MENU: Choose Men's, Women's, or IPL */}
            {isCricketPopupOpen && (
              <div className="cricket-popup-container absolute left-0 top-full mt-1.5 z-50 w-64 rounded-xl bg-slate-900 border border-amber-500/40 p-2 shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-top-1 space-y-1 text-xs font-mono">
                <div className="px-2 py-1 text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center justify-between border-b border-white/10 pb-1.5 mb-1">
                  <span>Choose Cricket Sub-Category</span>
                  <button
                    type="button"
                    onClick={() => setIsCricketPopupOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Option 1: All Cricket */}
                <button
                  type="button"
                  onClick={() => {
                    setCricketSubCategory('all_cricket');
                    setSelectedMainSport('cricket');
                    setIsCricketPopupOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    cricketSubCategory === 'all_cricket'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>⚡</span>
                    <span>All Cricket Fixtures</span>
                  </div>
                  {cricketSubCategory === 'all_cricket' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>

                {/* Option 2: Team India Men's */}
                <button
                  type="button"
                  onClick={() => {
                    setCricketSubCategory('cricket_men');
                    setSelectedMainSport('cricket');
                    setIsCricketPopupOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    cricketSubCategory === 'cricket_men'
                      ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🇮🇳</span>
                    <span>India Men (BCCI)</span>
                  </div>
                  {cricketSubCategory === 'cricket_men' && <Check className="w-3.5 h-3.5 text-sky-400" />}
                </button>

                {/* Option 3: Team India Women's */}
                <button
                  type="button"
                  onClick={() => {
                    setCricketSubCategory('cricket_women');
                    setSelectedMainSport('cricket');
                    setIsCricketPopupOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    cricketSubCategory === 'cricket_women'
                      ? 'bg-pink-500/20 text-pink-300 font-bold border border-pink-500/40'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>💙</span>
                    <span>India Women (WIB)</span>
                  </div>
                  {cricketSubCategory === 'cricket_women' && <Check className="w-3.5 h-3.5 text-pink-400" />}
                </button>

                {/* Option 4: TATA IPL (2025–2026) */}
                <button
                  type="button"
                  onClick={() => {
                    setCricketSubCategory('cricket_ipl');
                    setSelectedMainSport('cricket');
                    setIsCricketPopupOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    cricketSubCategory === 'cricket_ipl'
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🏆</span>
                    <span>TATA IPL (2025 & 2026)</span>
                  </div>
                  {cricketSubCategory === 'cricket_ipl' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              </div>
            )}
          </div>

          {/* MAIN FORMULA 1 BUTTON */}
          <button
            type="button"
            onClick={() => {
              setSelectedMainSport('f1');
              setIsCricketPopupOpen(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 ${
              selectedMainSport === 'f1'
                ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-rose-300'
            }`}
          >
            <span>🏎️</span>
            <span>Formula 1</span>
          </button>

          {/* Dynamically added custom main sports (e.g. Football, NBA, etc.) */}
          {customMainSports.map((sp) => (
            <button
              key={sp}
              type="button"
              onClick={() => {
                setSelectedMainSport(sp);
                setIsCricketPopupOpen(false);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer shrink-0 capitalize ${
                selectedMainSport === sp
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-cyan-300'
              }`}
            >
              {sp}
            </button>
          ))}
        </div>

        {/* Right side controls: Jump to Today, Search, Expand All */}
        <div className="flex items-center gap-2">
          {/* Jump to Today Button */}
          <button
            type="button"
            onClick={handleScrollToToday}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/50 text-xs font-mono text-cyan-300 font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Jump to highlighted Today position"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Today</span>
          </button>

          {/* Expand / Collapse All */}
          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-mono text-slate-300 transition-colors cursor-pointer shrink-0 flex items-center gap-1"
            title="Expand or collapse extra info"
          >
            <Layers className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">
              {expandedEventIds.size >= filteredEvents.length && filteredEvents.length > 0
                ? 'Collapse All'
                : 'Expand All'}
            </span>
          </button>

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value as any)}
            className="px-2 py-0.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">Season: All</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>

          {/* Search input */}
          <div className="relative min-w-[110px] sm:min-w-[150px]">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-6 pr-2 py-0.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. DYNAMIC SPORTS ADDITION HUB */}
      <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1">
          <span className="text-[10px] font-mono text-slate-400 shrink-0">Add Sport:</span>
          {[
            { name: 'Premier League', icon: '⚽' },
            { name: 'NBA', icon: '🏀' },
            { name: 'Wimbledon', icon: '🎾' },
            { name: 'Champions League', icon: '🏆' },
            { name: 'MotoGP', icon: '🏍️' },
            { name: 'FIFA World Cup', icon: '🌎' },
            { name: 'Badminton BWF', icon: '🏸' },
          ].map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleAddSport(preset.name)}
              className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-900 hover:bg-cyan-950/60 border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer shrink-0 flex items-center gap-1"
            >
              <span>{preset.icon}</span>
              <span>+ {preset.name}</span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[180px]">
          <input
            type="text"
            placeholder="Request any sport (e.g. UFC, NFL)..."
            value={newSportInput}
            onChange={(e) => setNewSportInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSportInput.trim()) {
                handleAddSport(newSportInput);
              }
            }}
            className="w-full pl-2 pr-14 py-0.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
          />
          <button
            type="button"
            disabled={isAddingDynamicSport || !newSportInput.trim()}
            onClick={() => handleAddSport(newSportInput)}
            className="absolute right-0.5 top-0.5 bottom-0.5 px-2 rounded-md bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-[10px] font-bold font-mono cursor-pointer"
          >
            Add
          </button>
        </div>
      </div>

      {/* 4. MAIN TIMELINE VIEW: Continuous Line, Event Circles, Multiple Circles for Same Date/Time, and Always-Highlighted Today */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto space-y-3.5 pr-1 pl-1 custom-scrollbar relative"
      >
        {timelineDateGroups.length === 0 ? (
          <div className="py-20 text-center text-slate-500 font-mono text-xs space-y-2">
            <div>No fixtures found matching this criteria.</div>
            <div className="text-slate-600">
              Try switching cricket sub-categories from the Cricket popup menu.
            </div>
          </div>
        ) : (
          <div className="relative pl-7 sm:pl-9 space-y-3.5">
            {/* THE ACTUAL CONTINUOUS TIMELINE LINE (Spine) */}
            <div
              className="absolute left-[13px] sm:left-[17px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-cyan-500/20 via-cyan-400/60 to-cyan-500/20"
              style={{ zIndex: 0 }}
            />

            {timelineDateGroups.map((group) => {
              const { formatted, weekday } = formatDateTitle(group.date);
              const isToday = group.isToday;
              const hasMultiple = group.events.length > 1;

              return (
                <div
                  key={group.date}
                  ref={isToday ? todayNodeRef : undefined}
                  className={`relative transition-all duration-200 ${
                    isToday
                      ? 'p-2 sm:p-2.5 rounded-2xl bg-cyan-950/40 border border-cyan-400/70 shadow-lg shadow-cyan-950/60 ring-2 ring-cyan-400/30'
                      : ''
                  }`}
                >
                  {/* NODE ON THE TIMELINE LINE: Single Circle, Multiple Circles, or Highlighted Today Beacon */}
                  <div
                    className="absolute -left-[27px] sm:-left-[35px] top-2 flex items-center justify-center"
                    style={{ zIndex: 10 }}
                  >
                    {isToday ? (
                      /* Today Highlighted Beacon on the Line */
                      <div className="relative flex items-center justify-center">
                        <span className="absolute w-7 h-7 rounded-full bg-cyan-400/40 animate-ping" />
                        <span className="relative w-5 h-5 rounded-full bg-cyan-400 border-2 border-white shadow-xl shadow-cyan-400 flex items-center justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                        </span>
                      </div>
                    ) : hasMultiple ? (
                      /* Multiple Circles Denoting Multiple Events at the same Date/Time */
                      <div
                        className="flex items-center -space-x-1.5 p-0.5 rounded-full bg-slate-950 border border-cyan-400/50 shadow-md"
                        title={`${group.events.length} fixtures on this date`}
                      >
                        {group.events.slice(0, 3).map((ev) => {
                          const b = getCategoryBadge(ev);
                          return (
                            <span
                              key={ev.id}
                              className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 inline-block shrink-0 shadow"
                              style={{ backgroundColor: b.circle }}
                            />
                          );
                        })}
                        {group.events.length > 3 && (
                          <span className="w-3.5 h-3.5 rounded-full bg-slate-800 text-[8px] font-mono text-cyan-300 font-bold border-2 border-slate-950 flex items-center justify-center shrink-0">
                            +{group.events.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* Single Circle Denoting Single Event on the Line */
                      <div
                        className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 shadow-md"
                        style={{
                          backgroundColor:
                            group.events.length > 0
                              ? getCategoryBadge(group.events[0]).circle
                              : '#06b6d4',
                        }}
                      />
                    )}
                  </div>

                  {/* DATE HEADER & TODAY BADGE ON THE DATE LINE */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-cyan-400 tracking-tight">
                      {formatted}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ({weekday})
                    </span>

                    {/* Today Marker Tag */}
                    {isToday && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/30 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                        <span>TODAY</span>
                      </span>
                    )}

                    {/* Multiple Circles / Events Indicator Tag */}
                    {hasMultiple && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-slate-900 border border-white/20 text-slate-300 flex items-center gap-1.5">
                        <span className="flex items-center -space-x-1">
                          {group.events.map((ev) => (
                            <span
                              key={ev.id}
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: getCategoryBadge(ev).circle }}
                            />
                          ))}
                        </span>
                        <span>{group.events.length} Simultaneous Fixtures</span>
                      </span>
                    )}
                  </div>

                  {/* Synthetic Today Indicator when Today has no live fixtures */}
                  {group.isSyntheticToday && (
                    <div className="p-2.5 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                        <span>Current timeline location: Today is {formatted}. No live match active right now.</span>
                      </div>
                      {nextUpcomingEvent && (
                        <div className="flex items-center gap-2 text-xs font-mono text-cyan-300 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/20 shrink-0">
                          <span className="text-slate-400 text-[10px]">Next:</span>
                          <span className="font-bold truncate max-w-[180px]">{nextUpcomingEvent.title}</span>
                          <span className="text-amber-300 font-mono text-[10px]">({nextUpcomingEvent.startDate})</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* FIXTURE ROWS: Single date line with click-to-expand extra info */}
                  <div className="space-y-1.5">
                    {group.events.map((event) => {
                      const isScheduled = scheduledEventIds.has(event.id);
                      const isExpanded = expandedEventIds.has(event.id);
                      const badge = getCategoryBadge(event);

                      return (
                        <div
                          key={event.id}
                          className={`rounded-xl border transition-all duration-200 ${
                            isExpanded
                              ? 'bg-slate-900/95 border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                              : 'bg-slate-950/70 hover:bg-slate-900/80 border-white/10 hover:border-cyan-500/40'
                          }`}
                        >
                          {/* SINGLE DATE LINE ROW */}
                          <div
                            onClick={() => toggleEventExpand(event.id)}
                            className="flex items-center justify-between px-3 py-2 cursor-pointer gap-2 select-none group"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {/* Event Circle Node Indicator */}
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-900"
                                style={{ backgroundColor: badge.circle }}
                                title={badge.label}
                              />

                              {/* Flag */}
                              <span className="text-sm shrink-0 leading-none">{event.flag}</span>

                              {/* Sport / League Badge */}
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border shrink-0 ${badge.bg}`}
                              >
                                {badge.label}
                              </span>

                              {/* Matchup Title */}
                              <span className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors truncate">
                                {event.title}
                              </span>

                              {/* Time */}
                              <span className="font-mono text-[11px] text-slate-400 shrink-0 hidden sm:inline-flex items-center gap-1 ml-auto">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{event.startTime}</span>
                                <span className="text-slate-500 text-[10px]">
                                  ({event.timeZoneInfo.split('/')[0].trim()})
                                </span>
                              </span>
                            </div>

                            {/* Right Actions */}
                            <div className="flex items-center gap-1.5 shrink-0 ml-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddToSchedule(event);
                                }}
                                className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                  isScheduled
                                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                                    : 'bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40'
                                }`}
                              >
                                {isScheduled ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-400" />
                                    <span className="hidden md:inline">Scheduled</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" />
                                    <span className="hidden md:inline">Add</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => toggleEventExpand(event.id, e)}
                                className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-cyan-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-cyan-300" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* EXTRA INFO ACCORDION */}
                          {isExpanded && (
                            <div className="px-3.5 pb-3 pt-1 border-t border-white/5 space-y-2 text-xs animate-in fade-in slide-in-from-top-1">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-300 pt-1 font-mono text-[11px]">
                                <div className="flex items-start gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-semibold text-white">{event.venue}</div>
                                    <div className="text-slate-400">{event.location}</div>
                                  </div>
                                </div>

                                <div className="flex items-start gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-semibold text-white">
                                      {event.startTime} – {event.endTime}
                                    </div>
                                    <div className="text-slate-400">{event.timeZoneInfo}</div>
                                  </div>
                                </div>

                                <div className="flex items-start gap-1.5">
                                  <Tv className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                                  <div>
                                    <div className="font-semibold text-white">Broadcast</div>
                                    <div className="text-slate-400">{event.tvBroadcast || 'Official Sports Feed'}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 font-mono text-[10px]">
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                                  Tournament: {event.tournament}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                                  Format: {event.format}
                                </span>
                                {event.round && (
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                                    Round {event.round}
                                  </span>
                                )}
                                {event.isSprint && (
                                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                                    ⚡ Sprint Weekend
                                  </span>
                                )}
                              </div>

                              {event.description && (
                                <p className="text-slate-300 text-xs leading-relaxed font-sans bg-slate-950/60 p-2 rounded-lg border border-white/5">
                                  {event.description}
                                </p>
                              )}

                              {event.keyDetails && event.keyDetails.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {event.keyDetails.map((detail, dIdx) => (
                                    <span
                                      key={dIdx}
                                      className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/40 border border-cyan-500/20 text-cyan-300"
                                    >
                                      ✓ {detail}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-1.5 border-t border-white/5 gap-2">
                                <div className="text-[10px] font-mono text-slate-500">
                                  ID: {event.id}
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyFixture(event, e)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-mono transition-colors cursor-pointer flex items-center gap-1 border border-white/10"
                                  >
                                    {copiedId === event.id ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        <span>Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Share2 className="w-3 h-3" />
                                        <span>Copy Info</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAddToSchedule(event);
                                    }}
                                    className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md ${
                                      isScheduled
                                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
                                    }`}
                                  >
                                    {isScheduled ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>On My Schedule</span>
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add to Tasks</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Separate Pop-up Screen for Live Scores & Telemetry */}
      <LiveSportsModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        initialMatchId={selectedCricketMatchId}
      />
    </div>
  );
};
