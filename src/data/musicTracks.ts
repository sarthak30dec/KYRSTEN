import { MusicStation, MusicTrack } from '../types';

export const CURATED_STATIONS: MusicStation[] = [
  {
    id: 'station-lofi-beats',
    name: 'Lofi Study & Relax Lounge',
    genre: 'Lo-Fi / Chillhop',
    description: 'Ad-free warm vinyl beats, soft jazz chords & relaxed ambiance for deep focus.',
    coverArt: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    streamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    badge: '24/7 LIVE FOCUS',
  },
  {
    id: 'station-synthwave-cyberpunk',
    name: 'Night City Cyberpunk & Retrowave',
    genre: 'Synthwave / Cyberpunk',
    description: 'High-octane analog synthesizers, neon basslines & 80s retro-futuristic darksynth.',
    coverArt: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
    streamUrl: 'https://ice1.somafm.com/defcon-128-mp3',
    badge: 'NEON WAVE',
  },
  {
    id: 'station-ambient-space',
    name: 'Deep Space Cosmic Ambient',
    genre: 'Ambient / Drone',
    description: 'Ethereal soundscapes, meditative modular drone pads & zero-gravity celestial frequencies.',
    coverArt: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    streamUrl: 'https://ice1.somafm.com/dronezone-128-mp3',
    badge: 'TRANSCENDENCE',
  },
  {
    id: 'station-midnight-jazz',
    name: 'Midnight Velvet Jazz & Neo-Noir',
    genre: 'Jazz / Neo-Soul',
    description: 'Smoky saxophones, acoustic double bass, vintage Rhodes piano & gentle espionage grooves.',
    coverArt: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&auto=format&fit=crop&q=80',
    streamUrl: 'https://ice1.somafm.com/secretagent-128-mp3',
    badge: 'SMOOTH VINTAGE',
  },
  {
    id: 'station-deep-house',
    name: 'Neon Cyber Deep House & Melodic Techno',
    genre: 'Deep House / Melodic',
    description: 'Hypnotic four-on-the-floor rhythms, driving progressive arpeggios & euphoric energy.',
    coverArt: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    streamUrl: 'https://ice1.somafm.com/beatblender-128-mp3',
    badge: 'CLUB HORIZON',
  },
  {
    id: 'station-vaporwave',
    name: 'Vaporwaves & Chillwave Drift',
    genre: 'Vaporwave / Chill',
    description: 'Nostalgic slowed reverbs, analog synthesizer nostalgia & 90s aesthetic dreams.',
    coverArt: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80',
    streamUrl: 'https://ice1.somafm.com/vaporwaves-128-mp3',
    badge: 'VAPOR HORIZON',
  },
  {
    id: 'station-focus-classical',
    name: 'Lush Cinematic Orchestrations & Dream Pop',
    genre: 'Classical / Instrumental',
    description: 'Sensuous strings, evocative piano textures & modern minimalist cinematic atmosphere.',
    coverArt: 'https://images.unsplash.com/photo-1520523839898-507127054976?w=600&auto=format&fit=crop&q=80',
    streamUrl: 'https://ice1.somafm.com/lush-128-mp3',
    badge: 'CINEMATIC MIND',
  },
];

export const CURATED_TRACKS: MusicTrack[] = [
  {
    id: 'track-lofi-girl',
    title: 'Lofi Hip Hop Radio — Beats to Relax/Study to',
    artist: 'Lofi Girl',
    duration: 180,
    genre: 'Lo-Fi / Chillhop',
    youtubeId: 'jfKfPfyJRdk',
    streamUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    artworkUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    source: 'youtube',
    description: 'Continuous warm tape saturation, mellow piano chords & tranquil vinyl dust crackle.',
  },
  {
    id: 'track-synthwave-chill',
    title: 'Synthwave Radio — Chill / Retro Beats',
    artist: 'Lofi Girl / Synthwave',
    duration: 215,
    genre: 'Synthwave',
    youtubeId: '4xDzrJKXOOY',
    streamUrl: 'https://ice1.somafm.com/defcon-128-mp3',
    artworkUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
    source: 'youtube',
    description: 'Driving arpeggiated bass, gated reverb drums & analog synthesizer hooks.',
  },
  {
    id: 'track-cyberpunk-ambience',
    title: 'Cyberpunk 2077 Night City Radio',
    artist: 'Night City Radio',
    duration: 260,
    genre: 'Cyberpunk / Darksynth',
    youtubeId: 's31XTrUJ7VQ',
    streamUrl: 'https://ice1.somafm.com/defcon-128-mp3',
    artworkUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80',
    source: 'youtube',
    description: 'Subtle resonant filters, neon cyberpunk mood & deep meditation frequencies.',
  },
  {
    id: 'track-midnight-jazz-rain',
    title: 'Rainy Night Coffee Shop Jazz',
    artist: 'Coffee Shop Vibes',
    duration: 178,
    genre: 'Jazz',
    youtubeId: 'Dx5qFachd3A',
    streamUrl: 'https://ice1.somafm.com/secretagent-128-mp3',
    artworkUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=600&auto=format&fit=crop&q=80',
    source: 'youtube',
    description: 'Intimate brushed snare, upright bass walk & soulful Fender Rhodes keys.',
  },
  {
    id: 'track-deep-space-ambient',
    title: 'Deep Space Drone Zone Ambient',
    artist: 'SomaFM Ambient',
    duration: 232,
    genre: 'Ambient',
    streamUrl: 'https://ice1.somafm.com/dronezone-128-mp3',
    artworkUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80',
    source: 'radio',
    description: 'Zero-gravity celestial frequencies and deep harmonic modular drones.',
  },
  {
    id: 'track-deep-house-groove',
    title: 'Melodic Techno & Deep House Pulse',
    artist: 'Beat Blender',
    duration: 245,
    genre: 'Deep House',
    streamUrl: 'https://ice1.somafm.com/beatblender-128-mp3',
    artworkUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    source: 'radio',
    description: 'Hypnotic melodic progressive house and driving deep electronic rhythms.',
  },
];

// Audius Discovery Endpoints for free, open, ad-free music search
const AUDIUS_DISCOVERY_NODES = [
  'https://discoveryprovider.audius.co',
  'https://discoveryprovider2.audius.co',
  'https://discoveryprovider3.audius.co',
  'https://audius-discovery-1.cultur3stake.com',
  'https://audius-dp.singapore.creatorseed.com',
];

export async function searchFreeMusic(query: string): Promise<MusicTrack[]> {
  if (!query || !query.trim()) {
    return CURATED_TRACKS;
  }

  const cleanQuery = query.trim();

  // 1. Try our Global Python Scraper API endpoint first (scrapes YouTube, iTunes, Audius, Web)
  try {
    const res = await fetch(`/api/music/search?q=${encodeURIComponent(cleanQuery)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.tracks) && data.tracks.length > 0) {
        return data.tracks;
      }
    }
  } catch (err) {
    console.warn('Backend Python music scraper API unreachable, attempting direct fallback:', err);
  }

  // 2. Direct Fallback: Check local curated library
  const cleanLower = cleanQuery.toLowerCase();
  const localMatches = CURATED_TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(cleanLower) ||
      t.artist.toLowerCase().includes(cleanLower) ||
      (t.genre && t.genre.toLowerCase().includes(cleanLower))
  );

  const matchingStations = CURATED_STATIONS.filter(
    (s) =>
      s.name.toLowerCase().includes(cleanLower) ||
      s.genre.toLowerCase().includes(cleanLower) ||
      s.description.toLowerCase().includes(cleanLower)
  ).map((s) => ({
    id: s.id,
    title: s.name,
    artist: `${s.genre} (Live Stream)`,
    duration: 0,
    genre: s.genre,
    streamUrl: s.streamUrl,
    artworkUrl: s.coverArt,
    source: 'radio' as const,
    description: s.description,
  }));

  try {
    // 3. Fallback: Direct Audius search
    const node = AUDIUS_DISCOVERY_NODES[Math.floor(Math.random() * AUDIUS_DISCOVERY_NODES.length)];
    const url = `${node}/v1/tracks/search?query=${encodeURIComponent(cleanQuery)}&app_name=KYRSTEN_AI_VOICE_CORE`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.data) && data.data.length > 0) {
        const audiusTracks: MusicTrack[] = data.data.slice(0, 15).map((item: any) => {
          const streamUrl = `${node}/v1/tracks/${item.id}/stream?app_name=KYRSTEN_AI_VOICE_CORE`;
          let artworkUrl = item.artwork?.['480x480'] || item.artwork?.['150x150'] || '';
          if (!artworkUrl) {
            artworkUrl = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80';
          }
          return {
            id: `audius-${item.id}`,
            title: item.title || 'Untitled Track',
            artist: item.user?.name || item.user?.handle || 'Unknown Artist',
            duration: item.duration || 180,
            genre: item.genre || 'Electronic / Free Music',
            streamUrl,
            artworkUrl,
            source: 'audius' as const,
            description: item.description || `Streamed via Audius Open Music Network • ${item.genre || 'Global Music'}`,
          };
        });

        const combined = [...localMatches, ...matchingStations, ...audiusTracks];
        const seen = new Set<string>();
        return combined.filter((item) => {
          const key = `${item.title}-${item.artist}`.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    }
  } catch (err) {
    console.warn('Audius direct fallback error:', err);
  }

  if (localMatches.length > 0 || matchingStations.length > 0) {
    return [...matchingStations, ...localMatches];
  }

  return CURATED_TRACKS;
}
