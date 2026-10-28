import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Decision, DecisionStatus } from '../types';
import {
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Quote,
  Hash,
  Clock,
  Sparkles,
  Search,
  X,
  Filter,
} from 'lucide-react';

export const DecisionsView: React.FC = () => {
  const { decisions, channels, createDecision } = useWorkspace();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newRationale, setNewRationale] = useState('');
  const [newStatus, setNewStatus] = useState<DecisionStatus>('confirmed');
  const [newEvidence, setNewEvidence] = useState('');

  const filteredDecisions = decisions.filter((d) => {
    if (filterStatus !== 'all' && d.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        (d.description || d.rationale || '').toLowerCase().includes(q) ||
        (d.evidenceSnippet || d.evidence || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createDecision({
      title: newTitle.trim(),
      rationale: newRationale.trim(),
      status: newStatus,
      evidence: newEvidence.trim() || 'Logged manually by team',
    });
    setNewTitle('');
    setNewRationale('');
    setNewEvidence('');
    setIsModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/50 space-y-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
              <span>Decisions & Architecture Log</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {decisions.length} Total
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Audit trail of confirmed technical agreements, model selections, and operational choices.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Record Decision</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search decisions or keywords..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-52 sm:w-64"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="proposed">Proposed / Under Review</option>
            <option value="deprecated">Deprecated</option>
          </select>
        </div>
      </div>

      {/* Decisions List */}
      <div className="flex-1 p-6 space-y-4 max-w-5xl mx-auto w-full">
        {filteredDecisions.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-xs">
            No decisions matching current filter criteria.
          </div>
        ) : (
          filteredDecisions.map((dec) => {
            const isConfirmed = dec.status === 'confirmed';
            const channel = channels.find((c) => c.id === dec.channelId);

            return (
              <div
                key={dec.id}
                className={`p-5 rounded-2xl border bg-slate-950/80 shadow-md space-y-3 transition-colors ${
                  isConfirmed ? 'border-emerald-500/30' : 'border-amber-500/30'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isConfirmed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {dec.status}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100">{dec.title}</h3>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    {channel && (
                      <span className="flex items-center gap-1 font-mono text-emerald-400">
                        <Hash className="w-3 h-3" />
                        {channel.name}
                      </span>
                    )}
                    <span>{new Date(dec.createdAt || (dec as any).timestamp || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-['Plus_Jakarta_Sans']">
                  {dec.description || dec.rationale}
                </p>

                {(dec.evidenceSnippet || dec.evidence) && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-2 text-xs text-slate-300 italic">
                    <Quote className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block not-italic mb-0.5">
                        Supporting Evidence:
                      </span>
                      <span>"{dec.evidenceSnippet || dec.evidence}"</span>
                    </div>
                  </div>
                )}

                {dec.sourceMessageIds && dec.sourceMessageIds.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span>Evidence Message IDs:</span>
                    {dec.sourceMessageIds.map((id) => (
                      <span key={id} className="font-mono text-emerald-400/80 bg-slate-900 px-1 py-0.2 rounded border border-slate-800">
                        {id}
                      </span>
                    ))}
                  </div>
                )}

                {dec.confidence && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      AI Validation Confidence
                    </span>
                    <span className="font-mono font-semibold text-emerald-400">
                      {Math.round(dec.confidence * 100)}%
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Record Decision Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-750 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 mb-3">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
              Record Project Decision
            </h3>
            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Decision Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Choose Random Forest over SVM"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Rationale & Technical Trade-offs
                </label>
                <textarea
                  rows={3}
                  required
                  value={newRationale}
                  onChange={(e) => setNewRationale(e.target.value)}
                  placeholder="Why was this decision made? What were the benchmark comparisons?"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as DecisionStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="proposed">Proposed</option>
                    <option value="deprecated">Deprecated</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Evidence</label>
                  <input
                    type="text"
                    value={newEvidence}
                    onChange={(e) => setNewEvidence(e.target.value)}
                    placeholder="e.g. 5-fold CV test results"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
