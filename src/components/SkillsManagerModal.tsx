import React, { useState } from 'react';
import { AnthropicSkill } from '../types';
import { X, Sparkles, Plus, ShieldAlert, FileText, Cpu, Code2, Trash2, Power, Check, BookOpen } from 'lucide-react';

interface SkillsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  skills: AnthropicSkill[];
  onAddSkill: (skill: AnthropicSkill) => void;
  onToggleSkill: (id: string) => void;
  onDeleteSkill: (id: string) => void;
}

export const SkillsManagerModal: React.FC<SkillsManagerModalProps> = ({
  isOpen,
  onClose,
  skills,
  onAddSkill,
  onToggleSkill,
  onDeleteSkill,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'create'>('library');

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'utility' | 'analysis' | 'creativity' | 'system' | 'custom'>('custom');
  const [systemPromptContribution, setSystemPromptContribution] = useState('');
  const [paramName, setParamName] = useState('inputQuery');
  const [paramDesc, setParamDesc] = useState('Input query or task context');

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !systemPromptContribution.trim()) return;

    const newSkill: AnthropicSkill = {
      id: `skill-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      version: '1.0.0',
      author: 'User Custom Core',
      category,
      icon: 'Sparkles',
      isEnabled: true,
      handlerType: 'gemini_prompt',
      systemPromptContribution: systemPromptContribution.trim(),
      inputSchema: {
        type: 'object',
        properties: {
          [paramName.trim() || 'query']: {
            type: 'string',
            description: paramDesc.trim() || 'Input data for skill',
          },
        },
        required: [paramName.trim() || 'query'],
      },
    };

    onAddSkill(newSkill);
    setName('');
    setDescription('');
    setSystemPromptContribution('');
    setActiveTab('library');
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'analysis':
        return 'bg-blue-950/80 text-blue-300 border-blue-500/30';
      case 'creativity':
        return 'bg-pink-950/80 text-pink-300 border-pink-500/30';
      case 'system':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30';
      case 'utility':
      default:
        return 'bg-purple-950/80 text-purple-300 border-purple-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="w-full max-w-3xl backdrop-blur-2xl bg-slate-950/85 rounded-3xl border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-hud tracking-widest text-white uppercase">
                Anthropic Skills Architecture
              </h2>
              <p className="text-xs font-mono text-indigo-300/80">
                Extend Kyrsten with specialized skills, prompt blueprints, and custom handlers
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
            onClick={() => setActiveTab('library')}
            className={`py-3 font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'library'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Installed Skills ({skills.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 font-semibold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'create'
                ? 'border-indigo-400 text-indigo-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Create New Skill</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans">
          {activeTab === 'library' ? (
            <div className="space-y-4">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className={`p-4 rounded-xl border transition-all ${
                    skill.isEnabled
                      ? 'bg-slate-900/80 border-purple-500/30 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-100 font-hud text-base">
                          {skill.name}
                        </h3>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase border ${getCategoryBadge(
                            skill.category
                          )}`}
                        >
                          {skill.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          v{skill.version}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300">{skill.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onToggleSkill(skill.id)}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          skill.isEnabled
                            ? 'bg-purple-950/80 border-purple-500/40 text-purple-300'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                        title={skill.isEnabled ? 'Disable skill' : 'Enable skill'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>

                      {skill.author === 'User Custom Core' && (
                        <button
                          onClick={() => onDeleteSkill(skill.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title="Delete skill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* System Prompt Instruction Contribution */}
                  <div className="mt-3 pt-3 border-t border-slate-800 font-mono text-xs">
                    <span className="text-slate-400 text-[11px] block mb-1">
                      System Instruction Injection:
                    </span>
                    <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-purple-200 whitespace-pre-wrap text-[11px] max-h-28 overflow-y-auto">
                      {skill.systemPromptContribution}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">SKILL NAME</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Legal Contract Analyzer, Pitch Deck Synthesizer"
                  required
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-slate-100 placeholder:text-slate-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">CATEGORY</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-slate-100 bg-slate-900"
                  >
                    <option value="utility">Utility</option>
                    <option value="analysis">Analysis & Reasoning</option>
                    <option value="creativity">Creativity & Lore</option>
                    <option value="system">System Operations</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">INPUT PARAMETER NAME</label>
                  <input
                    type="text"
                    value={paramName}
                    onChange={(e) => setParamName(e.target.value)}
                    placeholder="e.g. targetContent, codeBlock"
                    className="w-full glass-input px-3.5 py-2.5 rounded-xl text-slate-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">DESCRIPTION</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this skill enables Kyrsten to do..."
                  required
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-slate-100 placeholder:text-slate-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-semibold">
                  SYSTEM PROMPT BLUEPRINT & BEHAVIOR
                </label>
                <textarea
                  value={systemPromptContribution}
                  onChange={(e) => setSystemPromptContribution(e.target.value)}
                  rows={4}
                  placeholder="Define the specific instructions, output format, or persona rules that Kyrsten will execute when this skill is invoked..."
                  required
                  className="w-full glass-input px-3.5 py-2.5 rounded-xl text-slate-100 placeholder:text-slate-600 resize-none font-sans text-xs"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('library')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                >
                  Install Skill
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
