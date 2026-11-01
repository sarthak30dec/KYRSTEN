import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Zap,
  Sparkles,
  Layers,
  Code,
  Activity,
  Workflow,
  PlusCircle,
} from 'lucide-react';
import { FeatureExtension } from '../types';

interface FeatureExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  extensions: FeatureExtension[];
  onAddExtension: (ext: FeatureExtension) => void;
  onToggleExtension: (id: string) => void;
  onDeleteExtension: (id: string) => void;
}

export const FeatureExtensionModal: React.FC<FeatureExtensionModalProps> = ({
  isOpen,
  onClose,
  extensions,
  onAddExtension,
  onToggleExtension,
  onDeleteExtension,
}) => {
  const [activeTab, setActiveTab] = useState<'installed' | 'create'>('installed');

  // Custom Feature Creator form state
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureDesc, setNewFeatureDesc] = useState('');
  const [newFeatureCategory, setNewFeatureCategory] = useState<FeatureExtension['category']>('custom');
  const [newFeatureInstruction, setNewFeatureInstruction] = useState('');
  const [newQuickPromptLabel, setNewQuickPromptLabel] = useState('');
  const [newQuickPromptText, setNewQuickPromptText] = useState('');

  if (!isOpen) return null;

  const handleCreateFeature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeatureName.trim()) return;

    const newExt: FeatureExtension = {
      id: `ext-${Date.now()}`,
      name: newFeatureName.trim(),
      description: newFeatureDesc.trim() || 'Custom user extension module',
      version: '1.0.0',
      category: newFeatureCategory,
      icon: 'Sparkles',
      isEnabled: true,
      author: 'Boss Custom Studio',
      systemInstruction: newFeatureInstruction.trim() || undefined,
      quickPrompts: newQuickPromptText.trim()
        ? [
            {
              label: newQuickPromptLabel.trim() || newFeatureName.trim(),
              prompt: newQuickPromptText.trim(),
            },
          ]
        : undefined,
      createdAt: Date.now(),
    };

    onAddExtension(newExt);
    setNewFeatureName('');
    setNewFeatureDesc('');
    setNewFeatureInstruction('');
    setNewQuickPromptLabel('');
    setNewQuickPromptText('');
    setActiveTab('installed');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-3xl backdrop-blur-2xl bg-slate-950/90 rounded-3xl border border-indigo-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-400/40 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-hud tracking-widest text-white uppercase">
                  Kyrsten Feature & Extension Hub
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {extensions.filter((e) => e.isEnabled).length} ACTIVE EXTENSIONS
                </span>
              </div>
              <p className="text-xs font-mono text-indigo-300/80">
                Modular plugins, workflow macros, and 1-click custom capability studio
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
            onClick={() => setActiveTab('installed')}
            className={`py-3 font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'installed'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            INSTALLED EXTENSIONS ({extensions.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'create'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            CREATE CUSTOM FEATURE
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm font-sans">
          {activeTab === 'installed' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                  Available Feature Modules
                </span>
                <button
                  onClick={() => setActiveTab('create')}
                  className="flex items-center gap-1.5 text-xs font-hud font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  ADD NEW EXTENSION
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {extensions.map((ext) => (
                  <div
                    key={ext.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      ext.isEnabled
                        ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg'
                        : 'bg-white/5 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-indigo-300">
                          {ext.category === 'automation' && <Workflow className="w-5 h-5" />}
                          {ext.category === 'productivity' && <Activity className="w-5 h-5" />}
                          {ext.category === 'developer' && <Code className="w-5 h-5" />}
                          {ext.category === 'custom' && <Sparkles className="w-5 h-5" />}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white font-hud tracking-wide">
                              {ext.name}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/5 uppercase">
                              v{ext.version} • {ext.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                            {ext.description}
                          </p>

                          {/* Quick Voice Triggers inside this extension */}
                          {ext.quickPrompts && ext.quickPrompts.length > 0 && (
                            <div className="pt-2 flex flex-wrap gap-1.5">
                              {ext.quickPrompts.map((qp, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-mono px-2 py-1 rounded-lg bg-black/50 text-indigo-200 border border-indigo-400/20"
                                >
                                  ⚡ &ldquo;{qp.prompt}&rdquo;
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ext.isEnabled}
                            onChange={() => onToggleExtension(ext.id)}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500"></div>
                        </label>

                        {ext.category === 'custom' && (
                          <button
                            onClick={() => onDeleteExtension(ext.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Delete custom extension"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateFeature} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-300">Feature Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Smart Spotify DJ or Crypto Sentinel"
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-xs font-mono focus:border-indigo-400 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-300">Category</label>
                  <select
                    value={newFeatureCategory}
                    onChange={(e) => setNewFeatureCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:border-indigo-400 outline-none"
                  >
                    <option value="automation">Workflow Automation</option>
                    <option value="developer">Developer & Code</option>
                    <option value="productivity">Productivity & Analytics</option>
                    <option value="multimodal">Multimodal & Audio</option>
                    <option value="custom">Custom Agent Skill</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300">Feature Description</label>
                <input
                  type="text"
                  placeholder="Summary of what this capability provides to Boss"
                  value={newFeatureDesc}
                  onChange={(e) => setNewFeatureDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-xs font-mono focus:border-indigo-400 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-slate-300">
                  Kyrsten Neural Prompt Directives (How Kyrsten should behave for this feature)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. When Boss asks for music or vibe change, suggest an ambient electronic track and adjust lighting to match."
                  value={newFeatureInstruction}
                  onChange={(e) => setNewFeatureInstruction(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-xs font-mono focus:border-indigo-400 outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-300">Quick Voice Command Label</label>
                  <input
                    type="text"
                    placeholder="e.g. DJ Cyber Wave"
                    value={newQuickPromptLabel}
                    onChange={(e) => setNewQuickPromptLabel(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-xs font-mono focus:border-indigo-400 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-300">Voice Command Prompt</label>
                  <input
                    type="text"
                    placeholder="e.g. Kyrsten, curate a cyber synthwave playlist for Boss."
                    value={newQuickPromptText}
                    onChange={(e) => setNewQuickPromptText(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-xs font-mono focus:border-indigo-400 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('installed')}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-hud font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-500/25 cursor-pointer"
                >
                  Install Custom Feature
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
