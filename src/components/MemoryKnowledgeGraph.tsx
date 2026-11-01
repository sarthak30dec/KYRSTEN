import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { LongTermMemoryItem, MemoryCategory, MemoryImportance } from '../types';
import {
  Brain,
  Sparkles,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Filter,
  Eye,
  Info,
  Layers,
  Activity,
  Cpu,
} from 'lucide-react';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'core' | 'category' | 'memory' | 'tag';
  category?: MemoryCategory | 'core' | 'tag';
  importance?: MemoryImportance;
  radius: number;
  memoryItem?: LongTermMemoryItem;
  tag?: string;
  color: string;
  glowColor: string;
  accessCount?: number;
  highlighted?: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'core_to_category' | 'category_to_memory' | 'memory_to_tag' | 'cross_link';
  strength?: number;
  value?: number;
}

interface MemoryKnowledgeGraphProps {
  memories: LongTermMemoryItem[];
  searchQuery: string;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  onSelectMemory: (memory: LongTermMemoryItem) => void;
}

export const MemoryKnowledgeGraph: React.FC<MemoryKnowledgeGraphProps> = ({
  memories,
  searchQuery,
  selectedCategory,
  onSelectCategory,
  onSelectMemory,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [showTags, setShowTags] = useState(true);

  // Palette definitions
  const categoryColors: Record<string, { fill: string; stroke: string; glow: string; text: string }> = {
    core: { fill: '#06b6d4', stroke: '#22d3ee', glow: 'rgba(6, 182, 212, 0.6)', text: '#e0f2fe' },
    preference: { fill: '#10b981', stroke: '#34d399', glow: 'rgba(16, 185, 129, 0.5)', text: '#d1fae5' },
    entity: { fill: '#a855f7', stroke: '#c084fc', glow: 'rgba(168, 85, 247, 0.5)', text: '#f3e8ff' },
    project: { fill: '#0ea5e9', stroke: '#38bdf8', glow: 'rgba(14, 165, 233, 0.5)', text: '#e0f2fe' },
    fact: { fill: '#f59e0b', stroke: '#fbbf24', glow: 'rgba(245, 158, 11, 0.5)', text: '#fef3c7' },
    instruction: { fill: '#3b82f6', stroke: '#60a5fa', glow: 'rgba(59, 130, 246, 0.5)', text: '#dbeafe' },
    biography: { fill: '#ec4899', stroke: '#f472b6', glow: 'rgba(236, 72, 153, 0.5)', text: '#fce7f3' },
    tag: { fill: '#64748b', stroke: '#94a3b8', glow: 'rgba(100, 116, 139, 0.4)', text: '#f8fafc' },
  };

  const getImportanceRadius = (importance?: MemoryImportance) => {
    switch (importance) {
      case 'critical':
        return 17;
      case 'high':
        return 13;
      case 'medium':
        return 10;
      case 'low':
      default:
        return 8;
    }
  };

  // Build Graph Nodes & Links from memories
  const { nodes, links } = useMemo(() => {
    const nodeList: GraphNode[] = [];
    const linkList: GraphLink[] = [];

    // 1. Root Central Hub
    nodeList.push({
      id: 'node-core',
      name: 'Kyrsten Memory Core',
      type: 'core',
      category: 'core',
      radius: 22,
      color: categoryColors.core.fill,
      glowColor: categoryColors.core.glow,
    });

    // 2. Category Hub Nodes
    const categories: MemoryCategory[] = ['preference', 'entity', 'project', 'fact', 'instruction', 'biography'];
    const activeCategories = new Set<string>();

    memories.forEach((m) => activeCategories.add(m.category));

    categories.forEach((cat) => {
      const hasItems = activeCategories.has(cat);
      const catColor = categoryColors[cat] || categoryColors.preference;
      const catNodeId = `node-cat-${cat}`;

      nodeList.push({
        id: catNodeId,
        name: cat.toUpperCase(),
        type: 'category',
        category: cat,
        radius: hasItems ? 16 : 12,
        color: catColor.fill,
        glowColor: catColor.glow,
      });

      // Link Core to Category
      linkList.push({
        source: 'node-core',
        target: catNodeId,
        type: 'core_to_category',
        strength: 0.6,
        value: 2,
      });
    });

    // 3. Memory Fact & Entity Nodes
    const tagMap = new Map<string, string[]>(); // tag -> list of memoryIds

    memories.forEach((m) => {
      const catColor = categoryColors[m.category] || categoryColors.fact;
      const rad = getImportanceRadius(m.importance);
      const memNodeId = `node-mem-${m.id}`;

      nodeList.push({
        id: memNodeId,
        name: m.key,
        type: 'memory',
        category: m.category,
        importance: m.importance,
        radius: rad,
        memoryItem: m,
        color: catColor.fill,
        glowColor: catColor.glow,
        accessCount: m.accessCount || 0,
      });

      // Link Memory to its Category Hub
      linkList.push({
        source: `node-cat-${m.category}`,
        target: memNodeId,
        type: 'category_to_memory',
        strength: 0.8,
        value: 1,
      });

      // Collect tags for cross-entity clustering
      if (m.tags && m.tags.length > 0) {
        m.tags.forEach((tag) => {
          const cleanTag = tag.trim().toLowerCase();
          if (cleanTag) {
            if (!tagMap.has(cleanTag)) {
              tagMap.set(cleanTag, []);
            }
            tagMap.get(cleanTag)!.push(memNodeId);
          }
        });
      }
    });

    // 4. Tag / Concept Hub Nodes (if enabled)
    if (showTags) {
      tagMap.forEach((memIds, tag) => {
        if (memIds.length >= 1) {
          const tagNodeId = `node-tag-${tag}`;
          nodeList.push({
            id: tagNodeId,
            name: `#${tag}`,
            type: 'tag',
            category: 'tag',
            radius: 8,
            tag,
            color: categoryColors.tag.fill,
            glowColor: categoryColors.tag.glow,
          });

          // Link tag to associated memories
          memIds.forEach((memId) => {
            linkList.push({
              source: tagNodeId,
              target: memId,
              type: 'memory_to_tag',
              strength: 0.3,
              value: 0.8,
            });
          });
        }
      });
    }

    return { nodes: nodeList, links: linkList };
  }, [memories, showTags]);

  // Memoized Graph Stats
  const graphStats = useMemo(() => {
    const totalPossibleLinks = (nodes.length * (nodes.length - 1)) / 2;
    const densityVal = totalPossibleLinks > 0 ? (links.length / totalPossibleLinks).toFixed(3) : '0.000';
    return {
      nodes: nodes.length,
      links: links.length,
      density: densityVal,
    };
  }, [nodes.length, links.length]);

  // Main D3 Rendering & Simulation
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 520;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clean previous render

    // Filters for Holographic Neon Glow
    const defs = svg.append('defs');

    // Create glow filters for each color
    Object.entries(categoryColors).forEach(([catKey, col]) => {
      const filter = defs.append('filter')
        .attr('id', `glow-${catKey}`)
        .attr('x', '-50%')
        .attr('y', '-50%')
        .attr('width', '200%')
        .attr('height', '200%');

      filter.append('feGaussianBlur')
        .attr('stdDeviation', '4')
        .attr('result', 'coloredBlur');

      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    });

    // Background Pattern Grid
    const pattern = defs.append('pattern')
      .attr('id', 'graph-grid')
      .attr('width', 30)
      .attr('height', 30)
      .attr('patternUnits', 'userSpaceOnUse');

    pattern.append('path')
      .attr('d', 'M 30 0 L 0 0 0 30')
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255, 255, 255, 0.03)')
      .attr('stroke-width', '1');

    svg.append('rect')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('fill', 'url(#graph-grid)');

    // Main Graph Container for Zoom
    const g = svg.append('g').attr('class', 'graph-content');

    // D3 Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Initial Center Transform
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.95)
    );

    // D3 Force Simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3.forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance((d) => {
            if (d.type === 'core_to_category') return 110;
            if (d.type === 'category_to_memory') return 75;
            return 50;
          })
          .strength((d) => d.strength || 0.5)
      )
      .force('charge', d3.forceManyBody<GraphNode>().strength((d) => (d.type === 'core' ? -450 : d.type === 'category' ? -250 : -120)))
      .force('center', d3.forceCenter(0, 0).strength(0.08))
      .force('collide', d3.forceCollide<GraphNode>().radius((d) => d.radius + 12).iterations(2))
      .alphaDecay(0.028);

    simulationRef.current = simulation;

    // Render Links (Lines)
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        if (d.type === 'core_to_category') return 'rgba(6, 182, 212, 0.4)';
        if (d.type === 'category_to_memory') return 'rgba(255, 255, 255, 0.15)';
        return 'rgba(148, 163, 184, 0.18)';
      })
      .attr('stroke-width', (d) => (d.type === 'core_to_category' ? 2 : d.type === 'category_to_memory' ? 1.5 : 1))
      .attr('stroke-dasharray', (d) => (d.type === 'memory_to_tag' ? '3 3' : 'none'))
      .attr('opacity', 0.8);

    // Render Nodes Group
    const nodeGroup = g.append('g')
      .attr('class', 'nodes')
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Node Outer Glow Halo for Critical or Core items
    nodeGroup.append('circle')
      .attr('r', (d) => d.radius + 4)
      .attr('fill', 'none')
      .attr('stroke', (d) => d.color)
      .attr('stroke-width', (d) => (d.importance === 'critical' || d.type === 'core' ? 2 : 1))
      .attr('stroke-opacity', (d) => (d.importance === 'critical' ? 0.8 : d.type === 'core' ? 0.7 : 0.2))
      .attr('stroke-dasharray', (d) => (d.importance === 'critical' ? '4 2' : 'none'))
      .attr('filter', (d) => `url(#glow-${d.category || 'fact'})`);

    // Main Node Circle
    nodeGroup.append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.color)
      .attr('fill-opacity', (d) => (d.type === 'core' ? 0.95 : d.type === 'category' ? 0.85 : 0.75))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', (d) => (d.type === 'core' ? 2.5 : d.type === 'category' ? 2 : 1))
      .attr('stroke-opacity', 0.6);

    // Node Label Text
    nodeGroup.append('text')
      .attr('dy', (d) => (d.radius > 14 ? 4 : d.radius + 12))
      .attr('text-anchor', 'middle')
      .attr('font-size', (d) => (d.type === 'core' ? '11px' : d.type === 'category' ? '10px' : '9px'))
      .attr('font-weight', (d) => (d.type === 'core' || d.type === 'category' ? '700' : '500'))
      .attr('font-family', 'var(--font-mono), monospace')
      .attr('fill', (d) => (d.type === 'core' ? '#ffffff' : '#cbd5e1'))
      .attr('pointer-events', 'none')
      .text((d) => {
        if (d.type === 'core') return 'KYRSTEN CORE';
        if (d.name.length > 18) return `${d.name.substring(0, 16)}...`;
        return d.name;
      });

    // Node Interactions (Hover & Click)
    nodeGroup
      .on('mouseenter', (event, d) => {
        setHoveredNode(d);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }

        // Highlight connected links and nodes
        const connectedNodeIds = new Set<string>([d.id]);
        links.forEach((l) => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          const tId = typeof l.target === 'object' ? l.target.id : l.target;
          if (sId === d.id) connectedNodeIds.add(tId as string);
          if (tId === d.id) connectedNodeIds.add(sId as string);
        });

        nodeGroup.attr('opacity', (n) => (connectedNodeIds.has(n.id) ? 1 : 0.25));
        link.attr('opacity', (l) => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          const tId = typeof l.target === 'object' ? l.target.id : l.target;
          return sId === d.id || tId === d.id ? 1 : 0.1;
        }).attr('stroke-width', (l) => {
          const sId = typeof l.source === 'object' ? l.source.id : l.source;
          const tId = typeof l.target === 'object' ? l.target.id : l.target;
          return sId === d.id || tId === d.id ? 2.5 : 1;
        });
      })
      .on('mousemove', (event) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mouseleave', () => {
        setHoveredNode(null);
        nodeGroup.attr('opacity', 1);
        link.attr('opacity', 0.8).attr('stroke-width', (d) => (d.type === 'core_to_category' ? 2 : 1.5));
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNodeId(d.id);
        if (d.type === 'category' && d.category) {
          onSelectCategory(d.category);
        } else if (d.type === 'memory' && d.memoryItem) {
          onSelectMemory(d.memoryItem);
        }
      });

    // Simulation Tick Updates
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeGroup.attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  // React to Search Query or Category Filter dynamically
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const q = searchQuery.toLowerCase().trim();

    svg.selectAll('.node').attr('opacity', (d: any) => {
      if (!q && selectedCategory === 'all') return 1;

      // Category matching
      if (selectedCategory !== 'all') {
        if (d.type === 'core') return 0.5;
        if (d.type === 'category' && d.category === selectedCategory) return 1;
        if (d.type === 'memory' && d.category === selectedCategory) return 1;
        return 0.15;
      }

      // Search query matching
      if (q) {
        const matchesName = d.name.toLowerCase().includes(q);
        const matchesVal = d.memoryItem?.value?.toLowerCase().includes(q);
        const matchesTag = d.memoryItem?.tags?.some((t: string) => t.toLowerCase().includes(q));
        return matchesName || matchesVal || matchesTag ? 1 : 0.2;
      }

      return 1;
    });
  }, [searchQuery, selectedCategory]);

  const handleResetZoom = () => {
    if (!svgRef.current || !containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 520;
    const svg = d3.select(svgRef.current);
    const zoom = d3.zoom<SVGSVGElement, unknown>();
    svg.transition().duration(750).call(
      zoom.transform as any,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.95)
    );
  };

  const handleToggleSimulation = () => {
    if (!simulationRef.current) return;
    if (isSimulating) {
      simulationRef.current.stop();
      setIsSimulating(false);
    } else {
      simulationRef.current.alpha(0.3).restart();
      setIsSimulating(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[520px] bg-slate-950/80 rounded-2xl border border-cyan-500/20 overflow-hidden flex flex-col select-none"
    >
      {/* SVG Canvas */}
      <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating HUD Controls Bar */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 p-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-xs font-mono text-slate-300 shadow-xl z-10">
        <button
          onClick={handleToggleSimulation}
          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
            isSimulating ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/5 hover:bg-white/10 text-slate-400'
          }`}
          title={isSimulating ? 'Pause physics simulation' : 'Resume physics simulation'}
        >
          {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={handleResetZoom}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          title="Reset graph zoom & view center"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="h-4 w-[1px] bg-white/10 mx-0.5" />

        <button
          onClick={() => setShowTags(!showTags)}
          className={`px-2 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1 ${
            showTags ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/5 text-slate-400'
          }`}
          title="Toggle extracted tag hubs"
        >
          <Layers className="w-3 h-3" />
          <span>Tags</span>
        </button>
      </div>

      {/* Floating Stats & Legend Bar */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2 p-2 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-300 shadow-xl z-10">
        <div className="flex items-center gap-1.5 pr-2 border-r border-white/10 text-cyan-400">
          <Activity className="w-3.5 h-3.5" />
          <span>Nodes: {graphStats.nodes}</span>
          <span className="text-slate-500">•</span>
          <span>Links: {graphStats.links}</span>
        </div>

        {/* Category Color Legend Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['preference', 'entity', 'project', 'fact', 'instruction', 'biography'] as MemoryCategory[]).map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(isSelected ? 'all' : cat)}
                className={`px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider font-semibold transition-all cursor-pointer flex items-center gap-1 border ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/60 text-white shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: categoryColors[cat]?.fill || '#06b6d4' }}
                />
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Holographic Tooltip on Hover */}
      {hoveredNode && (
        <div
          className="absolute pointer-events-none z-30 p-3 rounded-xl bg-slate-900/95 backdrop-blur-xl border border-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.25)] text-slate-200 max-w-xs animate-fade-in text-xs font-mono space-y-1.5"
          style={{
            left: `${Math.min(tooltipPos.x + 15, (containerRef.current?.clientWidth || 700) - 260)}px`,
            top: `${Math.min(tooltipPos.y + 15, (containerRef.current?.clientHeight || 500) - 180)}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1">
            <span className="font-bold text-white tracking-wide truncate">{hoveredNode.name}</span>
            {hoveredNode.category && (
              <span
                className="px-1.5 py-0.2 rounded text-[9px] uppercase font-bold"
                style={{
                  backgroundColor: `${categoryColors[hoveredNode.category]?.fill}25`,
                  color: categoryColors[hoveredNode.category]?.text || '#ffffff',
                }}
              >
                {hoveredNode.category}
              </span>
            )}
          </div>

          {hoveredNode.memoryItem && (
            <>
              <p className="text-[11px] text-slate-300 font-sans line-clamp-3 bg-black/40 p-1.5 rounded-lg border border-white/5">
                {hoveredNode.memoryItem.value}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span className="capitalize">
                  Importance: <b className="text-cyan-300">{hoveredNode.memoryItem.importance}</b>
                </span>
                {hoveredNode.memoryItem.accessCount ? (
                  <span>Recalled: {hoveredNode.memoryItem.accessCount}x</span>
                ) : null}
              </div>
              {hoveredNode.memoryItem.tags && hoveredNode.memoryItem.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {hoveredNode.memoryItem.tags.map((t, idx) => (
                    <span key={idx} className="px-1 py-0.2 rounded bg-white/10 text-[9px] text-slate-300">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {hoveredNode.type === 'category' && (
            <p className="text-[10px] text-slate-400">
              Category cluster hub. Click to filter knowledge vault items by this category.
            </p>
          )}

          {hoveredNode.type === 'core' && (
            <p className="text-[10px] text-cyan-300">
              Kyrsten Neural Memory Core. Synthesizes knowledge vectors, facts, and user biometrics.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
