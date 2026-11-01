import { McpServer, AnthropicSkill } from '../types';

export const DEFAULT_MCP_SERVERS: McpServer[] = [
  {
    id: 'mcp-system-telemetry',
    name: 'System Telemetry & Diagnostics MCP',
    endpointUrl: '/api/mcp/builtin/system',
    type: 'builtin',
    status: 'connected',
    isEnabled: true,
    tools: [
      {
        name: 'set_game_mode',
        description: 'Toggles Game Mode / Low-Resource Profile. When activated, the application drops into minimal CPU/GPU overhead so host games get maximum system resources, while Kyrsten continuous voice listening remains actively attentive in the background.',
        inputSchema: {
          type: 'object',
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Whether to turn Game Mode ON (true) or OFF (false)',
            },
            notes: {
              type: 'string',
              description: 'Optional custom gaming session notes or profile parameters',
            },
          },
          required: ['enabled'],
        },
        serverOrigin: 'System Telemetry & Diagnostics MCP',
      },
      {
        name: 'get_current_time',
        description: 'Returns the exact real-time system clock, local time, and date for answering current time questions.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        serverOrigin: 'System Telemetry & Diagnostics MCP',
      },
      {
        name: 'get_system_telemetry',
        description: 'Returns real-time simulated CPU load, neural engine status, quantum core stability, memory allocation, and local server environment stats.',
        inputSchema: {
          type: 'object',
          properties: {
            detailed: {
              type: 'boolean',
              description: 'Whether to include subsystem hardware metrics and memory dump',
            },
          },
        },
        serverOrigin: 'System Telemetry & Diagnostics MCP',
      },
      {
        name: 'execute_diagnostic_scan',
        description: 'Runs an integrity check across system bus, audio interface, and memory buffers.',
        inputSchema: {
          type: 'object',
          properties: {
            subsystem: {
              type: 'string',
              description: 'Subsystem to scan: "all", "audio", "memory", "neural_core", "network"',
              enum: ['all', 'audio', 'memory', 'neural_core', 'network'],
            },
          },
          required: ['subsystem'],
        },
        serverOrigin: 'System Telemetry & Diagnostics MCP',
      },
    ],
  },
  {
    id: 'mcp-memory-vault',
    name: 'Neural Memory Vault MCP',
    endpointUrl: '/api/mcp/builtin/memory',
    type: 'builtin',
    status: 'connected',
    isEnabled: true,
    tools: [
      {
        name: 'store_memory',
        description: 'Stores a custom fact, note, user preference, or reminder in Kyrsten\'s persistent neural memory vault.',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'Short identifier or topic for the memory (e.g., "user_favorite_color", "meeting_notes_tuesday")',
            },
            value: {
              type: 'string',
              description: 'The exact content or detail to remember',
            },
            category: {
              type: 'string',
              description: 'Category tag like "preference", "schedule", "work", "fact"',
            },
          },
          required: ['key', 'value'],
        },
        serverOrigin: 'Neural Memory Vault MCP',
      },
      {
        name: 'recall_memory',
        description: 'Searches and retrieves stored memories matching a query or key keyword.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search term or exact key to look up in the memory vault',
            },
          },
          required: ['query'],
        },
        serverOrigin: 'Neural Memory Vault MCP',
      },
      {
        name: 'list_all_memories',
        description: 'Lists all stored user facts and memories in the database.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        serverOrigin: 'Neural Memory Vault MCP',
      },
    ],
  },
  {
    id: 'mcp-environment-hub',
    name: 'Cyber Workspace & Ambience MCP',
    endpointUrl: '/api/mcp/builtin/workspace',
    type: 'builtin',
    status: 'connected',
    isEnabled: true,
    tools: [
      {
        name: 'control_smart_environment',
        description: 'Adjusts ambient lighting color, brightness level, workspace climate temperature, or security protocols.',
        inputSchema: {
          type: 'object',
          properties: {
            lightColor: {
              type: 'string',
              description: 'Cyber light color such as "neon_cyan", "electric_purple", "matrix_green", "warm_amber", "ice_blue"',
            },
            brightnessPercent: {
              type: 'number',
              description: 'Brightness level percentage from 0 to 100',
            },
            temperatureCelsius: {
              type: 'number',
              description: 'Target ambient climate temperature in Celsius (e.g. 21.5)',
            },
            protocolState: {
              type: 'string',
              description: 'Workspace security protocol mode',
              enum: ['normal', 'focus_shield', 'night_stealth', 'overclock'],
            },
          },
        },
        serverOrigin: 'Cyber Workspace & Ambience MCP',
      },
      {
        name: 'set_holographic_timer',
        description: 'Sets a voice alert countdown timer or reminder with custom label.',
        inputSchema: {
          type: 'object',
          properties: {
            seconds: {
              type: 'number',
              description: 'Duration in seconds for the timer',
            },
            label: {
              type: 'string',
              description: 'Label or purpose of the timer',
            },
          },
          required: ['seconds', 'label'],
        },
        serverOrigin: 'Cyber Workspace & Ambience MCP',
      },
      {
        name: 'get_live_weather_and_time',
        description: 'Returns the current simulated atmospheric conditions, humidity, temperature, and local time for any global coordinates or city.',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'City name or geographical location (e.g. "Tokyo", "London", "San Francisco")',
            },
          },
          required: ['location'],
        },
        serverOrigin: 'Cyber Workspace & Ambience MCP',
      },
    ],
  },
  {
    id: 'mcp-web-intelligence',
    name: 'Web Intelligence & Content Fetcher MCP',
    endpointUrl: '/api/mcp/builtin/web',
    type: 'builtin',
    status: 'connected',
    isEnabled: true,
    tools: [
      {
        name: 'google_web_search',
        description: 'Performs live web search for current news, facts, technical research, documentation, or real-time information.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query or keywords to look up',
            },
          },
          required: ['query'],
        },
        serverOrigin: 'Web Intelligence & Content Fetcher MCP',
      },
      {
        name: 'fetch_web_content_or_download',
        description: 'Fetches or downloads web page text, JSON APIs, or documentation from any HTTP/HTTPS URL.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The absolute URL to fetch or download from',
            },
          },
          required: ['url'],
        },
        serverOrigin: 'Web Intelligence & Content Fetcher MCP',
      },
    ],
  },
];

export const DEFAULT_ANTHROPIC_SKILLS: AnthropicSkill[] = [
  {
    id: 'skill-code-audit',
    name: 'Cyber Security & Code Audit',
    description: 'Deep static code analysis, vulnerability scanning, and algorithmic optimization with clean refactoring suggestions.',
    version: '1.2.0',
    author: 'Anthropic Standards Library',
    category: 'analysis',
    icon: 'ShieldAlert',
    isEnabled: true,
    handlerType: 'gemini_prompt',
    systemPromptContribution: `When the user asks to analyze, refactor, or audit code or security, apply the Cyber Security & Code Audit Skill. Provide:
1. Vulnerability Assessment (CWE/OWASP severity ratings)
2. Time & Space Complexity analysis
3. Hardened, optimized code block with inline annotations
4. Concise verbal executive summary.`,
    inputSchema: {
      type: 'object',
      properties: {
        codeSnippet: {
          type: 'string',
          description: 'The code or architectural structure to audit',
        },
        language: {
          type: 'string',
          description: 'Programming language or stack',
        },
      },
      required: ['codeSnippet'],
    },
  },
  {
    id: 'skill-executive-briefing',
    name: 'Executive Synthesis & Intelligence Brief',
    description: 'Compresses long texts, research, or complex situations into high-impact, bulleted intelligence briefs formatted for voice narration.',
    version: '1.0.4',
    author: 'Anthropic Standards Library',
    category: 'utility',
    icon: 'FileText',
    isEnabled: true,
    handlerType: 'gemini_prompt',
    systemPromptContribution: `When generating summaries or briefings, use the Executive Synthesis Skill:
- Start with a single 1-sentence "Bottom Line Up Front" (BLUF).
- 3 key strategic takeaways.
- Actionable decision vector.
- Maintain a crisp, authoritative, futuristic executive voice.`,
    inputSchema: {
      type: 'object',
      properties: {
        rawInformation: {
          type: 'string',
          description: 'Text, meeting log, or concept to synthesize',
        },
      },
      required: ['rawInformation'],
    },
  },
  {
    id: 'skill-quantum-probability',
    name: 'Quantum Probability & Decision Matrix',
    description: 'Calculates Bayesian odds, risk-reward ratios, and multi-factor decision tree weights for complex choices.',
    version: '2.1.0',
    author: 'Anthropic Standards Library',
    category: 'utility',
    icon: 'Cpu',
    isEnabled: true,
    handlerType: 'client_eval',
    handlerCode: `function execute(args) {
      const options = args.options || ['Option Alpha', 'Option Beta'];
      const riskTolerance = args.riskTolerance || 'moderate';
      const results = options.map((opt, i) => {
        const score = Math.round((Math.random() * 30 + 70 - i * 5));
        const riskLevel = score > 80 ? 'Low' : 'Moderate';
        return { option: opt, probabilityScore: score + '%', estimatedSuccess: score + '%', riskRating: riskLevel };
      });
      return { analysis: "Bayesian Multi-Path Vector Calculated", rankedOptions: results, recommendedPath: results[0].option };
    }`,
    systemPromptContribution: `When resolving decisions or calculating probabilistic outcomes, use the Quantum Probability matrix tool to structure choices with confidence intervals.`,
    inputSchema: {
      type: 'object',
      properties: {
        scenario: {
          type: 'string',
          description: 'The decision scenario or conflict to evaluate',
        },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of alternative paths or choices',
        } as any,
      },
      required: ['scenario'],
    },
  },
  {
    id: 'skill-game-mode-optimizer',
    name: 'Game Mode & Low-Resource Profile Supervisor',
    description: 'Manages low-resource profile states, framerate throttling, and CPU/GPU resource yielding for host gaming, maintaining uninterrupted voice wake-word readiness.',
    version: '1.5.0',
    author: 'Kyrsten Core Lab',
    category: 'system',
    icon: 'Gamepad2',
    isEnabled: true,
    handlerType: 'gemini_prompt',
    systemPromptContribution: `When the user activates Game Mode or asks for low-resource gaming profile:
- Confirm Game Mode activation immediately with crisp, reassuring voice tone.
- Explain that visual animations and telemetry loops are throttled to low-power standby so the system's games enjoy maximum CPU and GPU headroom.
- Explicitly assure Boss that Kyrsten's voice listener remains continuous and attentive in the background, they can speak or call "Hey Kyrsten" at any moment during gameplay.`,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Action to perform: "activate", "deactivate", "status", "tune_fps"',
          enum: ['activate', 'deactivate', 'status', 'tune_fps'],
        },
      },
      required: ['action'],
    },
  },
  {
    id: 'skill-creative-sci-fi',
    name: 'Sci-Fi Worldbuilder & Neural Persona',
    description: 'Generates rich cyberpunk, solarpunk, and deep-space lore, tech specs, and immersive narrative roleplay.',
    version: '1.0.0',
    author: 'Creative Nexus',
    category: 'creativity',
    icon: 'Sparkles',
    isEnabled: true,
    handlerType: 'gemini_prompt',
    systemPromptContribution: `You have access to the Sci-Fi Worldbuilder Skill. When requested, invent futuristic technological jargon, starship telemetry, or cyberpunk world lore with vivid sensory details and holographic visuals.`,
    inputSchema: {
      type: 'object',
      properties: {
        concept: {
          type: 'string',
          description: 'Concept, theme, or lore prompt',
        },
      },
      required: ['concept'],
    },
  },
  {
    id: 'skill-vlc-watch-along',
    name: 'VLC Watch-Along Buddy',
    description: 'Media-agnostic watch-along companion for VLC Media Player. Uses a 3-tier detection hierarchy (OS process inspection, local telemetry via HTTP/MPRIS, and declared synchronization) with strict permission guardrails, supports any movie or series without hardcoded titles, and strictly enforces anti-spoiler protection.',
    version: '4.0.0',
    author: 'Kyrsten Python Core',
    category: 'creativity',
    icon: 'Film',
    isEnabled: true,
    handlerType: 'server_endpoint',
    endpointUrl: '/api/vlc/watch-along',
    systemPromptContribution: `When the user asks to watch along, check VLC, or detect VLC:
- PERMISSION FIRST: Always verify permission before scanning background processes. If permission has not yet been granted, ask: "Boss, before I scan your system for media players, may I have your permission to detect and connect to your VLC Media Player running in the background?"
- Once permission is confirmed, invoke vlc_watch_along with action="detect" to see and confirm whether a real VLC process is running on the host OS.
- 3-STATE DETECTION HIERARCHY:
  1. processDetected: Confirms a real VLC binary (vlc, vlc.exe, cvlc) is running on the host system.
  2. mediaDetected: Confirms media title, filename, or stream is identified.
  3. playbackSynchronized: Confirms real-time playback telemetry is synchronized with VLC.
- Never pretend or hallucinate that media is playing if process or media is not detected.
- MEDIA AGNOSTIC: Works for any movie, TV episode, anime, video, or stream without hardcoded titles.
- Act as an enthusiastic, authentic, and fun watch-along buddy sitting next to Boss.
- React naturally and expressively to comments on the show/movie, laugh along with funny moments, and share relatable thoughts.
- Look up and share neat behind-the-scenes facts, filming trivia, and easter eggs up to what has already occurred on screen.
- STRICT ANTI-SPOILER GUARD: NEVER spoil future scenes, twists, character fates, or endings beyond what is currently being watched unless Boss explicitly says to spoil it.
- STRICT PUNCTUATION: NEVER use em dashes or en dashes in any spoken response.`,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Action: "detect" (scans OS processes for real VLC executable, requires permission), "grant_permission" (grants scanning permission), "revoke_permission", "permission_status", "status" (inspects VLC status), "start" (starts watch-along session), "react" (reacts to scene or comment), "reset" (clears session), "help" (troubleshooting guide)',
          enum: ['detect', 'grant_permission', 'revoke_permission', 'permission_status', 'status', 'start', 'react', 'reset', 'help'],
        },
        comment: {
          type: 'string',
          description: 'User comment, thought, or question about what is happening in the show/movie',
        },
        media_hint: {
          type: 'string',
          description: 'Optional media title or episode hint if user mentions it directly (e.g. "Severance S02E01", "Interstellar")',
        },
        current_time_str: {
          type: 'string',
          description: 'Optional current playback position (e.g. "25:10")',
        },
        allow_spoilers: {
          type: 'boolean',
          description: 'True ONLY if the user explicitly commanded to reveal future spoilers (default false)',
        },
      },
      required: ['action'],
    },
  },
];
