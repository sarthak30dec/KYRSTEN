import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Volume1,
  Radio,
  Music2,
  Search,
  Repeat,
  Repeat1,
  Shuffle,
  ListMusic,
  Sparkles,
  Disc3,
  ExternalLink,
  Sliders,
  X,
  ChevronUp,
  ChevronDown,
  Loader2,
  Headphones,
  Zap,
  Film,
} from 'lucide-react';
import { MusicTrack, MusicStation, RepeatMode } from '../types';
import { CURATED_STATIONS, CURATED_TRACKS, searchFreeMusic } from '../data/musicTracks';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface MusicPlayerSectionProps {
  isAssistantSpeaking: boolean;
  onSendChatPrompt?: (prompt: string) => void;
  externalCommand?: {
    action: string;
    query?: string;
    value?: number;
    track?: MusicTrack;
    timestamp: number;
  } | null;
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  onPlaybackChange?: (isPlaying: boolean, track: MusicTrack | null) => void;
}

export const MusicPlayerSection: React.FC<MusicPlayerSectionProps> = ({
  isAssistantSpeaking,
  onSendChatPrompt,
  externalCommand,
  isOpen,
  onClose,
  onOpen,
  onPlaybackChange,
}) => {
  // Audio Element Ref
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const isYtReadyRef = useRef<boolean>(false);
  const pendingTrackRef = useRef<MusicTrack | null>(null);

  // Player State
  const [currentTrack, setCurrentTrack] = useState<MusicTrack>(CURATED_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.75);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(194);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showVideoStage, setShowVideoStage] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'stations' | 'curated' | 'search' | 'queue'>('stations');

  // Search & Track Library State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [queue, setQueue] = useState<MusicTrack[]>([...CURATED_TRACKS]);
  const [customStreamInput, setCustomStreamInput] = useState<string>('');

  // Notify parent of playback state safely without infinite render loop
  const onPlaybackChangeRef = useRef(onPlaybackChange);
  const volumeRef = useRef(volume);
  const repeatModeRef = useRef(repeatMode);

  useEffect(() => {
    onPlaybackChangeRef.current = onPlaybackChange;
  }, [onPlaybackChange]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  const lastReportedStateRef = useRef<{ playing: boolean; trackId: string | null }>({
    playing: false,
    trackId: null,
  });

  useEffect(() => {
    const trackId = currentTrack?.id || null;
    if (
      lastReportedStateRef.current.playing !== isPlaying ||
      lastReportedStateRef.current.trackId !== trackId
    ) {
      lastReportedStateRef.current = { playing: isPlaying, trackId };
      onPlaybackChangeRef.current?.(isPlaying, currentTrack);
    }
  }, [isPlaying, currentTrack]);

  const isCurrentTrackYouTube = (track?: MusicTrack | null) => {
    const t = track || currentTrack;
    if (!t) return false;
    return t.source === 'youtube' || Boolean(t.youtubeId) || Boolean(t.streamUrl?.includes('youtube.com'));
  };

  const getTrackYouTubeId = (track?: MusicTrack | null): string => {
    const t = track || currentTrack;
    if (!t) return '';
    if (t.youtubeId) return t.youtubeId;
    if (t.streamUrl) {
      const match = t.streamUrl.match(/(?:v=|youtu\.be\/|embed\/)([^&#?]+)/);
      if (match && match[1]) return match[1];
    }
    return '';
  };

  // Helper to safely play YouTube video
  const playYouTubeTrack = useCallback((videoId: string, autoPlay: boolean = true) => {
    if (!videoId) return;

    if (ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
      try {
        ytPlayerRef.current.loadVideoById(videoId);
        if (autoPlay) {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      } catch (err) {
        console.warn('Error loading YouTube video:', err);
      }
    } else {
      pendingTrackRef.current = currentTrack;
    }
  }, [currentTrack]);

  // Initialize YouTube IFrame API
  useEffect(() => {
    const initYT = () => {
      if (ytPlayerRef.current || !window.YT || !window.YT.Player) return;
      try {
        ytPlayerRef.current = new window.YT.Player('kyrsten-yt-player-target', {
          height: '100%',
          width: '100%',
          videoId: 'TKroT98Ep0Y',
          playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 0,
            fs: 1,
            modestbranding: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event: any) => {
              isYtReadyRef.current = true;
              event.target.setVolume(Math.round(volumeRef.current * 100));
              if (pendingTrackRef.current) {
                const vid = getTrackYouTubeId(pendingTrackRef.current);
                if (vid) {
                  event.target.loadVideoById(vid);
                  event.target.playVideo();
                  setIsPlaying(true);
                }
                pendingTrackRef.current = null;
              }
            },
            onStateChange: (event: any) => {
              if (event.data === 1) {
                setIsPlaying(true);
                setIsLoading(false);
                try {
                  const dur = event.target.getDuration();
                  if (dur && !isNaN(dur) && dur > 0) {
                    setDuration(dur);
                  }
                } catch {}
              } else if (event.data === 2) {
                setIsPlaying(false);
                setIsLoading(false);
              } else if (event.data === 3) {
                setIsLoading(true);
              } else if (event.data === 0) {
                setIsPlaying(false);
                setIsLoading(false);
                if (repeatModeRef.current === 'one') {
                  event.target.seekTo(0, true);
                  event.target.playVideo();
                } else {
                  handleNextTrack();
                }
              }
            },
            onError: (err: any) => {
              console.warn('YouTube Player API error event:', err);
              setIsLoading(false);
              setIsPlaying(false);
            },
          },
        });
      } catch (e) {
        console.warn('Failed to init YT player instance:', e);
      }
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.onerror = () => {
        // Silently handle if offline or YouTube blocked
      };
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = () => {
        try {
          initYT();
        } catch {}
      };
    } else if (window.YT && window.YT.Player) {
      try {
        initYT();
      } catch {}
    }
  }, []);

  // Periodic time update ticker for YouTube
  useEffect(() => {
    let interval: any = null;
    const isYT = isCurrentTrackYouTube(currentTrack);

    if (isPlaying && isYT) {
      interval = setInterval(() => {
        if (ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          try {
            const t = ytPlayerRef.current.getCurrentTime();
            if (typeof t === 'number' && !isNaN(t)) {
              setCurrentTime(t);
            }
            const d = ytPlayerRef.current.getDuration();
            if (typeof d === 'number' && !isNaN(d) && d > 0) {
              setDuration(d);
            }
          } catch {}
        }
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentTrack]);

  // Audio Ducking state & volume sync
  useEffect(() => {
    const isYT = isCurrentTrackYouTube(currentTrack);
    const targetVol = isAssistantSpeaking
      ? Math.max(0.08, volume * 0.25)
      : isMuted
      ? 0
      : volume;

    if (audioRef.current) {
      audioRef.current.volume = targetVol;
    }

    if (ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(Math.round(targetVol * 100));
      } catch {}
    }
  }, [isAssistantSpeaking, volume, isMuted, currentTrack]);

  // Handle external commands from Chat/Voice Assistant Tools
  useEffect(() => {
    if (!externalCommand) return;
    const { action, query, value, track } = externalCommand;

    if (action === 'play') {
      if (track) {
        handleSelectTrack(track, true);
      } else if (query) {
        handlePlayByQuery(query);
      }
    } else if (action === 'pause' || action === 'stop') {
      pauseAudio();
    } else if (action === 'resume' || action === 'play') {
      playAudio();
    } else if (action === 'next') {
      handleNextTrack();
    } else if (action === 'previous') {
      handlePrevTrack();
    } else if (action === 'volume' && typeof value === 'number') {
      const normalized = Math.max(0, Math.min(1, value / 100));
      setVolume(normalized);
      if (audioRef.current) audioRef.current.volume = normalized;
      if (ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        try {
          ytPlayerRef.current.setVolume(Math.round(normalized * 100));
        } catch {}
      }
      setIsMuted(false);
    } else if (action === 'toggle_mute') {
      toggleMute();
    } else if (action === 'shuffle') {
      setIsShuffle((prev) => !prev);
    }
  }, [externalCommand]);

  // Unified Play function
  const playAudio = () => {
    const isYT = isCurrentTrackYouTube(currentTrack);
    setIsLoading(true);

    if (isYT) {
      const vidId = getTrackYouTubeId(currentTrack);
      if (ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.playVideo === 'function') {
        try {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          setIsLoading(false);
        } catch (err) {
          console.warn('YouTube play error:', err);
          setIsLoading(false);
        }
      } else if (vidId) {
        playYouTubeTrack(vidId, true);
      }
    } else {
      if (audioRef.current) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setIsLoading(false);
            })
            .catch((err) => {
              console.warn('HTML5 Audio playback error / user gesture needed:', err);
              setIsPlaying(false);
              setIsLoading(false);
            });
        }
      }
    }
  };

  // Unified Pause function
  const pauseAudio = () => {
    const isYT = isCurrentTrackYouTube(currentTrack);
    if (isYT) {
      if (ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const handleSelectTrack = (track: MusicTrack, autoPlay: boolean = true) => {
    setCurrentTrack(track);
    setCurrentTime(0);
    if (track.duration && track.duration > 0) {
      setDuration(track.duration);
    }

    const isYT = isCurrentTrackYouTube(track);

    if (isYT) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const vidId = getTrackYouTubeId(track);
      if (vidId) {
        playYouTubeTrack(vidId, autoPlay);
      }
    } else {
      if (ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch {}
      }
      if (audioRef.current) {
        audioRef.current.src = track.streamUrl;
        audioRef.current.load();
        if (autoPlay) {
          setTimeout(() => {
            playAudio();
          }, 100);
        }
      }
    }
  };

  const handleSelectStation = (station: MusicStation) => {
    const trackFromStation: MusicTrack = {
      id: station.id,
      title: station.name,
      artist: station.genre,
      duration: 0, // Live stream has dynamic duration
      streamUrl: station.streamUrl,
      artworkUrl: station.coverArt,
      genre: station.genre,
      source: 'radio',
      description: station.description,
    };
    handleSelectTrack(trackFromStation, true);
  };

  const handlePlayByQuery = async (query: string) => {
    setIsLoading(true);
    try {
      const results = await searchFreeMusic(query);
      if (results && results.length > 0) {
        handleSelectTrack(results[0], true);
      }
    } catch (err) {
      console.error('Error finding music by query:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextTrack = () => {
    if (queue.length === 0) return;
    if (isShuffle) {
      const randIndex = Math.floor(Math.random() * queue.length);
      handleSelectTrack(queue[randIndex], true);
      return;
    }
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % queue.length;
    handleSelectTrack(queue[nextIndex], true);
  };

  const handlePrevTrack = () => {
    if (queue.length === 0) return;
    if (currentTime > 4) {
      const isYT = isCurrentTrackYouTube(currentTrack);
      if (isYT && ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(0, true);
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      return;
    }
    const currentIndex = queue.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
    handleSelectTrack(queue[prevIndex], true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    const isYT = isCurrentTrackYouTube(currentTrack);
    if (isYT && ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      try {
        ytPlayerRef.current.seekTo(newTime, true);
      } catch {}
    } else if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
    if (ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(Math.round(newVol * 100));
      } catch {}
    }
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const isYT = isCurrentTrackYouTube(currentTrack);
    if (isMuted) {
      if (audioRef.current) audioRef.current.volume = volume;
      if (ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        try {
          ytPlayerRef.current.setVolume(Math.round(volume * 100));
        } catch {}
      }
      setIsMuted(false);
    } else {
      if (audioRef.current) audioRef.current.volume = 0;
      if (ytPlayerRef.current && isYtReadyRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        try {
          ytPlayerRef.current.setVolume(0);
        } catch {}
      }
      setIsMuted(true);
    }
  };

  const toggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  // Search function with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchFreeMusic(searchQuery);
        setSearchResults(results);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAddCustomStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStreamInput.trim()) return;
    const customTrack: MusicTrack = {
      id: `custom-${Date.now()}`,
      title: 'Custom Audio Stream',
      artist: 'Direct Web Source',
      duration: 0,
      streamUrl: customStreamInput.trim(),
      artworkUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      source: 'custom',
      userUploaded: true,
    };
    handleSelectTrack(customTrack, true);
    setCustomStreamInput('');
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const isYT = isCurrentTrackYouTube(currentTrack);

  const content = (
    <section
      id="kyrsten-music-player-section"
      className="w-full bg-slate-900/95 border border-cyan-500/30 rounded-3xl backdrop-blur-2xl shadow-2xl transition-all duration-300 select-none overflow-hidden"
    >
      {/* Hidden HTML5 Audio Tag for Direct Audio Streams (iTunes, Audius, Radio, MP3) */}
      <audio
        ref={audioRef}
        src={!isYT ? currentTrack.streamUrl : undefined}
        preload="metadata"
        onTimeUpdate={() => {
          if (!isYT && audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onDurationChange={() => {
          if (!isYT && audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={() => {
          if (!isYT) {
            if (repeatMode === 'one') {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                playAudio();
              }
            } else {
              handleNextTrack();
            }
          }
        }}
        onWaiting={() => {
          if (!isYT) setIsLoading(true);
        }}
        onPlaying={() => {
          if (!isYT) {
            setIsPlaying(true);
            setIsLoading(false);
          }
        }}
        onError={(e) => {
          if (!isYT) {
            console.warn('Audio stream error, retrying next track:', e);
            setIsLoading(false);
            setIsPlaying(false);
          }
        }}
      />

      {/* YouTube IFrame Player Anchor (Seamless Background or Visual Stage) */}
      <div
        className={`w-full max-w-7xl mx-auto px-4 overflow-hidden transition-all duration-300 ${
          showVideoStage && isYT ? 'max-h-80 py-3 block' : 'h-0 py-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="relative w-full max-w-md mx-auto aspect-video rounded-2xl overflow-hidden border border-cyan-500/40 shadow-2xl bg-black">
          <div id="kyrsten-yt-player-target" className="w-full h-full" />
        </div>
      </div>

      {/* Persistent Compact Player Dock */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Track Metadata & Artwork */}
        <div className="flex items-center gap-3 w-full md:w-1/3 min-w-0">
          <div className="relative group shrink-0">
            <img
              src={
                currentTrack.artworkUrl ||
                'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'
              }
              alt={currentTrack.title}
              className={`w-12 h-12 rounded-xl object-cover border border-white/10 shadow-md ${
                isPlaying ? 'ring-2 ring-cyan-400/50' : ''
              }`}
            />
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
                <Disc3 className="w-5 h-5 text-cyan-300 animate-spin" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate tracking-wide">
                {currentTrack.title}
              </h4>
              <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 uppercase">
                {currentTrack.source === 'youtube' || currentTrack.youtubeId
                  ? 'YOUTUBE'
                  : currentTrack.source === 'itunes'
                  ? 'ITUNES HD'
                  : currentTrack.source === 'radio'
                  ? '24/7 LIVE'
                  : currentTrack.genre || 'AD-FREE'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
              <span>{currentTrack.artist}</span>
              {isAssistantSpeaking && (
                <span className="text-amber-400 font-mono text-[10px] animate-pulse">
                  (Ducking: Assistant Speaking)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Center: Controls & Scrubber */}
        <div className="flex flex-col items-center gap-1.5 w-full md:w-5/12">
          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleRepeat}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                repeatMode !== 'off'
                  ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handlePrevTrack}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Previous Track"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className="p-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
              title={isPlaying ? 'Pause Music' : 'Play Music'}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-slate-950" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current text-slate-950" />
              ) : (
                <Play className="w-5 h-5 fill-current text-slate-950 translate-x-0.5" />
              )}
            </button>

            <button
              onClick={handleNextTrack}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={() => setIsShuffle((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isShuffle
                  ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`Shuffle: ${isShuffle ? 'ON' : 'OFF'}`}
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time Scrubber Bar */}
          <div className="w-full flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span className="w-8 text-right">{formatTime(currentTime)}</span>
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={duration > 0 ? duration : 100}
                value={currentTime}
                onChange={handleSeek}
                disabled={currentTrack.source === 'radio'}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"
              />
            </div>
            <span className="w-8">
              {currentTrack.source === 'radio' ? 'LIVE' : formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Right Side: Video Toggle, Volume, Spectrum, & Drawer Toggle */}
        <div className="flex items-center justify-end gap-2.5 w-full md:w-1/3">
          {/* YouTube Video Screen Toggle */}
          {isYT && (
            <button
              onClick={() => setShowVideoStage((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-all text-xs font-mono flex items-center gap-1 cursor-pointer border ${
                showVideoStage
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-white border-white/10'
              }`}
              title={showVideoStage ? 'Hide Video Stage' : 'Show Video Stage'}
            >
              <Film className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">{showVideoStage ? 'Hide Stage' : 'Watch Stage'}</span>
            </button>
          )}

          {/* Animated Cyber Spectrum Bars */}
          <div className="hidden sm:flex items-center gap-0.5 h-6 px-2 rounded-lg bg-slate-950/60 border border-white/5">
            {[40, 75, 55, 90, 60, 85, 45, 95, 70, 50].map((h, i) => (
              <span
                key={i}
                className={`w-1 rounded-full bg-cyan-400 transition-all duration-150 ${
                  isPlaying ? 'opacity-90' : 'opacity-20 !h-1'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(4, (h * (volume || 0.5)) / 4)}px` : '3px',
                  animation: isPlaying ? `pulse 0.8s ease-in-out infinite ${i * 0.1}s` : 'none',
                }}
              />
            ))}
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 sm:w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Expand Drawer Button */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all cursor-pointer ${
              isExpanded
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 hover:border-cyan-500/30'
            }`}
          >
            <Music2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Explore & Search</span>
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Station & Global Search Drawer */}
      {isExpanded && (
        <div className="border-t border-white/10 bg-slate-950/95 p-4 sm:p-6 transition-all animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="max-w-7xl mx-auto space-y-5">
            {/* Header & Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Inbuilt Ad-Free Music Deck
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      100% FREE • NO ADS
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Audius Open Music Network, 24/7 curated focus radios & custom streaming audio
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setActiveTab('stations')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer shrink-0 ${
                    activeTab === 'stations'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 inline mr-1.5" />
                  Live Radios
                </button>
                <button
                  onClick={() => setActiveTab('curated')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer shrink-0 ${
                    activeTab === 'curated'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
                  Curated Masters
                </button>
                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer shrink-0 ${
                    activeTab === 'search'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 inline mr-1.5" />
                  Global Scraper & Search
                </button>
                <button
                  onClick={() => setActiveTab('queue')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer shrink-0 ${
                    activeTab === 'queue'
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <ListMusic className="w-3.5 h-3.5 inline mr-1.5" />
                  Queue ({queue.length})
                </button>
              </div>
            </div>

            {/* Tab 1: Live Radio Stations */}
            {activeTab === 'stations' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {CURATED_STATIONS.map((station) => {
                  const isCurrent = currentTrack.id === station.id && isPlaying;
                  return (
                    <div
                      key={station.id}
                      onClick={() => handleSelectStation(station)}
                      className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex gap-3.5 items-center ${
                        currentTrack.id === station.id
                          ? 'bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/10'
                          : 'bg-slate-900/60 hover:bg-slate-900 border-white/10 hover:border-cyan-500/40'
                      }`}
                    >
                      <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-xl">
                        <img
                          src={station.coverArt}
                          alt={station.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition-all">
                          {isCurrent ? (
                            <div className="w-8 h-8 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg">
                              <Pause className="w-4 h-4 fill-current" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-900/80 group-hover:bg-cyan-500 text-white group-hover:text-slate-950 flex items-center justify-center shadow-lg transition-colors">
                              <Play className="w-4 h-4 fill-current translate-x-0.5" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                            {station.badge || station.genre}
                          </span>
                          {currentTrack.id === station.id && isPlaying && (
                            <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              STREAMING
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                          {station.name}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {station.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Curated Master Tracks */}
            {activeTab === 'curated' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {CURATED_TRACKS.map((track) => {
                  const isCurrent = currentTrack.id === track.id && isPlaying;
                  return (
                    <div
                      key={track.id}
                      onClick={() => handleSelectTrack(track, true)}
                      className={`group p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 items-center ${
                        currentTrack.id === track.id
                          ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-500/10'
                          : 'bg-slate-900/60 hover:bg-slate-900 border-white/10 hover:border-cyan-500/30'
                      }`}
                    >
                      <img
                        src={track.artworkUrl}
                        alt={track.title}
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                          {track.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400">
                          <span>{formatTime(track.duration)}</span>
                          <span>•</span>
                          <span className="text-cyan-400/80">{track.genre}</span>
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-white/5 group-hover:bg-cyan-500 group-hover:text-slate-950 text-slate-300 transition-all">
                        {isCurrent ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tab 3: Global Web Scraper & Multi-Source Search */}
            {activeTab === 'search' && (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search any artist, song, game OST, theme, or remix (e.g. Batman Arkham City Main Theme Nick Arundel, Interstellar, Cyberpunk, Lofi)..."
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-white/10 focus:border-cyan-400 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-hidden transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Search Chips */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">Try Searches:</span>
                  {[
                    'Batman Arkham City Main Theme Nick Arundel',
                    'Hans Zimmer Time Interstellar',
                    'Lofi Hip Hop Chill Beats',
                    'Synthwave 80s Cyberpunk',
                    'Chopin Nocturne Piano',
                  ].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSearchQuery(tag)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 text-[11px] font-mono text-slate-300 hover:text-cyan-300 transition-all shrink-0 cursor-pointer"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Results List */}
                {isSearching ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400 font-mono text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    <span>Running Python 3.10 Global Web Scraper & Multi-Source Engine...</span>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
                    {searchResults.map((track) => (
                      <div
                        key={track.id}
                        onClick={() => {
                          handleSelectTrack(track, true);
                          // Add to queue if not already
                          if (!queue.some((q) => q.id === track.id)) {
                            setQueue((prev) => [track, ...prev]);
                          }
                        }}
                        className="group p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/10 hover:border-cyan-400 transition-all cursor-pointer flex items-center gap-3"
                      >
                        <img
                          src={track.artworkUrl}
                          alt={track.title}
                          className="w-11 h-11 rounded-lg object-cover shrink-0 border border-white/10"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-100 truncate group-hover:text-cyan-300">
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              {track.source === 'itunes'
                                ? 'Python Scraper • iTunes HD'
                                : track.source === 'youtube'
                                ? 'Python Scraper • YouTube'
                                : track.source === 'audius'
                                ? 'Audius Network'
                                : track.genre || 'Web Audio'}
                            </span>
                            {track.durationText && (
                              <span className="text-[10px] font-mono text-slate-500">{track.durationText}</span>
                            )}
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-white/5 group-hover:bg-cyan-500 group-hover:text-slate-950 text-slate-300 transition-all">
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div className="py-8 text-center text-xs font-mono text-slate-400">
                    No results found for "{searchQuery}". Try another keyword or artist.
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs font-mono text-slate-400">
                    Type a song title, artist, or soundtrack name above to scrape and stream music globally online.
                  </div>
                )}

                {/* Custom Direct Stream URL Input */}
                <form onSubmit={handleAddCustomStream} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-semibold text-slate-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Stream Custom MP3 / Radio URL:
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customStreamInput}
                      onChange={(e) => setCustomStreamInput(e.target.value)}
                      placeholder="https://your-stream-url.mp3 or radio stream link..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-slate-100 focus:outline-hidden focus:border-cyan-400"
                    />
                    <button
                      type="submit"
                      disabled={!customStreamInput.trim()}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-mono font-bold transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Stream Audio
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Tab 4: Queue Management */}
            {activeTab === 'queue' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>Up Next ({queue.length} Tracks):</span>
                  <button
                    onClick={() => setQueue([...CURATED_TRACKS])}
                    className="text-cyan-400 hover:underline cursor-pointer"
                  >
                    Reset to Default Curated Queue
                  </button>
                </div>
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {queue.map((track, idx) => (
                    <div
                      key={`${track.id}-${idx}`}
                      onClick={() => handleSelectTrack(track, true)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        currentTrack.id === track.id
                          ? 'bg-cyan-950/40 border-cyan-400 text-cyan-300'
                          : 'bg-slate-900/50 hover:bg-slate-900 border-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 text-xs font-mono text-slate-500">{idx + 1}</span>
                        <img
                          src={track.artworkUrl}
                          alt={track.title}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <h5 className="text-xs font-semibold truncate">{track.title}</h5>
                          <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                        <span>{formatTime(track.duration)}</span>
                        {currentTrack.id === track.id && isPlaying && (
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assistant Voice & Chat Integration Bar */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2 text-slate-300">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Voice Connected: Say <span className="text-cyan-300">"Hey Kyrsten, play some lofi beats"</span> or{' '}
                  <span className="text-cyan-300">"pause music"</span>
                </span>
              </div>

              {onSendChatPrompt && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSendChatPrompt('Kyrsten, play some relaxing lo-fi focus music')}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
                  >
                    💬 Ask: "Play Lofi"
                  </button>
                  <button
                    onClick={() => onSendChatPrompt('Kyrsten, switch music to Cyberpunk Synthwave')}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 hover:text-cyan-300 transition-all cursor-pointer"
                  >
                    💬 Ask: "Play Synthwave"
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );

  if (isOpen !== undefined) {
    return (
      <>
        {/* Floating Mini Player Pill (Shown when modal is closed to give quick access & status) */}
        {!isOpen && (
          <div
            id="kyrsten-floating-music-pill"
            onClick={onOpen}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-xl hover:border-cyan-400/80 transition-all cursor-pointer group select-none animate-in fade-in slide-in-from-bottom-2"
            title="Music Mode Active — Click to expand full deck"
          >
            {/* Visualizer art / disc */}
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-cyan-500/30">
              <img
                src={
                  currentTrack.artworkUrl ||
                  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80'
                }
                alt={currentTrack.title}
                className={`w-full h-full object-cover ${isPlaying ? 'animate-pulse' : ''}`}
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 h-full bg-cyan-400 animate-pulse" />
                    <span className="w-0.5 h-2/3 bg-cyan-400 animate-pulse delay-75" />
                    <span className="w-0.5 h-4/5 bg-cyan-400 animate-pulse delay-150" />
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col min-w-0 max-w-[150px] sm:max-w-[190px]">
              <span className="text-[10px] font-mono text-cyan-400 tracking-wider uppercase flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-cyan-400 animate-ping' : 'bg-slate-500'}`} />
                {isPlaying ? 'Music Mode' : 'Music Idle'}
              </span>
              <span className="text-xs font-medium text-white truncate group-hover:text-cyan-200 transition-colors">
                {currentTrack.title}
              </span>
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlayPause();
                }}
                className="p-1.5 rounded-full bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-all cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextTrack();
                }}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Overlay & Persistent Deck (Kept permanently mounted so audio streams and YouTube iframe never drop) */}
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md transition-all duration-300 ${
            isOpen
              ? 'opacity-100 pointer-events-auto visible scale-100'
              : 'opacity-0 pointer-events-none invisible scale-95 fixed -left-[9999px] -top-[9999px] w-0 h-0 overflow-hidden'
          }`}
          aria-hidden={!isOpen}
        >
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="absolute -top-12 right-0 p-2 rounded-full bg-slate-800/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 transition-colors cursor-pointer flex items-center gap-1 text-xs font-mono"
              >
                <X className="w-4 h-4" />
                <span>CLOSE MUSIC DECK</span>
              </button>
            )}
            {content}
          </div>
        </div>
      </>
    );
  }

  return content;
};
