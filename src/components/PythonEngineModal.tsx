import React, { useState, useEffect } from 'react';
import { Terminal, Play, Cpu, CheckCircle2, AlertTriangle, RefreshCw, X, Code2, Database, Zap, Layers } from 'lucide-react';
import { PythonEngineStatus, PythonExecutionResult } from '../types';

interface PythonEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PYTHON_SNIPPETS = [
  {
    name: 'Monte Carlo Pi Simulation',
    category: 'Math & Simulation',
    code: `import random, math

def estimate_pi(num_samples=50000):
    inside = 0
    for _ in range(num_samples):
        x, y = random.random(), random.random()
        if x**2 + y**2 <= 1.0:
            inside += 1
    return (4 * inside) / num_samples

pi_est = estimate_pi()
print(f"Samples: 50,000")
print(f"Estimated Pi: {pi_est:.5f}")
print(f"Actual Pi:    {math.pi:.5f}")
print(f"Variance:    {abs(pi_est - math.pi):.5f}")
`,
  },
  {
    name: 'Statistical Analytics',
    category: 'Data Science',
    code: `import statistics

latency_samples = [12.4, 14.1, 11.8, 15.2, 12.0, 13.5, 11.2, 14.9, 12.8, 13.0]
mean_val = statistics.mean(latency_samples)
stdev_val = statistics.stdev(latency_samples)
median_val = statistics.median(latency_samples)

print(f"Sample Count: {len(latency_samples)}")
print(f"Mean Latency: {mean_val:.2f} ms")
print(f"Median:       {median_val:.2f} ms")
print(f"Std Deviation:{stdev_val:.3f} ms")
`,
  },
  {
    name: '64-Dim Vector Embedder',
    category: 'AI & NLP',
    code: `import math

def embed_text(text, dims=64):
    vec = [0.0] * dims
    for i, ch in enumerate(text.lower().strip()):
        code = ord(ch)
        for d in range(dims):
            vec[d] += math.sin((code * (i + 1) * 31 + d * 17) * (d + 1) * 0.173)
    mag = math.sqrt(sum(v*v for v in vec)) or 1.0
    return [round(v / mag, 4) for v in vec]

query_vec = embed_text("Kyrsten Voice Intelligence Core")
print(f"Generated {len(query_vec)}-dimensional unit vector:")
print(f"First 8 dimensions: {query_vec[:8]}")
print(f"Vector L2 Norm:     {round(math.sqrt(sum(v*v for v in query_vec)), 4)}")
`,
  },
  {
    name: 'Recursive Fibonacci Sequence',
    category: 'Algorithms',
    code: `def fib(n):
    a, b = 0, 1
    seq = []
    for _ in range(n):
        seq.append(a)
        a, b = b, a + b
    return seq

print("First 20 Fibonacci Numbers:")
print(fib(20))
`,
  },
];

export const PythonEngineModal: React.FC<PythonEngineModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<PythonEngineStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<'sandbox' | 'diagnostics' | 'vectorizer'>('sandbox');
  
  // Code execution state
  const [code, setCode] = useState<string>(DEFAULT_PYTHON_SNIPPETS[0].code);
  const [isExecuting, setIsExecuting] = useState(false);
  const [execResult, setExecResult] = useState<PythonExecutionResult | null>(null);

  // Vectorizer state
  const [vectorInput, setVectorInput] = useState<string>('Hello Kyrsten, compute this semantic embedding vector');
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [vectorResult, setVectorResult] = useState<any>(null);

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/python/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch Python engine status', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const handleRunCode = async () => {
    if (!code.trim()) return;
    setIsExecuting(true);
    setExecResult(null);
    try {
      const res = await fetch('/api/python/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      setExecResult(data);
    } catch (err: any) {
      setExecResult({
        success: false,
        stdout: '',
        error: err.message,
        executionTimeMs: 0,
        runtime: 'Python 3.10 Engine Bridge',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleVectorize = async () => {
    if (!vectorInput.trim()) return;
    setIsVectorizing(true);
    try {
      const res = await fetch('/api/python/vectorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: vectorInput, dimensions: 64 }),
      });
      const data = await res.json();
      setVectorResult(data);
    } catch (err: any) {
      console.error('Vectorization failed', err);
    } finally {
      setIsVectorizing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-wide">Python 3.10 AI Core & Sandbox</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Native Python subprocess execution bridge, vector embeddings, & math computations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={isLoadingStatus}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-all cursor-pointer"
              title="Refresh Engine Status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-slate-950/40 px-6 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`px-4 py-2 text-xs font-mono font-semibold rounded-t-lg border-t border-x transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'sandbox'
                ? 'bg-slate-900 border-white/20 text-cyan-300 border-b-transparent'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            Python Sandbox Code Runner
          </button>
          <button
            onClick={() => setActiveTab('vectorizer')}
            className={`px-4 py-2 text-xs font-mono font-semibold rounded-t-lg border-t border-x transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'vectorizer'
                ? 'bg-slate-900 border-white/20 text-cyan-300 border-b-transparent'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            64-Dim Vector Embedder
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-4 py-2 text-xs font-mono font-semibold rounded-t-lg border-t border-x transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'bg-slate-900 border-white/20 text-cyan-300 border-b-transparent'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Core Diagnostics & IPC
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'sandbox' && (
            <div className="space-y-4">
              {/* Snippet Picker */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-xs text-slate-400 shrink-0 font-mono">Presets:</span>
                {DEFAULT_PYTHON_SNIPPETS.map((snippet) => (
                  <button
                    key={snippet.name}
                    onClick={() => setCode(snippet.code)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-cyan-300 transition-all shrink-0 cursor-pointer"
                  >
                    {snippet.name}
                  </button>
                ))}
              </div>

              {/* Code Editor Area */}
              <div className="rounded-xl border border-white/10 bg-slate-950 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-white/10 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-slate-300">python_script.py</span>
                  </div>
                  <span>Python 3.10 Sandbox</span>
                </div>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={9}
                  className="w-full p-4 bg-transparent font-mono text-xs text-emerald-300 focus:outline-hidden resize-none selection:bg-cyan-500/30"
                  placeholder="# Enter Python 3 code to execute in safe sandbox..."
                />
              </div>

              {/* Execution Actions */}
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400 font-mono">
                  Whitelisted Modules: <span className="text-slate-300">math, statistics, random, json, re, datetime, itertools</span>
                </div>
                <button
                  onClick={handleRunCode}
                  disabled={isExecuting || !code.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {isExecuting ? 'EXECUTING ON PYTHON...' : 'RUN SCRIPT IN PYTHON'}
                </button>
              </div>

              {/* Output Terminal */}
              {execResult && (
                <div className="rounded-xl border border-white/10 bg-slate-950 p-4 font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-[11px] pb-2 border-b border-white/10 text-slate-400">
                    <span className="flex items-center gap-1.5">
                      {execResult.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      Status: {execResult.success ? 'Execution Succeeded' : 'Execution Failed'}
                    </span>
                    <span>Runtime: {execResult.executionTimeMs} ms</span>
                  </div>
                  {execResult.stdout && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">STDOUT:</span>
                      <pre className="text-emerald-300 whitespace-pre-wrap">{execResult.stdout}</pre>
                    </div>
                  )}
                  {execResult.error && (
                    <div>
                      <span className="text-[10px] text-rose-400 uppercase tracking-wider block mb-1">STDERR / ERROR:</span>
                      <pre className="text-rose-400 whitespace-pre-wrap">{execResult.error}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'vectorizer' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <label className="block text-xs font-mono text-slate-300">
                  Input String for 64-Dimensional Semantic Tokenizer:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={vectorInput}
                    onChange={(e) => setVectorInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-cyan-300 focus:outline-hidden focus:border-cyan-500/50"
                  />
                  <button
                    onClick={handleVectorize}
                    disabled={isVectorizing || !vectorInput.trim()}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isVectorizing ? 'COMPUTING...' : 'COMPUTE VECTOR'}
                  </button>
                </div>
              </div>

              {vectorResult && vectorResult.vector && (
                <div className="rounded-xl border border-white/10 bg-slate-950 p-4 font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 text-slate-400 text-[11px]">
                    <span>Dimensions: {vectorResult.dimensions}</span>
                    <span>L2 Norm Magnitude: {vectorResult.magnitude}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase">Vector Values Array:</span>
                    <div className="grid grid-cols-8 sm:grid-cols-16 gap-1 p-2 rounded-lg bg-slate-900/60 max-h-48 overflow-y-auto">
                      {vectorResult.vector.map((val: number, i: number) => (
                        <div
                          key={i}
                          className="p-1 rounded text-center text-[10px] bg-cyan-950/40 text-cyan-300 border border-cyan-500/20"
                          title={`Dim ${i}: ${val}`}
                        >
                          {val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'diagnostics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>Python Subsystem Info</span>
                </div>
                <div className="space-y-2 text-slate-300 text-[11px]">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Engine Version:</span>
                    <span>{status?.version || 'Python 3.10.x'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Process PID:</span>
                    <span>{status?.pid || 'Dynamic IPC Spawn'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Vector Space:</span>
                    <span>{status?.vectorDimensions || 64} Dimensions</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">IPC Bridge:</span>
                    <span className="text-emerald-400">Node.js TSX &lt;--&gt; Python CLI</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-emerald-300 font-bold">
                  <Zap className="w-4 h-4" />
                  <span>Enabled Python Capabilities</span>
                </div>
                <div className="space-y-1.5 text-[11px]">
                  {(status?.capabilities || [
                    'vector_embedding_64d',
                    'memory_cosine_ranking',
                    'isolated_sandbox_execution',
                    'gemini_rest_client',
                    'math_and_statistics',
                  ]).map((cap) => (
                    <div key={cap} className="flex items-center gap-2 text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/60 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Bridge: JSON IPC via Node.js TSX Subprocess</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
