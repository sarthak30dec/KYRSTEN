import React, { useState, useMemo } from 'react';
import {
  Brain,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Tag,
  Clock,
  ShieldAlert,
  Database,
  Bookmark,
  ChevronRight,
  Filter,
  Copy,
  Network,
  ListFilter,
  Eye,
} from 'lucide-react';
import { LongTermMemoryItem, MemoryCategory, MemoryImportance } from '../types';
import {
  saveLongTermMemories,
  upsertLongTermMemory,
  deleteLongTermMemory,
  DEFAULT_LONG_TERM_MEMORIES,
} from '../utils/longTermMemory';
import { MemoryKnowledgeGraph } from './MemoryKnowledgeGraph';

interface LongTermMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: LongTermMemoryItem[];
  onUpdateMemories: (updated: LongTermMemoryItem[]) => void;
}

export const LongTermMemoryModal: React.FC<LongTermMemoryModalProps> = ({
  isOpen,
  onClose,
  memories,
  onUpdateMemories,
}) => {
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [inspectedMemory, setInspectedMemory] = useState<LongTermMemoryItem | null>(null);

  // New Memory Form State
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formCategory, setFormCategory] = useState<MemoryCategory>('preference');
  const [formImportance, setFormImportance] = useState<MemoryImportance>('high');
  const [formTags, setFormTags] = useState('');

  if (!isOpen) return null;

  const categories: { id: string; label: string; count: number }[] = [
    { id: 'all', label: 'All Memories', count: memories.length },
    { id: 'preference', label: 'Preferences', count: memories.filter((m) => m.category === 'preference').length },
    { id: 'entity', label: 'Entities', count: memories.filter((m) => m.category === 'entity').length },
    { id: 'project', label: 'Projects', count: memories.filter((m) => m.category === 'project').length },
    { id: 'fact', label: 'Facts', count: memories.filter((m) => m.category === 'fact').length },
    { id: 'instruction', label: 'Instructions', count: memories.filter((m) => m.category === 'instruction').length },
    { id: 'biography', label: 'Biography', count: memories.filter((m) => m.category === 'biography').length },
  ];

  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.key.toLowerCase().includes(q) ||
        m.value.toLowerCase().includes(q) ||
        (m.tags && m.tags.some((t) => t.toLowerCase().includes(q)));
      return matchesCategory && matchesSearch;
    });
  }, [memories, selectedCategory, searchQuery]);

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim() || !formValue.trim()) return;

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const updated = upsertLongTermMemory(
      {
        key: formKey.trim(),
        value: formValue.trim(),
        category: formCategory,
        importance: formImportance,
        source: 'user_manual',
        tags: tagsArray,
      },
      memories
    );

    onUpdateMemories(updated);
    setFormKey('');
    setFormValue('');
    setFormTags('');
    setIsAdding(false);
  };

  const handleStartEdit = (m: LongTermMemoryItem) => {
    setEditingId(m.id);
    setFormKey(m.key);
    setFormValue(m.value);
    setFormCategory(m.category);
    setFormImportance(m.importance);
    setFormTags((m.tags || []).join(', '));
  };

  const handleSaveEdit = (id: string) => {
    if (!formKey.trim() || !formValue.trim()) return;
    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const updated = upsertLongTermMemory(
      {
        id,
        key: formKey.trim(),
        value: formValue.trim(),
        category: formCategory,
        importance: formImportance,
        tags: tagsArray,
      },
      memories
    );

    onUpdateMemories(updated);
    setEditingId(null);
    setFormKey('');
    setFormValue('');
    setFormTags('');
  };

  const handleDelete = (id: string) => {
    const updated = deleteLongTermMemory(id, memories);
    onUpdateMemories(updated);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset Long-term Memory Vault to default baseline items?')) {
      saveLongTermMemories(DEFAULT_LONG_TERM_MEMORIES);
      onUpdateMemories(DEFAULT_LONG_TERM_MEMORIES);
    }
  };

  const handleWipeAll = () => {
    if (confirm('Are you sure you want to wipe ALL persistent memories from localStorage? Kyrsten will forget previously saved user preferences.')) {
      saveLongTermMemories([]);
      onUpdateMemories([]);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(memories, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `kyrsten_memory_vault_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            saveLongTermMemories(parsed);
            onUpdateMemories(parsed);
            alert(`Successfully imported ${parsed.length} memory entries!`);
          }
        } catch {
          alert('Invalid JSON memory file.');
        }
      };
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getImportanceColor = (imp: MemoryImportance) => {
    switch (imp) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'medium':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'low':
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const getCategoryColor = (cat: MemoryCategory) => {
    switch (cat) {
      case 'preference':
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'entity':
        return 'text-purple-400 border-purple-500/30 bg-purple-500/10';
      case 'project':
        return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
      case 'fact':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'instruction':
        return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      case 'biography':
        return 'text-pink-400 border-pink-500/30 bg-pink-500/10';
      default:
        return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-950/95 border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide font-hud uppercase">
                  Long-Term Memory Vault
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-[10px] font-mono font-semibold">
                  LOCALSTORAGE SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kyrsten retains these entities, preferences, facts, and projects across future page reloads.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: Knowledge Graph vs Vault List */}
            <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
              <button
                onClick={() => setViewMode('graph')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'graph'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Knowledge Graph</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vault List</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300">
                  {memories.length}
                </span>
              </button>
            </div>

            <button
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{isAdding ? 'Close' : 'Add Memory'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action / Add Form Drawer */}
        {isAdding && (
          <form
            onSubmit={handleSaveNew}
            className="p-5 border-b border-cyan-500/30 bg-cyan-950/20 space-y-4 animate-slide-down"
          >
            <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold uppercase tracking-wider">
              <span>Add New Long-Term Memory</span>
              <span className="text-[11px] text-slate-400 normal-case">Will be saved to localStorage instantly</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] text-slate-300 font-mono">Entity / Key Name</label>
                <input
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="e.g. Favorite Editor, Project Chimera, Wife's Birthday..."
                  required
                  className="w-full text-xs px-3 py-2 rounded-xl bg-black/60 border border-cyan-500/40 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-mono">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-black/60 border border-cyan-500/40 text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono"
                >
                  <option value="preference">Preference</option>
                  <option value="entity">Entity</option>
                  <option value="project">Project</option>
                  <option value="fact">Fact</option>
                  <option value="instruction">Instruction</option>
                  <option value="biography">Biography</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-mono">Memory Value / Detailed Description</label>
              <textarea
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder="e.g. Neovim with Lua plugins, prefers dark high-contrast themes and minimal animations."
                rows={2}
                required
                className="w-full text-xs px-3 py-2 rounded-xl bg-black/60 border border-cyan-500/40 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-mono">Importance Level</label>
                <div className="flex gap-2">
                  {(['critical', 'high', 'medium', 'low'] as MemoryImportance[]).map((imp) => (
                    <button
                      key={imp}
                      type="button"
                      onClick={() => setFormImportance(imp)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider border transition-all cursor-pointer ${
                        formImportance === imp
                          ? `${getImportanceColor(imp)} font-bold ring-1 ring-white/40`
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {imp}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 font-mono">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="tools, habits, ui"
                  className="w-full text-xs px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
              >
                Save to Long-Term Memory
              </button>
            </div>
          </form>
        )}

        {/* Toolbar: Search, Category Tabs, Stats */}
        <div className="p-4 border-b border-white/10 bg-white/[0.01] space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search memories by keyword, entity, value, or tag..."
                className="w-full text-xs pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Actions / Backup */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Export memories to JSON file"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Export</span>
              </button>

              <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Import</span>
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>

              <button
                onClick={handleResetDefaults}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Restore default baseline memory items"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Reset</span>
              </button>

              <button
                onClick={handleWipeAll}
                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 transition-all cursor-pointer"
                title="Wipe all memories"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-mono">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-xl whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm'
                    : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <span>{cat.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-slate-300 font-mono">
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content View: Knowledge Graph or Vault List */}
        {viewMode === 'graph' ? (
          <div className="flex-1 p-4 flex flex-col space-y-3 overflow-y-auto">
            <MemoryKnowledgeGraph
              memories={filteredMemories}
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => setSelectedCategory(cat)}
              onSelectMemory={(mem) => setInspectedMemory(mem)}
            />

            {/* Selected Node Inspector Drawer */}
            {inspectedMemory && (
              <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 shadow-xl space-y-2.5 animate-slide-down">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm font-mono tracking-tight">
                      {inspectedMemory.key}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border ${getCategoryColor(
                        inspectedMemory.category
                      )}`}
                    >
                      {inspectedMemory.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider border ${getImportanceColor(
                        inspectedMemory.importance
                      )}`}
                    >
                      {inspectedMemory.importance}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy(inspectedMemory.id, `${inspectedMemory.key}: ${inspectedMemory.value}`)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                      title="Copy to clipboard"
                    >
                      {copiedId === inspectedMemory.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        handleStartEdit(inspectedMemory);
                        setViewMode('list');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono transition-all cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        handleDelete(inspectedMemory.id);
                        setInspectedMemory(null);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                      title="Delete memory"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setInspectedMemory(null)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-sans bg-black/50 p-2.5 rounded-xl border border-white/5">
                  {inspectedMemory.value}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center gap-3">
                    <span>Saved: {new Date(inspectedMemory.createdAt).toLocaleDateString()}</span>
                    {inspectedMemory.accessCount && inspectedMemory.accessCount > 0 && (
                      <span className="text-cyan-400">Recalled {inspectedMemory.accessCount}x</span>
                    )}
                    <span>Source: {inspectedMemory.source}</span>
                  </div>

                  {inspectedMemory.tags && inspectedMemory.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      {inspectedMemory.tags.map((t, idx) => (
                        <span key={idx} className="px-1.5 py-0.2 rounded bg-white/10 text-slate-300 text-[9px]">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Memory Items List */
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredMemories.length === 0 ? (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Brain className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
                <div className="text-sm font-medium text-slate-400">No matching memories found</div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try searching with different keywords or switch categories.'
                    : 'Start by clicking "Add Memory" above or simply tell Kyrsten to remember facts during voice chat.'}
                </p>
              </div>
            ) : (
              filteredMemories.map((m) => {
                const isEditingThis = editingId === m.id;

                if (isEditingThis) {
                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-400/50 space-y-3 animate-fade-in"
                    >
                      <div className="text-xs font-bold text-cyan-300 font-mono">Edit Memory Item</div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={formKey}
                          onChange={(e) => setFormKey(e.target.value)}
                          className="sm:col-span-2 text-xs px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/40 text-white font-mono"
                        />
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value as MemoryCategory)}
                          className="text-xs px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/40 text-white font-mono"
                        >
                          <option value="preference">Preference</option>
                          <option value="entity">Entity</option>
                          <option value="project">Project</option>
                          <option value="fact">Fact</option>
                          <option value="instruction">Instruction</option>
                          <option value="biography">Biography</option>
                        </select>
                      </div>
                      <textarea
                        value={formValue}
                        onChange={(e) => setFormValue(e.target.value)}
                        rows={2}
                        className="w-full text-xs px-3 py-1.5 rounded-xl bg-black/60 border border-cyan-500/40 text-white font-mono resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(m.id)}
                          className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className="group relative p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-500/30 transition-all space-y-2.5"
                  >
                    {/* Top Bar of Memory Card */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm font-mono tracking-tight">{m.key}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider border ${getCategoryColor(
                            m.category
                          )}`}
                        >
                          {m.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-mono uppercase tracking-wider border ${getImportanceColor(
                            m.importance
                          )}`}
                        >
                          {m.importance}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(m.id, `${m.key}: ${m.value}`)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                          title="Copy to clipboard"
                        >
                          {copiedId === m.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleStartEdit(m)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer"
                          title="Edit memory"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                          title="Delete memory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Value / Memory Content */}
                    <p className="text-xs text-slate-300 leading-relaxed font-sans bg-black/40 p-2.5 rounded-xl border border-white/5">
                      {m.value}
                    </p>

                    {/* Footer metadata & tags */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-mono pt-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Saved: {new Date(m.createdAt).toLocaleDateString()}</span>
                        </span>
                        {m.accessCount && m.accessCount > 0 && (
                          <span className="text-cyan-400/80">Recalled {m.accessCount}x</span>
                        )}
                        <span className="text-slate-600">Source: {m.source}</span>
                      </div>

                      {m.tags && m.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-slate-500" />
                          {m.tags.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 rounded bg-white/5 text-slate-400 text-[9px]"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer info bar */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02] flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Vault Status: {memories.length} entities in browser storage</span>
          </div>
          <div className="text-[11px] text-slate-500">
            Automatically loaded into Gemini System Context on each conversation turn.
          </div>
        </div>
      </div>
    </div>
  );
};
