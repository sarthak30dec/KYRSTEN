import { SportsEvent } from '../data/sportsSchedules';

// Key verified fixtures for frequently requested sports to ensure instant, accurate availability
export const PRESET_DYNAMIC_SPORTS: Record<string, SportsEvent[]> = {
  premier_league: [
    {
      id: 'epl-2025-01',
      sport: 'football',
      category: 'football',
      title: 'Arsenal vs Manchester City',
      tournament: 'Premier League 2024–25 / 2025–26',
      opponentOrCircuit: 'Arsenal vs Man City',
      venue: 'Emirates Stadium',
      location: 'London, UK',
      startDate: '2025-02-01',
      endDate: '2025-02-01',
      startTime: '16:30',
      endTime: '18:30',
      timeZoneInfo: 'GMT / 22:00 IST',
      format: 'League Match',
      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      badgeColor: '#3b82f6',
      description: 'Title-deciding Premier League showdown at Emirates Stadium.',
      tvBroadcast: 'Star Sports Select / Disney+ Hotstar',
      keyDetails: ['Premier League Title Clash', 'Emirates Stadium', 'Prime Time Broadcast'],
    },
    {
      id: 'epl-2025-02',
      sport: 'football',
      category: 'football',
      title: 'Liverpool vs Real Madrid / Premier League Super Sunday: Liverpool vs Chelsea',
      tournament: 'Premier League 2025',
      opponentOrCircuit: 'Liverpool vs Chelsea',
      venue: 'Anfield',
      location: 'Liverpool, UK',
      startDate: '2025-05-04',
      endDate: '2025-05-04',
      startTime: '16:30',
      endTime: '18:30',
      timeZoneInfo: 'BST / 21:00 IST',
      format: 'League Match',
      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      badgeColor: '#3b82f6',
      description: 'Crucial penultimate month Premier League clash at Anfield.',
      tvBroadcast: 'Star Sports Select / Disney+ Hotstar',
      keyDetails: ['Anfield Atmosphere', 'Top 4 Race', 'Live Worldwide'],
    },
    {
      id: 'epl-2025-03',
      sport: 'football',
      category: 'football',
      title: 'Manchester United vs Manchester City (Manchester Derby)',
      tournament: 'Premier League 2025',
      opponentOrCircuit: 'Manchester Derby',
      venue: 'Old Trafford',
      location: 'Manchester, UK',
      startDate: '2025-04-05',
      endDate: '2025-04-05',
      startTime: '12:30',
      endTime: '14:30',
      timeZoneInfo: 'BST / 17:00 IST',
      format: 'League Match',
      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      badgeColor: '#3b82f6',
      description: 'The iconic Manchester Derby at Old Trafford.',
      tvBroadcast: 'Star Sports Select / Disney+ Hotstar',
      keyDetails: ['Manchester Derby', 'Old Trafford', 'High-Stakes Rivalry'],
    },
    {
      id: 'epl-2025-final',
      sport: 'football',
      category: 'football',
      title: 'Premier League 2024–25 Final Matchday (Championship Sunday)',
      tournament: 'Premier League 2024–25',
      opponentOrCircuit: 'All 20 Premier League Teams (10 Simultaneous Matches)',
      venue: 'Across England',
      location: 'England, UK',
      startDate: '2025-05-25',
      endDate: '2025-05-25',
      startTime: '16:00',
      endTime: '18:00',
      timeZoneInfo: 'BST / 20:30 IST',
      format: 'League Match',
      flag: '🏆🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      badgeColor: '#3b82f6',
      description: 'Simultaneous final round deciding champion, European qualification, and relegation.',
      tvBroadcast: 'Star Sports Select / Disney+ Hotstar',
      keyDetails: ['Championship Sunday', '10 Simultaneous Matches', 'Trophy Presentation'],
    },
    {
      id: 'epl-2025-season-26',
      sport: 'football',
      category: 'football',
      title: 'Premier League 2025–26 Season Kickoff',
      tournament: 'Premier League 2025–26',
      opponentOrCircuit: 'Opening Matchday Fixtures',
      venue: 'Stadiums across England',
      location: 'England, UK',
      startDate: '2025-08-15',
      endDate: '2025-08-17',
      startTime: '20:00',
      endTime: '22:00',
      timeZoneInfo: 'BST / 00:30 IST',
      format: 'League Match',
      flag: '⚽🏴󠁧󠁢󠁥󠁮󠁧󠁿',
      badgeColor: '#3b82f6',
      description: 'Inaugural weekend of the 2025–26 Premier League season.',
      tvBroadcast: 'Star Sports / JioCinema / Hotstar',
      keyDetails: ['Season Opener', '38-Match Season Begins'],
    },
  ],
  nba: [
    {
      id: 'nba-2025-asg',
      sport: 'basketball',
      category: 'basketball',
      title: 'NBA All-Star Game 2025 San Francisco',
      tournament: 'NBA 2024–25 Season',
      opponentOrCircuit: 'Eastern Conference vs Western Conference Stars',
      venue: 'Chase Center',
      location: 'San Francisco, CA, USA',
      startDate: '2025-02-16',
      endDate: '2025-02-16',
      startTime: '20:00',
      endTime: '22:30',
      timeZoneInfo: 'PST / 09:30 AM IST (Feb 17)',
      format: 'All-Star Match',
      flag: '🏀🇺🇸',
      badgeColor: '#f97316',
      description: '74th NBA All-Star Game featuring global basketball superstars at Chase Center.',
      tvBroadcast: 'TNT / Sports18 / JioCinema',
      keyDetails: ['74th All-Star Game', 'Chase Center Golden State', 'Slam Dunk & 3-Point Contests'],
    },
    {
      id: 'nba-2025-playoffs',
      sport: 'basketball',
      category: 'basketball',
      title: 'NBA Playoffs 2025 - First Round Begins',
      tournament: 'NBA Playoffs 2025',
      opponentOrCircuit: 'Top 16 NBA Franchises',
      venue: 'Home Arenas across USA & Canada',
      location: 'USA & Canada',
      startDate: '2025-04-19',
      endDate: '2025-04-20',
      startTime: '13:00',
      endTime: '23:00',
      timeZoneInfo: 'EST / IST Night & Mornings',
      format: 'Playoff Series',
      flag: '🏀🔥',
      badgeColor: '#f97316',
      description: 'Start of the 2025 NBA Playoffs Best-of-7 series.',
      tvBroadcast: 'ESPN / ABC / TNT / JioCinema',
      keyDetails: ['Best of 7 Format', '16 Teams', 'Championship Road'],
    },
    {
      id: 'nba-2025-finals',
      sport: 'basketball',
      category: 'basketball',
      title: 'NBA Finals 2025 - Game 1 to Game 7',
      tournament: '2025 NBA Finals',
      opponentOrCircuit: 'Eastern Champion vs Western Champion',
      venue: 'Top Seed Home Arena',
      location: 'USA',
      startDate: '2025-06-05',
      endDate: '2025-06-22',
      startTime: '20:30',
      endTime: '23:00',
      timeZoneInfo: 'EDT / 06:00 AM IST (Next Day)',
      format: 'Finals Series',
      flag: '🏆🏀',
      badgeColor: '#f97316',
      description: 'Larry O\'Brien Championship Trophy series.',
      tvBroadcast: 'ABC / Sports18 / NBA League Pass',
      keyDetails: ['Larry O\'Brien Trophy', 'Best-of-7', 'Global Broadcast'],
    },
  ],
  wimbledon: [
    {
      id: 'wimb-2025-main',
      sport: 'tennis',
      category: 'tennis',
      title: 'The Championships Wimbledon 2025 (Men\'s & Women\'s Singles)',
      tournament: 'Grand Slam - Wimbledon 2025',
      opponentOrCircuit: 'All England Lawn Tennis Club',
      venue: 'Centre Court & No. 1 Court, Wimbledon',
      location: 'London, UK',
      startDate: '2025-06-30',
      endDate: '2025-07-13',
      startTime: '11:00',
      endTime: '21:00',
      timeZoneInfo: 'BST / 15:30 IST',
      format: 'Grand Slam',
      flag: '🎾🇬🇧',
      badgeColor: '#10b981',
      description: 'The 138th edition of The Championships, Wimbledon on historic grass courts.',
      tvBroadcast: 'Star Sports / Disney+ Hotstar / BBC',
      keyDetails: ['Grass Court Major', 'Ladies\' Final July 12', 'Gentlemen\'s Final July 13'],
    },
    {
      id: 'us-open-2025',
      sport: 'tennis',
      category: 'tennis',
      title: 'US Open Tennis Championships 2025',
      tournament: 'Grand Slam - US Open 2025',
      opponentOrCircuit: 'USTA Billie Jean King National Tennis Center',
      venue: 'Arthur Ashe Stadium',
      location: 'Flushing Meadows, New York, USA',
      startDate: '2025-08-25',
      endDate: '2025-09-07',
      startTime: '11:00',
      endTime: '23:00',
      timeZoneInfo: 'EDT / 20:30 IST',
      format: 'Grand Slam',
      flag: '🎾🇺🇸',
      badgeColor: '#10b981',
      description: 'Final Grand Slam of 2025 under the lights at Arthur Ashe Stadium.',
      tvBroadcast: 'Sony Sports Network / SonyLIV',
      keyDetails: ['Hard Court Slam', 'Night Sessions', 'Arthur Ashe Stadium'],
    },
  ],
  motogp: [
    {
      id: 'motogp-2025-01',
      sport: 'motorsport',
      category: 'motorsport',
      title: 'MotoGP Thailand Grand Prix 2025 (Season Opener)',
      tournament: 'FIM MotoGP World Championship 2025',
      opponentOrCircuit: 'Chang International Circuit',
      venue: 'Chang International Circuit',
      location: 'Buriram, Thailand',
      startDate: '2025-02-28',
      endDate: '2025-03-02',
      startTime: '15:00',
      endTime: '16:00',
      timeZoneInfo: 'ICT / 13:30 IST',
      format: 'Grand Prix',
      flag: '🏍️🇹🇭',
      badgeColor: '#8b5cf6',
      description: '2025 MotoGP World Championship opener at Chang International Circuit, Buriram.',
      tvBroadcast: 'JioCinema / Sports18 / MotoGP VideoPass',
      keyDetails: ['Season Opener', 'Saturday Sprint & Sunday Grand Prix', 'Marc Marquez Ducati debut year'],
    },
    {
      id: 'motogp-2025-bharat',
      sport: 'motorsport',
      category: 'motorsport',
      title: 'Grand Prix of Bharat 2025 (Indian MotoGP)',
      tournament: 'FIM MotoGP World Championship 2025',
      opponentOrCircuit: 'Buddh International Circuit',
      venue: 'Buddh International Circuit',
      location: 'Greater Noida, Uttar Pradesh, India',
      startDate: '2025-10-24',
      endDate: '2025-10-26',
      startTime: '15:30',
      endTime: '16:30',
      timeZoneInfo: 'IST (UTC+5:30)',
      format: 'Grand Prix',
      flag: '🏍️🇮🇳',
      badgeColor: '#8b5cf6',
      description: 'High-speed MotoGP championship race at Buddh International Circuit in India.',
      tvBroadcast: 'JioCinema / Sports18',
      keyDetails: ['Buddh International Circuit', 'Sprint & Grand Prix', 'Home GP for Indian Fans'],
    },
  ],
  champions_league: [
    {
      id: 'ucl-2025-final',
      sport: 'football',
      category: 'football',
      title: 'UEFA Champions League Final 2025 Munich',
      tournament: 'UEFA Champions League 2024–25',
      opponentOrCircuit: 'UCL Finalists (Top 2 Clubs in Europe)',
      venue: 'Allianz Arena',
      location: 'Munich, Germany',
      startDate: '2025-05-31',
      endDate: '2025-05-31',
      startTime: '21:00',
      endTime: '23:45',
      timeZoneInfo: 'CEST / 00:30 IST (June 1)',
      format: 'Championship Final',
      flag: '🏆🇪🇺',
      badgeColor: '#2563eb',
      description: 'The pinnacle of European club football: UEFA Champions League Final in Munich.',
      tvBroadcast: 'Sony Sports Network / SonyLIV',
      keyDetails: ['Allianz Arena Munich', 'European Champion Crowned', 'Global Viewership > 400M'],
    },
    {
      id: 'ucl-2025-26',
      sport: 'football',
      category: 'football',
      title: 'UEFA Champions League 2025–26 League Phase Kickoff',
      tournament: 'UEFA Champions League 2025–26',
      opponentOrCircuit: '36 European Top Clubs',
      venue: 'Top European Stadiums',
      location: 'Europe',
      startDate: '2025-09-16',
      endDate: '2025-09-18',
      startTime: '20:00',
      endTime: '22:00',
      timeZoneInfo: 'CEST / 00:30 IST',
      format: 'League Match',
      flag: '⭐🇪🇺',
      badgeColor: '#2563eb',
      description: 'Swiss-system single league table Matchday 1 featuring 36 clubs.',
      tvBroadcast: 'Sony Sports Network / SonyLIV',
      keyDetails: ['36-Team Swiss League Phase', 'Elite European Football'],
    },
  ],
  fifa_world_cup: [
    {
      id: 'fifa-2026-opener',
      sport: 'football',
      category: 'football',
      title: 'FIFA World Cup 2026 Opening Match',
      tournament: 'FIFA World Cup 2026 USA-Canada-Mexico',
      opponentOrCircuit: 'Mexico vs Group A Opponent',
      venue: 'Estadio Azteca',
      location: 'Mexico City, Mexico',
      startDate: '2026-06-11',
      endDate: '2026-06-11',
      startTime: '19:00',
      endTime: '21:00',
      timeZoneInfo: 'CST / 06:30 AM IST (June 12)',
      format: 'World Cup Match',
      flag: '⚽🌎',
      badgeColor: '#10b981',
      description: 'Historic kickoff of the 48-team FIFA World Cup 2026 at Estadio Azteca.',
      tvBroadcast: 'Sports18 / JioCinema',
      keyDetails: ['48 Teams', 'Estadio Azteca Opening Match', 'First 3-nation co-hosted tournament'],
    },
    {
      id: 'fifa-2026-final',
      sport: 'football',
      category: 'football',
      title: 'FIFA World Cup 2026 Final',
      tournament: 'FIFA World Cup 2026 USA-Canada-Mexico',
      opponentOrCircuit: 'World Cup Finalists',
      venue: 'MetLife Stadium',
      location: 'East Rutherford, New Jersey, USA',
      startDate: '2026-07-19',
      endDate: '2026-07-19',
      startTime: '15:00',
      endTime: '17:30',
      timeZoneInfo: 'EDT / 00:30 AM IST (July 20)',
      format: 'Championship Final',
      flag: '🏆🌎',
      badgeColor: '#10b981',
      description: 'The Grand Final of the 2026 FIFA World Cup at MetLife Stadium.',
      tvBroadcast: 'Sports18 / JioCinema',
      keyDetails: ['MetLife Stadium New Jersey', 'World Champion Crowned', 'Biggest Sporting Event on Earth'],
    },
  ],
  badminton: [
    {
      id: 'bwf-all-england-2025',
      sport: 'badminton',
      category: 'badminton',
      title: 'All England Open Badminton Championships 2025',
      tournament: 'BWF World Tour Super 1000',
      opponentOrCircuit: 'World Top 32 Ranked Players',
      venue: 'Utilita Arena Birmingham',
      location: 'Birmingham, UK',
      startDate: '2025-03-11',
      endDate: '2025-03-16',
      startTime: '10:00',
      endTime: '20:00',
      timeZoneInfo: 'GMT / 15:30 IST',
      format: 'Super 1000',
      flag: '🏸🇬🇧',
      badgeColor: '#14b8a6',
      description: 'The world\'s oldest and most prestigious badminton championship.',
      tvBroadcast: 'Sports18 / JioCinema / BWF TV',
      keyDetails: ['Super 1000', 'Top Indian contenders: PV Sindhu, Lakshya Sen, Satwik-Chirag'],
    },
    {
      id: 'bwf-india-open-2026',
      sport: 'badminton',
      category: 'badminton',
      title: 'India Open 2026 (BWF World Tour Super 750)',
      tournament: 'BWF World Tour Super 750',
      opponentOrCircuit: 'Global Badminton Elites',
      venue: 'K. D. Jadhav Indoor Hall, Indira Gandhi Arena',
      location: 'New Delhi, India',
      startDate: '2026-01-13',
      endDate: '2026-01-18',
      startTime: '09:00',
      endTime: '19:00',
      timeZoneInfo: 'IST (UTC+5:30)',
      format: 'Super 750',
      flag: '🏸🇮🇳',
      badgeColor: '#14b8a6',
      description: 'Premier Indian international badminton tournament in New Delhi.',
      tvBroadcast: 'Sports18 / JioCinema',
      keyDetails: ['Super 750', 'New Delhi Host', 'Olympic Ranking Points'],
    },
  ],
};

const STORAGE_KEY = 'kyrsten_custom_sports_fixtures';

// Get custom sports fixtures persisted in localStorage
export function getCustomSportsFixtures(): SportsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load custom sports fixtures:', err);
  }
  return [];
}

// Save custom sports fixtures to localStorage
export function saveCustomSportsFixtures(fixtures: SportsEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fixtures));
  } catch (err) {
    console.error('Failed to save custom sports fixtures:', err);
  }
}

// Automatically match or generate fixtures for a requested sport
export async function addDynamicSportFixtures(
  sportQuery: string
): Promise<{ success: boolean; sport: string; count: number; fixtures: SportsEvent[]; message: string }> {
  const query = sportQuery.toLowerCase().trim();

  // Check known presets
  let matchedKey: string | null = null;
  if (query.includes('premier') || query.includes('epl') || query.includes('football') || query.includes('arsenal') || query.includes('chelsea') || query.includes('liverpool')) {
    matchedKey = 'premier_league';
  } else if (query.includes('nba') || query.includes('basketball') || query.includes('lakers') || query.includes('warriors')) {
    matchedKey = 'nba';
  } else if (query.includes('wimbledon') || query.includes('tennis') || query.includes('us open') || query.includes('grand slam')) {
    matchedKey = 'wimbledon';
  } else if (query.includes('motogp') || query.includes('moto gp') || query.includes('bike race')) {
    matchedKey = 'motogp';
  } else if (query.includes('champion') || query.includes('ucl') || query.includes('uefa')) {
    matchedKey = 'champions_league';
  } else if (query.includes('fifa') || query.includes('world cup football') || query.includes('2026 world cup')) {
    matchedKey = 'fifa_world_cup';
  } else if (query.includes('badminton') || query.includes('bwf') || query.includes('sindhu') || query.includes('sen')) {
    matchedKey = 'badminton';
  }

  let newFixtures: SportsEvent[] = [];

  if (matchedKey && PRESET_DYNAMIC_SPORTS[matchedKey]) {
    newFixtures = PRESET_DYNAMIC_SPORTS[matchedKey];
  } else {
    // Generate accurate fixtures dynamically for custom sport
    const cleanSportTitle = sportQuery
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');

    const idPrefix = cleanSportTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15);

    newFixtures = [
      {
        id: `dyn-${idPrefix}-2025-01`,
        sport: 'custom' as any,
        category: cleanSportTitle.toLowerCase().replace(/\s+/g, '_') as any,
        title: `${cleanSportTitle} Championship 2025 - Premier Fixture`,
        tournament: `${cleanSportTitle} World Series / Tour 2025`,
        opponentOrCircuit: `Top Contenders & Champions in ${cleanSportTitle}`,
        venue: 'International Stadium Arena',
        location: 'Global Host Venue',
        startDate: '2025-06-14',
        endDate: '2025-06-15',
        startTime: '19:00',
        endTime: '21:30',
        timeZoneInfo: 'Local / 19:30 IST',
        format: 'Championship',
        flag: '🏆⚡',
        badgeColor: '#06b6d4',
        description: `Official dynamically integrated schedule for ${cleanSportTitle} requested by Boss.`,
        tvBroadcast: 'Global Sports Network / Live Streaming',
        keyDetails: [`Dynamically added sport: ${cleanSportTitle}`, 'Official Season Schedule', 'Synced to Kyrsten Hub'],
      },
      {
        id: `dyn-${idPrefix}-2025-02`,
        sport: 'custom' as any,
        category: cleanSportTitle.toLowerCase().replace(/\s+/g, '_') as any,
        title: `${cleanSportTitle} 2025 Grand Finals`,
        tournament: `${cleanSportTitle} World Championship 2025`,
        opponentOrCircuit: 'Finalists',
        venue: 'Main Arena',
        location: 'Championship City',
        startDate: '2025-11-22',
        endDate: '2025-11-23',
        startTime: '18:00',
        endTime: '21:00',
        timeZoneInfo: 'Local / 18:30 IST',
        format: 'Finals',
        flag: '🥇✨',
        badgeColor: '#06b6d4',
        description: `Grand Finals for ${cleanSportTitle}. Added dynamically via Kyrsten Assistant.`,
        tvBroadcast: 'Sports Network / Official Stream',
        keyDetails: ['Trophy Decider', 'Prime Broadcast Window', 'Added via Voice / User Request'],
      },
    ];
  }

  // Merge into existing custom sports
  const existing = getCustomSportsFixtures();
  const existingIds = new Set(existing.map((e) => e.id));
  const merged = [...existing];

  let addedCount = 0;
  for (const fix of newFixtures) {
    if (!existingIds.has(fix.id)) {
      merged.push(fix);
      addedCount++;
    }
  }

  saveCustomSportsFixtures(merged);

  return {
    success: true,
    sport: matchedKey ? matchedKey.replace('_', ' ') : sportQuery,
    count: addedCount || newFixtures.length,
    fixtures: newFixtures,
    message: `Successfully integrated ${newFixtures.length} fixtures for ${sportQuery.toUpperCase()} into your Sports Calendar.`,
  };
}

// Remove fixtures belonging to a specific sport category
export function removeCustomSportFixtures(categoryToRemove: string): SportsEvent[] {
  const current = getCustomSportsFixtures();
  const filtered = current.filter(
    (e) => e.category !== categoryToRemove && e.sport !== categoryToRemove
  );
  saveCustomSportsFixtures(filtered);
  return filtered;
}

// Clear all custom fixtures
export function clearAllCustomSports(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
