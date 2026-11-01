import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  RefreshCw,
  X,
  Share2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Radio,
  Zap,
  Activity,
  Layers,
  Calendar,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  CricketLiveScore,
  LiveSportsPayload,
  getLiveSportsData,
  fetchLiveSports,
} from '../services/liveSportsService';

interface LiveSportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMatchId?: string;
  onNavigateToCalendar?: () => void;
}

export const LiveSportsModal: React.FC<LiveSportsModalProps> = ({
  isOpen,
  onClose,
  initialMatchId,
  onNavigateToCalendar,
}) => {
  const [liveData, setLiveData] = useState<LiveSportsPayload>(() => getLiveSportsData());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'live_only' | 'all' | 'results' | 'f1'>('live_only');
  const [selectedMatchId, setSelectedMatchId] = useState<string>(() => initialMatchId || 'live-ind-aus-01');
  const [showFullScorecard, setShowFullScorecard] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [simulateNoLive, setSimulateNoLive] = useState(false);

  // Sync initial match id if provided
  useEffect(() => {
    if (initialMatchId) {
      setSelectedMatchId(initialMatchId);
    }
  }, [initialMatchId]);

  // Periodic polling when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(async () => {
      try {
        const data = await fetchLiveSports();
        setLiveData(data);
      } catch {
        setLiveData(getLiveSportsData());
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Keyboard shortcut (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchLiveSports();
      setLiveData(data);
    } catch {
      setLiveData(getLiveSportsData());
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Filtered cricket matches list
  const allCricketMatches = useMemo(() => {
    if (simulateNoLive) {
      return liveData.cricket.liveMatches.map((m) => ({
        ...m,
        isLive: false,
        status: m.isLive ? 'Completed / Stumps Drawn' : m.status,
      }));
    }
    return liveData.cricket.liveMatches;
  }, [liveData.cricket.liveMatches, simulateNoLive]);

  const liveMatches = useMemo(() => {
    return allCricketMatches.filter((m) => m.isLive);
  }, [allCricketMatches]);

  const completedMatches = useMemo(() => {
    return allCricketMatches.filter((m) => !m.isLive);
  }, [allCricketMatches]);

  // Determine which matches to show in selector bar based on category
  const displayedMatches = useMemo(() => {
    if (selectedCategory === 'live_only') return liveMatches;
    if (selectedCategory === 'results') return completedMatches;
    return allCricketMatches;
  }, [selectedCategory, liveMatches, completedMatches, allCricketMatches]);

  // Currently chosen match for detailed score view
  const activeMatch: CricketLiveScore | undefined = useMemo(() => {
    const found = allCricketMatches.find((m) => m.matchId === selectedMatchId);
    if (found) return found;
    // Fallback to first displayed match or first in list
    if (displayedMatches.length > 0) return displayedMatches[0];
    return allCricketMatches[0];
  }, [allCricketMatches, selectedMatchId, displayedMatches]);

  // Copy scorecard summary
  const handleCopyScorecard = (match: CricketLiveScore) => {
    const text = `🏏 ${match.matchTitle} (${match.series})\n${match.team1.name} ${match.team1.score} (${match.team1.overs} ov)\n${match.team2.name} ${match.team2.score} (${match.team2.overs} ov)\nStatus: ${match.status}\n${match.summary}\nVenue: ${match.venue}`;
    navigator.clipboard?.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-950 border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 text-slate-200 overflow-hidden font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-3 w-3 items-center justify-center">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${liveMatches.length > 0 ? 'bg-rose-400' : 'bg-slate-500'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${liveMatches.length > 0 ? 'bg-rose-500' : 'bg-slate-600'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold tracking-wider uppercase text-white">
                  LIVE SPORTS & TELEMETRY CENTER
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${liveMatches.length > 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-800 text-slate-400 border border-white/10'}`}>
                  {liveMatches.length > 0 ? `${liveMatches.length} LIVE NOW` : 'NO LIVE MATCH'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Real-time pitch scorecard, ball-by-ball updates & championship telemetry
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Real-time Refresh */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 hover:text-cyan-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh live match scores"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline text-[11px]">Refresh</span>
            </button>

            {/* Test Simulation Toggle */}
            <button
              type="button"
              onClick={() => setSimulateNoLive((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg border text-[10px] transition-colors cursor-pointer ${
                simulateNoLive
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                  : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
              }`}
              title="Toggle to test 'No live match' messaging"
            >
              {simulateNoLive ? 'Live Restored' : "Test 'No Live' Mode"}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close Live Scores Pop-up"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-slate-900/60 border-b border-white/5 text-xs overflow-x-auto no-scrollbar gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            {/* Live Only Filter */}
            <button
              type="button"
              onClick={() => setSelectedCategory('live_only')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer font-semibold shrink-0 ${
                selectedCategory === 'live_only'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-950'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`inline-flex rounded-full h-2 w-2 ${liveMatches.length > 0 ? 'bg-rose-500' : 'bg-slate-600'}`} />
              </span>
              <span>Live Now ({liveMatches.length})</span>
            </button>

            {/* All Matches Filter */}
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer font-semibold shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              <span>⚡ All Matches ({allCricketMatches.length})</span>
            </button>

            {/* Results Filter */}
            <button
              type="button"
              onClick={() => setSelectedCategory('results')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer font-semibold shrink-0 ${
                selectedCategory === 'results'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              <span>✓ Results ({completedMatches.length})</span>
            </button>

            {/* Formula 1 Telemetry Filter */}
            <button
              type="button"
              onClick={() => setSelectedCategory('f1')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer font-semibold shrink-0 ${
                selectedCategory === 'f1'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              <span>🏎️ F1 Telemetry</span>
            </button>
          </div>

          {copiedNotice && (
            <span className="text-[11px] text-emerald-300 flex items-center gap-1 animate-in fade-in shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Scorecard Copied!</span>
            </span>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4">
          {selectedCategory === 'f1' ? (
            /* F1 TELEMETRY VIEW */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/80 border border-rose-500/30">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏎️</span>
                  <div>
                    <div className="font-bold text-white text-sm">
                      {liveData.f1.season}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Live Telemetry & Championship Standings
                    </div>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-slate-400 text-[10px]">NEXT GRAND PRIX</div>
                  <div className="text-white font-bold flex items-center gap-1">
                    <span>{liveData.f1.nextRace.flag}</span>
                    <span>{liveData.f1.nextRace.name}</span>
                  </div>
                  <div className="text-[10px] text-amber-300">{liveData.f1.nextRace.date}</div>
                </div>
              </div>

              {/* Drivers Standings Grid */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  World Drivers' Championship Standings
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {liveData.f1.drivers.map((d) => (
                    <div
                      key={d.code}
                      className={`p-3 rounded-xl border transition-all ${
                        d.pos === 1
                          ? 'bg-rose-950/30 border-rose-500/50 shadow-md shadow-rose-950/30'
                          : 'bg-slate-900/70 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${d.pos === 1 ? 'text-amber-400' : 'text-slate-500'}`}>
                          #{d.pos}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{d.gap}</span>
                      </div>
                      <div className="font-bold text-white text-sm mt-1">{d.driver}</div>
                      <div className="text-[10px] text-slate-400">{d.team}</div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-xs">
                        <span className="text-cyan-300 font-bold">{d.points} PTS</span>
                        <span className="text-[10px] text-slate-500">{d.wins} wins</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Constructors Strip */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Constructors' Championship Standings
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {liveData.f1.constructors.map((c) => (
                    <div key={c.team} className="p-2 rounded-lg bg-slate-950 border border-white/5 text-xs">
                      <div className="text-slate-400 text-[10px]">#{c.pos}</div>
                      <div className="font-bold text-white truncate">{c.team}</div>
                      <div className="text-amber-300 font-bold mt-1">{c.points} pts</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* CRICKET MATCHES: LIST SELECTION + DETAILED VIEW */
            <div className="space-y-4">
              {/* MATCH SELECTION ROW (User Choice: Click on any match to see its live score) */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Choose Match To View Live Score ({displayedMatches.length} available)</span>
                  </span>
                  <span className="text-[10px] font-normal text-slate-500">
                    Click any card to load live score
                  </span>
                </div>

                {/* If selectedCategory is live_only and there are NO live matches */}
                {displayedMatches.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-slate-900/60 border border-rose-500/20 text-center space-y-3 animate-in fade-in">
                    <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 border border-white/10 flex items-center justify-center text-2xl">
                      🏟️
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">
                        No Live Matches Currently Underway
                      </h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                        There are currently no active live cricket matches in progress right now. All scheduled games for this session have concluded or are set for upcoming broadcast times.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('results')}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition-colors cursor-pointer"
                      >
                        View Completed Results ({completedMatches.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors cursor-pointer border border-white/10"
                      >
                        Browse All Fixtures
                      </button>
                      {simulateNoLive && (
                        <button
                          type="button"
                          onClick={() => setSimulateNoLive(false)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs hover:bg-emerald-500/30 transition-colors cursor-pointer"
                        >
                          Restore Real-Time Live
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* MATCH CHOICES GRID */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {displayedMatches.map((m) => {
                      const isSelected = activeMatch?.matchId === m.matchId;
                      return (
                        <button
                          key={m.matchId}
                          type="button"
                          onClick={() => {
                            setSelectedMatchId(m.matchId);
                            setShowFullScorecard(false);
                          }}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-gradient-to-br from-cyan-950/40 via-slate-900 to-slate-900 border-cyan-400 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-400/40'
                              : 'bg-slate-900/70 border-white/10 hover:border-cyan-500/40 hover:bg-slate-900'
                          }`}
                        >
                          {/* Top Row: Series & Live Indicator */}
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="text-[10px] text-slate-400 truncate font-semibold">
                              {m.format} · {m.series.split('-')[0].trim()}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 ${
                                m.isLive
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {m.isLive ? '🔴 LIVE' : '✓ RESULT'}
                            </span>
                          </div>

                          {/* Teams & Scores */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <span>{m.team1.flag}</span>
                                <span>{m.team1.shortName}</span>
                              </span>
                              <span className="text-slate-300 font-semibold">{m.team1.score} <span className="text-[10px] text-slate-500">({m.team1.overs})</span></span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <span>{m.team2.flag}</span>
                                <span>{m.team2.shortName}</span>
                              </span>
                              <span className="text-cyan-300 font-bold">{m.team2.score} <span className="text-[10px] text-slate-500">({m.team2.overs})</span></span>
                            </div>
                          </div>

                          {/* Status summary footer */}
                          <div className="text-[10px] text-slate-400 truncate mt-2 pt-1.5 border-t border-white/5">
                            {m.summary}
                          </div>

                          {isSelected && (
                            <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] font-bold text-cyan-400">
                              <span>VIEWING</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* DETAILED SCORECARD FOR SELECTED MATCH */}
              {activeMatch && (
                <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border border-cyan-500/30 space-y-4 shadow-xl">
                  {/* Match Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            activeMatch.isLive
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {activeMatch.isLive ? '🔴 LIVE INNINGS' : '✓ OFFICIAL RESULT'}
                        </span>
                        <span className="text-xs text-slate-400 font-semibold">
                          {activeMatch.format} · {activeMatch.series}
                        </span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                        {activeMatch.matchTitle}
                      </h3>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>📍 {activeMatch.venue}</span>
                        <span>•</span>
                        <span>{activeMatch.lastUpdated}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyScorecard(activeMatch)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Copy scorecard to clipboard"
                      >
                        <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Copy Score</span>
                      </button>
                    </div>
                  </div>

                  {/* High-Impact Dual Scoreboard */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Team 1 Card */}
                    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{activeMatch.team1.flag}</span>
                          <div>
                            <div className="font-bold text-white text-sm">{activeMatch.team1.name}</div>
                            <div className="text-[10px] text-slate-400">1st Innings</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">{activeMatch.team1.score}</div>
                          <div className="text-[10px] text-slate-400">{activeMatch.team1.overs} overs</div>
                        </div>
                      </div>
                      {activeMatch.team1.topBatsmen && activeMatch.team1.topBatsmen.length > 0 && (
                        <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
                          <span>Top: {activeMatch.team1.topBatsmen[0].name}</span>
                          <span className="text-slate-200 font-semibold">{activeMatch.team1.topBatsmen[0].runs} ({activeMatch.team1.topBatsmen[0].balls}b)</span>
                        </div>
                      )}
                    </div>

                    {/* Team 2 Card */}
                    <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{activeMatch.team2.flag}</span>
                          <div>
                            <div className="font-bold text-white text-sm">{activeMatch.team2.name}</div>
                            <div className="text-[10px] text-cyan-300">
                              {activeMatch.isLive ? 'Currently Batting · Chase' : '2nd Innings'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-cyan-300">{activeMatch.team2.score}</div>
                          <div className="text-[10px] text-slate-400">{activeMatch.team2.overs} overs</div>
                        </div>
                      </div>
                      {activeMatch.team2.topBatsmen && activeMatch.team2.topBatsmen.length > 0 && (
                        <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
                          <span>Top: {activeMatch.team2.topBatsmen[0].name}</span>
                          <span className="text-cyan-200 font-bold">{activeMatch.team2.topBatsmen[0].runs} ({activeMatch.team2.topBatsmen[0].balls}b)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Live Equation / Target Bar (For Live Matches) */}
                  {activeMatch.isLive && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-rose-950/30 via-slate-900 to-cyan-950/30 border border-rose-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="text-[10px] text-rose-300 font-bold uppercase tracking-wider">
                          LIVE EQUATION & TARGET
                        </div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          {activeMatch.summary}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        {activeMatch.target && (
                          <div>
                            <span className="text-slate-400 text-[10px]">Target: </span>
                            <span className="text-white font-bold">{activeMatch.target}</span>
                          </div>
                        )}
                        {activeMatch.crr && (
                          <div>
                            <span className="text-slate-400 text-[10px]">CRR: </span>
                            <span className="text-cyan-300 font-bold">{activeMatch.crr}</span>
                          </div>
                        )}
                        {activeMatch.rrr && (
                          <div>
                            <span className="text-slate-400 text-[10px]">RRR: </span>
                            <span className="text-amber-300 font-bold">{activeMatch.rrr}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Result Banner (For Completed Matches) */}
                  {!activeMatch.isLive && (
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1 text-xs">
                      <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                        FINAL MATCH RESULT
                      </div>
                      <div className="text-sm font-bold text-white">
                        {activeMatch.summary}
                      </div>
                      {activeMatch.playerOfTheMatch && (
                        <div className="text-[11px] text-amber-300 pt-1 flex items-center gap-1.5">
                          <span>🏆</span>
                          <span className="font-bold">Player of the Match:</span>
                          <span>{activeMatch.playerOfTheMatch.name} ({activeMatch.playerOfTheMatch.team}) — {activeMatch.playerOfTheMatch.performance}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Current Batters & Bowler Telemetry (When Live) */}
                  {activeMatch.isLive && activeMatch.currentBatters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Batters */}
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-white/5 space-y-1.5">
                        <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider flex items-center justify-between">
                          <span>Batters at Crease</span>
                          <span className="text-slate-500 font-normal">R (B) · 4s · 6s · SR</span>
                        </div>
                        {activeMatch.currentBatters.map((b, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                            <span className="text-white font-semibold flex items-center gap-1">
                              {b.isStriker ? <span className="text-amber-400">🏏</span> : <span className="w-3" />}
                              <span>{b.name}</span>
                            </span>
                            <span className="text-slate-300 font-mono">
                              <span className="text-cyan-300 font-bold">{b.runs}</span> ({b.balls}) · {b.fours || 0} · {b.sixes || 0} · {b.strikeRate || '-'}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Current Bowler & Recent Balls */}
                      <div className="p-3 rounded-xl bg-slate-900/70 border border-white/5 space-y-1.5">
                        <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center justify-between">
                          <span>Current Bowler</span>
                          {activeMatch.currentBowler && (
                            <span className="text-white font-semibold font-mono">
                              {activeMatch.currentBowler.wickets}/{activeMatch.currentBowler.runs} ({activeMatch.currentBowler.overs} ov)
                            </span>
                          )}
                        </div>
                        {activeMatch.currentBowler && (
                          <div className="text-xs text-slate-300">
                            <span>{activeMatch.currentBowler.name} · Econ: {activeMatch.currentBowler.economy || '-'}</span>
                          </div>
                        )}

                        {/* Recent Balls Strip */}
                        {activeMatch.recentBalls && (
                          <div className="pt-2 border-t border-white/5">
                            <div className="text-[10px] text-slate-500 mb-1">Recent Deliveries:</div>
                            <div className="flex items-center gap-1.5">
                              {activeMatch.recentBalls.map((b, i) => {
                                const isWicket = b === 'W';
                                const isSix = b === '6';
                                const isFour = b === '4';
                                const isDot = b === '0' || b === '.';
                                return (
                                  <span
                                    key={i}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                      isWicket
                                        ? 'bg-rose-500 text-white shadow-sm shadow-rose-900'
                                        : isSix
                                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-900'
                                        : isFour
                                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900'
                                        : isDot
                                        ? 'bg-slate-800 text-slate-400'
                                        : 'bg-sky-700 text-white'
                                    }`}
                                  >
                                    {b}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Expandable Detailed Innings Breakdown */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowFullScorecard((prev) => !prev)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs text-slate-300 transition-colors cursor-pointer"
                    >
                      <span className="font-semibold flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{showFullScorecard ? 'Hide Detailed Scorecard' : 'View Full Innings Scorecard & Top Performers'}</span>
                      </span>
                      {showFullScorecard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showFullScorecard && (
                      <div className="mt-2 p-3.5 rounded-xl bg-slate-950 border border-white/10 text-xs space-y-3 animate-in fade-in">
                        {/* Team 1 Details */}
                        <div className="space-y-1.5">
                          <div className="font-bold text-white flex items-center justify-between border-b border-white/10 pb-1">
                            <span>{activeMatch.team1.flag} {activeMatch.team1.name} — {activeMatch.team1.score} ({activeMatch.team1.overs} ov)</span>
                            <span className="text-[10px] text-slate-400 font-normal">1st Innings</span>
                          </div>
                          {activeMatch.team1.topBatsmen && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {activeMatch.team1.topBatsmen.map((b, i) => (
                                <div key={i} className="p-1.5 rounded bg-slate-900 border border-white/5 flex items-center justify-between">
                                  <span className="text-slate-300">{b.name}</span>
                                  <span className="text-cyan-300 font-bold">{b.runs}{b.notOut ? '*' : ''} ({b.balls}b, SR: {b.strikeRate})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Team 2 Details */}
                        <div className="space-y-1.5 pt-2 border-t border-white/5">
                          <div className="font-bold text-white flex items-center justify-between border-b border-white/10 pb-1">
                            <span>{activeMatch.team2.flag} {activeMatch.team2.name} — {activeMatch.team2.score} ({activeMatch.team2.overs} ov)</span>
                            <span className="text-[10px] text-slate-400 font-normal">2nd Innings</span>
                          </div>
                          {activeMatch.team2.topBatsmen && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {activeMatch.team2.topBatsmen.map((b, i) => (
                                <div key={i} className="p-1.5 rounded bg-slate-900 border border-white/5 flex items-center justify-between">
                                  <span className="text-slate-300">{b.name}</span>
                                  <span className="text-cyan-300 font-bold">{b.runs}{b.notOut ? '*' : ''} ({b.balls}b, SR: {b.strikeRate})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-2.5 bg-slate-950 border-t border-white/10 text-xs text-slate-400 shrink-0 gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Telemetry feed auto-updates every 6s</span>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToCalendar && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToCalendar();
                }}
                className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer text-[11px]"
              >
                Go to Full Sports Fixtures Schedule →
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-white/10 transition-colors cursor-pointer text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
