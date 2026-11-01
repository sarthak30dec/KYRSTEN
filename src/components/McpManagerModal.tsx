import React, { useState } from 'react';
import { McpServer, McpToolDefinition } from '../types';
import { X, Plus, Terminal, CheckCircle2, AlertCircle, RefreshCw, Trash2, Power, Layers, ExternalLink, Code } from 'lucide-react';

interface McpManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: McpServer[];
  onAddServer: (server: McpServer) => void;
  onToggleServer: (id: string) => void;
  onDeleteServer: (id: string) => void;
  onTestServer: (id: string) => Promise<void>;
}

export const McpManagerModal: React.FC<McpManagerModalProps> = ({
  isOpen,
  onClose,
  servers,
  onAddServer,
  onToggleServer,
  onDeleteServer,
  onTestServer,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form states for adding new server
  const [serverName, setServerName] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [transportType, setTransportType] = useState<'http' | 'sse'>('http');
  const [authHeader, setAuthHeader] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      await onTestServer(id);
    } finally {
      setTestingId(null);
    }
  };

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim() || !endpointUrl.trim()) {
      setFormError('Server Name and Endpoint URL are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const headers: Record<string, string> = {};
    if (authHeader.trim()) {
      headers['Authorization'] = authHeader.trim();
    }

    const newServer: McpServer = {
      id: `mcp-${Date.now()}`,
      name: serverName.trim(),
      endpointUrl: endpointUrl.trim(),
      type: transportType,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      status: 'connected',
      isEnabled: true,
      tools: [
        {
          name: `${serverName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_query`,
          description: `Query endpoint for ${serverName}`,
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Payload or action query for this MCP server',
              },
            },
            required: ['query'],
          },
          serverOrigin: serverName,
        },
      ],
      lastChecked: Date.now(),
    };

    onAddServer(newServer);
    setIsSubmitting(false);
    setServerName('');
    setEndpointUrl('');
    setAuthHeader('');
    setActiveTab('list');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-3xl backdrop-blur-2xl bg-slate-950/85 rounded-3xl border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-hud tracking-widest text-white uppercase">
                Model Context Protocol (MCP) Registry
              </h2>
              <p className="text-xs font-mono text-cyan-400/80">
                Manage live endpoints, JSON-RPC endpoints, and dynamic tool schemas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-white/[0.02] px-6 gap-4 text-xs font-mono">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-3 font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'list'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Configured Endpoints ({servers.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`py-3 font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'add'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add New MCP Server</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'list' ? (
            <div className="space-y-4">
              {servers.map((server) => {
                const isTesting = testingId === server.id;

                return (
                  <div
                    key={server.id}
                    className={`p-4 rounded-xl border transition-all ${
                      server.isEnabled
                        ? 'bg-slate-900/80 border-cyan-500/30 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-100 font-hud text-base">
                            {server.name}
                          </h3>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase border ${
                              server.status === 'connected'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                : server.status === 'error'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {server.status}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                            {server.type}
                          </span>
                        </div>

                        <p className="text-xs font-mono text-cyan-300/80 truncate max-w-lg">
                          {server.endpointUrl}
                        </p>
                      </div>

                      {/* Server Controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleTest(server.id)}
                          disabled={isTesting}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 text-xs font-mono border border-slate-700 transition-colors cursor-pointer"
                          title="Test MCP connection & Discover tools"
                        >
                          <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
                          <span>{isTesting ? 'Testing...' : 'Test RPC'}</span>
                        </button>

                        <button
                          onClick={() => onToggleServer(server.id)}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            server.isEnabled
                              ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
                              : 'bg-slate-800 border-slate-700 text-slate-500'
                          }`}
                          title={server.isEnabled ? 'Disable server' : 'Enable server'}
                        >
                          <Power className="w-3.5 h-3.5" />
                        </button>

                        {server.type !== 'builtin' && (
                          <button
                            onClick={() => onDeleteServer(server.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                            title="Delete server"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Discovered Tools List */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <div className="text-xs font-mono text-slate-400 mb-2 flex items-center justify-between">
                        <span>Exposed Tools ({server.tools.length}):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {server.tools.map((tool, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col space-y-1 font-mono text-xs"
                          >
                            <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
                              <Code className="w-3 h-3 text-cyan-400 shrink-0" />
                              <span className="truncate">{tool.name}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-2">
                              {tool.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <form onSubmit={handleCreateServer} className="space-y-4 font-mono text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">SERVER / MODULE NAME</label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="e.g. GitHub Workspace MCP, Database Query MCP"
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-slate-100 placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">ENDPOINT URL</label>
                <input
                  type="url"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="https://your-mcp-service.domain.com/mcp or http://localhost:3000/api/..."
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-slate-100 placeholder:text-slate-600"
                />
                <span className="text-[11px] text-slate-500">
                  Must support standard Model Context Protocol JSON-RPC `tools/list` and `tools/call`.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">TRANSPORT PROTOCOL</label>
                  <select
                    value={transportType}
                    onChange={(e: any) => setTransportType(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-slate-100 bg-slate-900"
                  >
                    <option value="http">HTTP POST (JSON-RPC 2.0)</option>
                    <option value="sse">Server-Sent Events (SSE)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">AUTHORIZATION HEADER (OPTIONAL)</label>
                  <input
                    type="text"
                    value={authHeader}
                    onChange={(e) => setAuthHeader(e.target.value)}
                    placeholder="Bearer sk_live_..."
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-slate-100 placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-600/30 transition-all cursor-pointer"
                >
                  Register & Connect MCP
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
