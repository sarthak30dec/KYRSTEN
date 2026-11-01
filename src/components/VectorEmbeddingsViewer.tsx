import React, { useState } from 'react';
import {
  Binary,
  Layers,
  Sparkles,
  Compass,
  Activity,
  Maximize2,
  Minimize2,
  Grid,
  TrendingUp,
  Cpu,
  Info,
} from 'lucide-react';
import { InputVectorAnalysis, WordVectorEmbedding } from '../utils/vectorEmbeddings';

interface VectorEmbeddingsViewerProps {
  analysis: InputVectorAnalysis;
}

export const VectorEmbeddingsViewer: React.FC<VectorEmbeddingsViewerProps> = ({ analysis }) => {
  const [selectedWordIdx, setSelectedWordIdx] = useState<number | null>(
    analysis.wordEmbeddings.length > 0 ? 0 : null
  );
  const [activeTab, setActiveTab] = useState<'words' | 'matrix' | 'space' | 'raw'>('words');
  const [showFullVector, setShowFullVector] = useState(false);

  const selectedWord =
    selectedWordIdx !== null && analysis.wordEmbeddings[selectedWordIdx]
      ? analysis.wordEmbeddings[selectedWordIdx]
      : null;

  const clusterColors: Record<WordVectorEmbedding['semanticCluster'], { bg: string; text: string; border: string; bar: string }> = {
    'Intent/Action': { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40', bar: 'bg-emerald-400' },
    'Entity/Subject': { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40', bar: 'bg-amber-400' },
    'Concept/Object': { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/40', bar: 'bg-cyan-400' },
    'Query/Question': { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/40', bar: 'bg-indigo-400' },
    'Modifier/Attribute': { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/40', bar: 'bg-purple-400' },
    'Structural/Grammar': { bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/40', bar: 'bg-slate-400' },
  };

  return (
    <div className="mt-2.5 p-3.5 rounded-2xl bg-black/70 border border-cyan-500/30 text-xs font-mono text-cyan-200 shadow-2xl backdrop-blur-md space-y-3">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div>
            <div className="font-bold text-white text-[11px] flex items-center gap-1.5">
              <span>WORD-LEVEL VECTOR EMBEDDINGS</span>
              <span className="px-1.5 py-0.2 rounded bg-cyan-400/20 text-cyan-300 text-[9px] border border-cyan-400/30">
                {analysis.dimensions}-D UNIT SPHERE
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Computed for {analysis.wordEmbeddings.length} words • Dominant Axis: <span className="text-cyan-300 font-semibold">{analysis.dominantSemanticAxis}</span>
            </div>
          </div>
        </div>

        {/* View mode switcher */}
        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 text-[10px]">
          <button
            onClick={() => setActiveTab('words')}
            className={`px-2 py-1 rounded transition-all cursor-pointer ${
              activeTab === 'words' ? 'bg-cyan-500/30 text-cyan-200 font-semibold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Word Vectors
          </button>
          <button
            onClick={() => setActiveTab('space')}
            className={`px-2 py-1 rounded transition-all cursor-pointer ${
              activeTab === 'space' ? 'bg-cyan-500/30 text-cyan-200 font-semibold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            2D Space
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-2 py-1 rounded transition-all cursor-pointer ${
              activeTab === 'matrix' ? 'bg-cyan-500/30 text-cyan-200 font-semibold shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cosine Matrix
          </button>
        </div>
      </div>

      {/* TAB 1: WORD VECTORS & HEATMAP */}
      {activeTab === 'words' && (
        <div className="space-y-3">
          {/* Word Token Chips */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Select Word to Inspect High-Dimensional Embedding:</span>
              <span className="text-cyan-400/80">Click any word</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.wordEmbeddings.map((we, idx) => {
                const colors = clusterColors[we.semanticCluster] || clusterColors['Concept/Object'];
                const isSelected = selectedWordIdx === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedWordIdx(idx)}
                    className={`group relative px-2.5 py-1 rounded-xl text-[11px] border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-cyan-400/50 font-bold scale-105 shadow-lg`
                        : `${colors.bg} ${colors.text} ${colors.border} hover:scale-102 opacity-90`
                    }`}
                  >
                    <span>{we.word}</span>
                    <span className="text-[9px] opacity-75 font-mono">({Math.round(we.similarityToPrompt * 100)}%)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Word Deep Embedding Card */}
          {selectedWord && (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-cyan-500/20 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white px-2 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40">
                    "{selectedWord.word}"
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] border ${clusterColors[selectedWord.semanticCluster].bg} ${clusterColors[selectedWord.semanticCluster].text} ${clusterColors[selectedWord.semanticCluster].border}`}>
                    {selectedWord.semanticCluster}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-300">
                  <span>Prompt Sim: <strong className="text-cyan-300">{selectedWord.similarityToPrompt}</strong></span>
                  <span>Magnitude: <strong className="text-emerald-300">{selectedWord.magnitude.toFixed(2)}</strong></span>
                  <span>Index: <strong>#{selectedWord.index}</strong></span>
                </div>
              </div>

              {/* 64-D Vector Embedding Values Heatmap Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    <span>64-Dimensional Vector Coordinates Heatmap:</span>
                  </span>
                  <button
                    onClick={() => setShowFullVector(!showFullVector)}
                    className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                  >
                    {showFullVector ? 'Collapse numeric array' : 'View numeric float values'}
                  </button>
                </div>

                {/* Heatmap Bar Grid */}
                <div className="grid grid-cols-32 gap-0.5 p-1.5 rounded-lg bg-black/80 border border-white/10">
                  {selectedWord.vector.map((val, dIdx) => {
                    const normVal = Math.max(-1, Math.min(1, val));
                    const isPos = normVal >= 0;
                    const opacity = Math.abs(normVal);
                    return (
                      <div
                        key={dIdx}
                        title={`dim[${dIdx}]: ${val.toFixed(4)}`}
                        className={`h-4 rounded-xs transition-transform hover:scale-125 ${
                          isPos
                            ? `bg-cyan-400`
                            : `bg-rose-400`
                        }`}
                        style={{ opacity: Math.max(0.2, opacity) }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 px-1">
                  <span>dim[0]</span>
                  <span>dim[31]</span>
                  <span>dim[63]</span>
                </div>
              </div>

              {/* Raw Numeric Values Preview */}
              {showFullVector && (
                <div className="p-2 rounded-lg bg-black/90 border border-cyan-500/30 max-h-28 overflow-y-auto font-mono text-[9px] text-cyan-300 leading-relaxed">
                  [{selectedWord.vector.map((v) => v.toFixed(4)).join(', ')}]
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 2D VECTOR SPACE SCATTER PROJECTION */}
      {activeTab === 'space' && (
        <div className="space-y-2">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>2D Semantic Space Projection (PCA Coordinate Scatter)</span>
            <span className="text-cyan-300">Semantic clustering distance</span>
          </div>

          <div className="relative w-full h-44 rounded-xl bg-black/90 border border-cyan-500/20 p-2 overflow-hidden flex items-center justify-center">
            {/* Coordinate Grid axes */}
            <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/10" />
            <div className="absolute inset-y-0 left-1/2 w-[1px] bg-white/10" />
            <div className="absolute top-2 left-2 text-[8px] text-slate-500">+Y (Concept Axis)</div>
            <div className="absolute bottom-2 right-2 text-[8px] text-slate-500">+X (Action Axis)</div>

            {/* Word Vectors plotted in 2D space */}
            {analysis.wordEmbeddings.map((we, idx) => {
              // Convert coords from -1..1 to percentage
              const leftPercent = 50 + we.coordinates2D.x * 35;
              const topPercent = 50 - we.coordinates2D.y * 35;
              const isSelected = selectedWordIdx === idx;
              const colors = clusterColors[we.semanticCluster] || clusterColors['Concept/Object'];

              return (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedWordIdx(idx);
                    setActiveTab('words');
                  }}
                  style={{
                    left: `${Math.max(8, Math.min(92, leftPercent))}%`,
                    top: `${Math.max(8, Math.min(92, topPercent))}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all cursor-pointer z-10 ${
                    isSelected
                      ? `${colors.bg} ${colors.text} ${colors.border} ring-2 ring-cyan-400 scale-110 shadow-lg`
                      : `${colors.bg} ${colors.text} ${colors.border} hover:scale-110`
                  }`}
                  title={`"${we.word}": (${we.coordinates2D.x}, ${we.coordinates2D.y})`}
                >
                  {we.word}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: COSINE SIMILARITY MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-2">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Pairwise Word-to-Word Cosine Similarity Matrix:</span>
            <span className="text-cyan-300">Coherence: {Math.round(analysis.semanticCoherence * 100)}%</span>
          </div>

          <div className="overflow-x-auto max-h-48 border border-white/10 rounded-xl p-2 bg-black/80">
            <table className="w-full text-[9px] font-mono border-collapse">
              <thead>
                <tr>
                  <th className="p-1 text-left text-slate-400 border-b border-white/10">Word</th>
                  {analysis.wordEmbeddings.map((w, colIdx) => (
                    <th key={colIdx} className="p-1 text-center text-slate-400 border-b border-white/10 max-w-[50px] truncate">
                      {w.word}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analysis.wordEmbeddings.map((rowWord, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/5">
                    <td className="p-1 font-bold text-white border-r border-white/10 truncate max-w-[70px]">
                      {rowWord.word}
                    </td>
                    {analysis.wordEmbeddings.map((colWord, cIdx) => {
                      const sim = analysis.cosineMatrix[rIdx]?.[cIdx] ?? 0;
                      const isSelf = rIdx === cIdx;
                      return (
                        <td
                          key={cIdx}
                          className={`p-1 text-center rounded-xs transition-colors ${
                            isSelf
                              ? 'bg-cyan-500/30 text-cyan-200 font-bold'
                              : sim > 0.6
                              ? 'bg-emerald-500/30 text-emerald-200 font-semibold'
                              : sim > 0.3
                              ? 'bg-cyan-500/10 text-cyan-300'
                              : 'text-slate-500'
                          }`}
                          title={`Sim("${rowWord.word}", "${colWord.word}") = ${sim}`}
                        >
                          {sim.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
