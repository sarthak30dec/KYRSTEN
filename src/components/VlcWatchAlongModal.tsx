import React, { useState, useEffect } from 'react';
import {
  Film,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  X,
  Lock,
  Unlock,
  Sparkles,
  Cpu,
  Tv,
  Eye,
  Info,
  Radio
} from 'lucide-react';

interface VlcWatchAlongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerVoiceCommand?: (prompt: string) => void;
}

export const VlcWatchAlongModal: React.FC<VlcWatchAlongModalProps> = ({
  isOpen,
  onClose,
  onTriggerVoiceCommand,
}) => {
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [detecting, setDetecting] = useState<boolean>(false);
  const [detectedInstance, setDetectedInstance] = useState<any>(null);
  const [detectionMessage, setDetectionMessage] = useState<string>('');
  const [spawning, setSpawning] = useState<boolean>(false);
  const [trivia, setTrivia] = useState<string[]>([]);
  const [testTitle, setTestTitle] = useState<string>('Interstellar.2014.1080p.BluRay.x264.mkv');
  const [manualTitle, setManualTitle] = useState<string>('');
  const [manualTime, setManualTime] = useState<string>('00:00');
  const [syncing, setSyncing] = useState<boolean>(false);

  // Load permission status on open
  useEffect(() => {
    if (isOpen) {
      checkPermission();
    }
  }, [isOpen]);

  const checkPermission = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vlc/permission');
      const data = await res.json();
      setPermissionGranted(Boolean(data.permissionGranted));
      if (data.permissionGranted) {
        // Automatically check status if permission already granted
        checkStatus();
      }
    } catch (err) {
      console.warn('Error checking VLC permission:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPermission = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vlc/permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted: true }),
      });
      const data = await res.json();
      setPermissionGranted(true);
      setDetectionMessage(data.text || 'Permission confirmed, Boss. I can now detect your background VLC instances.');
      if (data.detected && data.vlc) {
        setDetectedInstance(data.vlc);
      } else {
        // Run full detect
        handleDetect();
      }
    } catch (err) {
      console.warn('Error granting VLC permission:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokePermission = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vlc/permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted: false }),
      });
      const data = await res.json();
      setPermissionGranted(false);
      setDetectedInstance(null);
      setDetectionMessage(data.text || 'Permission revoked.');
    } catch (err) {
      console.warn('Error revoking VLC permission:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDetect = async () => {
    try {
      setDetecting(true);
      setTrivia([]);
      const res = await fetch('/api/vlc/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false }),
      });
      const data = await res.json();
      setDetectionMessage(data.text || '');
      const vlc = data?.vlc || data;
      if (vlc && (vlc.connected || vlc.processDetected || vlc.mediaDetected) && vlc.interface !== 'none' && vlc.interface !== 'permission_required') {
        setDetectedInstance(vlc);
      } else {
        setDetectedInstance(null);
      }
    } catch (err) {
      console.warn('Error detecting VLC:', err);
    } finally {
      setDetecting(false);
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/vlc/status');
      const data = await res.json();
      const vlc = data?.vlc || data;
      if (vlc && (vlc.connected || vlc.processDetected || vlc.mediaDetected) && vlc.interface !== 'none' && vlc.interface !== 'permission_required') {
        setDetectedInstance(vlc);
      } else {
        setDetectedInstance(null);
      }
    } catch (err) {
      console.warn('Error checking VLC status:', err);
    }
  };

  const handleSpawnTestVlc = async () => {
    try {
      setSpawning(true);
      const res = await fetch('/api/vlc/spawn-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_hint: testTitle }),
      });
      const data = await res.json();
      setPermissionGranted(true);
      if (data.vlc) {
        setDetectedInstance(data.vlc);
      }
      setDetectionMessage(data.text || 'Background VLC process launched.');
    } catch (err) {
      console.warn('Error spawning background VLC:', err);
    } finally {
      setSpawning(false);
    }
  };

  const handleStopTestVlc = async () => {
    try {
      setSpawning(true);
      const res = await fetch('/api/vlc/stop-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setDetectedInstance(null);
      setDetectionMessage(data.text || 'Background VLC process stopped.');
    } catch (err) {
      console.warn('Error stopping background VLC:', err);
    } finally {
      setSpawning(false);
    }
  };

  const handleResetSession = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vlc/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setDetectedInstance(null);
      setTrivia([]);
      setDetectionMessage(data.text || 'Watch-Along session cleared. VLC is now disconnected.');
    } catch (err) {
      console.warn('Error resetting VLC session:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!manualTitle.trim()) return;
    try {
      setSyncing(true);
      const res = await fetch('/api/vlc/watch-along', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          media_hint: manualTitle.trim(),
          current_time_str: manualTime.trim() || '00:00',
        }),
      });
      const data = await res.json();
      if (data.vlc) {
        setDetectedInstance(data.vlc);
      }
      setDetectionMessage(`Synced with ${manualTitle.trim()} at ${manualTime.trim() || '00:00'}.`);
    } catch (err) {
      console.warn('Error manually syncing VLC:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleFetchTrivia = async () => {
    if (!detectedInstance?.cleanTitle) return;
    try {
      const res = await fetch('/api/vlc/watch-along', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trivia',
          media_hint: detectedInstance.cleanTitle,
        }),
      });
      const data = await res.json();
      if (data.facts && Array.isArray(data.facts)) {
        setTrivia(data.facts);
      }
    } catch (err) {
      console.warn('Error fetching trivia:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-950/95 border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 overflow-hidden font-sans text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide font-hud">
                  VLC Watch-Along Companion
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase font-semibold">
                  Python 3.10 Core
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Background instance detection, playback sync, and anti-spoiler protected companion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          
          {/* Permission Section */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {permissionGranted ? (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    <span>System Scan Permission:</span>
                    <span className={permissionGranted ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono'}>
                      {permissionGranted ? 'GRANTED' : 'PERMISSION REQUIRED'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {permissionGranted
                      ? 'Kyrsten is authorized to detect and monitor VLC Media Player running in the background.'
                      : 'Kyrsten requires your explicit permission before scanning system processes or background ports.'}
                  </p>
                </div>
              </div>

              <div>
                {permissionGranted ? (
                  <button
                    onClick={handleRevokePermission}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Revoke
                  </button>
                ) : (
                  <button
                    onClick={handleGrantPermission}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-cyan-500/20"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Grant Permission
                  </button>
                )}
              </div>
            </div>

            {detectionMessage && (
              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-200 flex items-start gap-2">
                <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{detectionMessage}</span>
              </div>
            )}
          </div>

          {/* Detection & Live Instance Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  Live Background VLC Status
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDetect}
                  disabled={detecting || !permissionGranted}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold disabled:opacity-50 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${detecting ? 'animate-spin' : ''}`} />
                  {detecting ? 'Scanning...' : 'Detect VLC'}
                </button>
                <button
                  onClick={handleResetSession}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
                  title="Wipe previous session and disconnect"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset / Disconnect
                </button>
              </div>
            </div>

            {detectedInstance ? (
              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    VLC Instance Detected in Background
                  </span>
                  {detectedInstance.pid && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-cyan-300">
                      PID: {detectedInstance.pid}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">
                    {detectedInstance.cleanTitle || detectedInstance.rawTitle || 'Active Video Session'}
                  </div>
                  {detectedInstance.cmdline && (
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      Command: {detectedInstance.cmdline}
                    </div>
                  )}
                </div>

                {/* Timeline progression */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-slate-400">
                    <span>{detectedInstance.currentTimeFormatted || '00:00'}</span>
                    <span>{detectedInstance.durationFormatted || 'Live'}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${Math.min(Math.max(detectedInstance.progressPercent || 0, 4), 100)}%` }}
                    />
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Anti-Spoiler Shield Active
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1">
                    <Tv className="w-3.5 h-3.5" />
                    Interface: {detectedInstance.interface || 'Process'}
                  </span>
                  {detectedInstance.processDetected !== undefined && (
                    <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${detectedInstance.processDetected ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                      <Cpu className="w-3.5 h-3.5" />
                      {detectedInstance.processDetected ? 'Host Process Detected' : 'No Process'}
                    </span>
                  )}
                  {detectedInstance.playbackSynchronized !== undefined && (
                    <span className={`px-2 py-0.5 rounded-md border flex items-center gap-1 ${detectedInstance.playbackSynchronized ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'}`}>
                      <Radio className="w-3.5 h-3.5" />
                      {detectedInstance.playbackSynchronized ? 'Live VLC Telemetry' : 'Local Estimator Sync'}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleFetchTrivia}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Get Spoiler-Safe Trivia
                  </button>
                  {onTriggerVoiceCommand && (
                    <button
                      onClick={() => {
                        onTriggerVoiceCommand("Kyrsten, what do you think of this scene we are watching on VLC?");
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-300 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      React to Scene
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-white/5 border border-white/5 text-center space-y-2">
                <Film className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">
                  No VLC Process Detected Currently
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Start VLC on your machine, or click &quot;Spawn Background VLC Process&quot; below to run a test instance in the container and confirm detection.
                </p>
              </div>
            )}

            {/* Trivia list if fetched */}
            {trivia.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Behind-The-Scenes Trivia (Spoiler Protected)
                </div>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  {trivia.map((t, idx) => (
                    <li key={idx} className="leading-relaxed">{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Manual Player Sync */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-cyan-400" />
                Direct Media Sync (Any Player or Device)
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tell Kyrsten what you are watching and your current timestamp to immediately sync watch-along state.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Title (e.g. Severance S02E01, Inception)"
                className="flex-1 w-full px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
              />
              <input
                type="text"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                placeholder="Time (e.g. 14:20)"
                className="w-full sm:w-28 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono text-center"
              />
              <button
                onClick={handleManualSync}
                disabled={syncing || !manualTitle.trim()}
                className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 whitespace-nowrap"
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>

          {/* Test Background Instance Spawner */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white">
                  Container Background VLC Simulator
                </h4>
                <p className="text-[11px] text-slate-400">
                  Spawns a real background daemon mimicking a live VLC player so you can test detection anytime.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {detectedInstance?.interface === 'background_daemon' ? (
                  <button
                    onClick={handleStopTestVlc}
                    disabled={spawning}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Stop Background VLC
                  </button>
                ) : (
                  <button
                    onClick={handleSpawnTestVlc}
                    disabled={spawning}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {spawning ? 'Launching...' : 'Spawn Background VLC'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Media filename or title"
                className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>

          {/* Voice Prompt Suggestions */}
          {onTriggerVoiceCommand && (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                Spoken Voice Commands for Boss
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    onTriggerVoiceCommand("Kyrsten, check if VLC is running in the background.");
                    onClose();
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-left text-slate-300 hover:text-white border border-white/5 transition-colors"
                >
                  &quot;Kyrsten, check if VLC is running in the background.&quot;
                </button>
                <button
                  onClick={() => {
                    onTriggerVoiceCommand("Kyrsten, you have my permission to detect VLC.");
                    onClose();
                  }}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-left text-slate-300 hover:text-white border border-white/5 transition-colors"
                >
                  &quot;Kyrsten, you have my permission to detect VLC.&quot;
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-white/5 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            Anti-Spoiler Shield Guard
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
