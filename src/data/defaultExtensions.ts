import { FeatureExtension } from '../types';

export const DEFAULT_FEATURE_EXTENSIONS: FeatureExtension[] = [
  {
    id: 'ext-workflow-automation',
    name: 'Boss Workflow & Macro Orchestrator',
    description: 'Executes composite multi-tool routines with a single voice trigger (e.g. "Initiate Boss Protocol", "Start Deep Focus Session").',
    version: '1.4.0',
    category: 'automation',
    icon: 'Workflow',
    isEnabled: true,
    author: 'Kyrsten Core Lab',
    systemInstruction: `You have access to the Boss Workflow & Macro Orchestrator. When the user requests a macro or workflow routine, coordinate multiple MCP tools (lighting, diagnostics, briefings, timers) in synchronized harmony.`,
    quickPrompts: [
      {
        label: 'Initiate Boss Focus Protocol',
        prompt: 'Kyrsten, initiate Boss Focus Protocol: set ambience to neon_cyan, scan neural core, and set a 45-minute focus timer.',
        icon: 'Zap',
      },
      {
        label: 'Evening Wrap & Standdown',
        prompt: 'Kyrsten, run evening wrap routine: dim workspace lighting to 30% warm_amber, list memories saved today, and report system stability.',
        icon: 'Moon',
      },
    ],
    tools: [
      {
        name: 'execute_boss_macro',
        description: 'Chains multiple system events and telemetry tasks in a unified macro sequence.',
        inputSchema: {
          type: 'object',
          properties: {
            macroName: {
              type: 'string',
              description: 'Name of the macro: "boss_focus", "stealth_security", "system_recharge", "morning_kickoff"',
              enum: ['boss_focus', 'stealth_security', 'system_recharge', 'morning_kickoff'],
            },
            notes: {
              type: 'string',
              description: 'Optional custom instructions or parameters',
            },
          },
          required: ['macroName'],
        },
        serverOrigin: 'Boss Workflow Orchestrator',
      },
    ],
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'ext-data-matrix',
    name: 'Quantum Data Matrix & CSV Analyzer',
    description: 'Rapidly parses JSON arrays, statistical data points, and numerical distributions with instant voice summaries.',
    version: '1.1.0',
    category: 'productivity',
    icon: 'BarChart3',
    isEnabled: true,
    author: 'Kyrsten Analytics Engine',
    systemInstruction: `When presented with tabular or statistical numbers, extract standard deviations, median trends, anomaly spikes, and actionable vector projections formatted crisply for Boss.`,
    quickPrompts: [
      {
        label: 'Analyze Server Load Anomalies',
        prompt: 'Kyrsten, analyze recent CPU spikes [14%, 28%, 89%, 32%, 18%] and provide standard deviation plus anomaly alert for Boss.',
        icon: 'Activity',
      },
    ],
    tools: [
      {
        name: 'compute_data_statistics',
        description: 'Performs mean, median, variance, and outlier detection on numerical series.',
        inputSchema: {
          type: 'object',
          properties: {
            numbers: {
              type: 'array',
              items: { type: 'number' },
              description: 'List of numerical values to evaluate',
            } as any,
            metricLabel: {
              type: 'string',
              description: 'Label of the metric (e.g. "Response Time ms", "Revenue")',
            },
          },
          required: ['numbers'],
        },
        serverOrigin: 'Quantum Data Matrix',
      },
    ],
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'ext-developer-toolkit',
    name: 'Fullstack Dev & Git Architect',
    description: 'Generates TypeScript types, React hook skeletons, API route templates, and git workflow checklists.',
    version: '2.0.0',
    category: 'developer',
    icon: 'Code',
    isEnabled: true,
    author: 'Kyrsten Engineering',
    systemInstruction: `When asked for code scaffolding or architectural patterns, produce modular TypeScript/React code complying with modern design best practices.`,
    quickPrompts: [
      {
        label: 'Generate MCP Tool Endpoint Skeleton',
        prompt: 'Kyrsten, generate a template for a new custom MCP tool endpoint in Express TypeScript.',
        icon: 'Terminal',
      },
    ],
    createdAt: Date.now() - 86400000 * 2,
  },
];
