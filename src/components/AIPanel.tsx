import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  FileText,
  ChevronRight,
  Edit2,
  Check,
  X,
  ShieldCheck,
  Quote,
  Loader2,
  ThumbsDown,
  UserPlus,
  RotateCcw,
  Tag,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { SuggestedTask, Priority, DetectedDecision, Question } from '../types';

export const AIPanel: React.FC = () => {
  const {
    currentAnalysis,
    isAnalyzing,
    analyzeCurrentChannel,
    approveProposedTask,
    rejectProposedTask,
    editProposedTask,
    toggleApproveSuggestedTask,
    commitApprovedTasks,
    confirmDecision,
    editDecision,
    supersedeDecision,
    assignQuestionOwner,
    resolveQuestion,
    keepQuestionOpen,
    teamMembers,
  } = useWorkspace();

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<Partial<SuggestedTask>>({});

  const [editingDecId, setEditingDecId] = useState<string | null>(null);
  const [editDecForm, setEditDecForm] = useState<Partial<DetectedDecision>>({});

  const [assigningQuestionId, setAssigningQuestionId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const startEditTask = (task: SuggestedTask) => {
    setEditingTaskId(task.taskId || task.id);
    setEditTaskForm({
      title: task.title,
      description: task.description,
      assigneeId: task.assigneeId,
      suggestedAssignee: task.suggestedAssignee,
      deadline: task.deadline,
      priority: task.priority,
    });
  };

  const saveEditTask = (taskId: string) => {
    editProposedTask(taskId, editTaskForm);
    setEditingTaskId(null);
  };

  const startEditDec = (dec: DetectedDecision) => {
    setEditingDecId(dec.decisionId || dec.id);
    setEditDecForm({
      title: dec.title,
      description: dec.description,
      status: dec.status,
    });
  };

  const saveEditDec = (decId: string) => {
    editDecision(decId, editDecForm);
    setEditingDecId(null);
  };

  const proposedTasks = currentAnalysis?.proposedTasks || currentAnalysis?.tasks || [];
  const approvedCount = proposedTasks.filter((t) => t.approved).length;

  if (isCollapsed) {
    return (
      <div className="w-12 bg-slate-950 border-l border-slate-800 flex flex-col items-center py-4 gap-4 flex-shrink-0">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer"
          title="Expand CollabAI Intelligence Panel"
        >
          <Sparkles className="w-5 h-5" />
        </button>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">
          CollabAI Intelligence
        </span>
      </div>
    );
  }

  return (
    <aside className="w-80 lg:w-96 bg-slate-950 border-l border-slate-800/90 flex flex-col h-full flex-shrink-0 overflow-hidden select-none">
      {/* Panel Header */}
      <div className="h-14 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>CollabAI Intelligence</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-emerald-500/20 text-emerald-400">
                Review Engine
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              {currentAnalysis ? `Analyzed #${currentAnalysis.channelName}` : 'Continuous Workspace Reasoning'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCollapsed(true)}
          className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          title="Collapse panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Panel Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* If no analysis exists yet */}
        {!currentAnalysis && !isAnalyzing && (
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-200">Ready to Analyze Conversation</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Click "Run Conversation Analysis" to extract confirmed decisions, proposed tasks with evidence IDs, and unresolved questions into this review workspace.
              </p>
            </div>
            <button
              onClick={analyzeCurrentChannel}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run Conversation Analysis</span>
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isAnalyzing && (
          <div className="p-8 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-center space-y-3 animate-pulse">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
            <h4 className="text-xs font-bold text-slate-200">Analyzing with Gemini Intelligence...</h4>
            <p className="text-[11px] text-slate-400">
              Validating message ID evidence, matching workspace member identities, and filtering duplicate tasks...
            </p>
          </div>
        )}

        {/* Structured Results Sections */}
        {currentAnalysis && (
          <>
            {/* 1. CONVERSATION SUMMARY */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  Conversation Summary
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {currentAnalysis.messageCount} msgs
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed font-['Plus_Jakarta_Sans'] shadow-sm">
                {currentAnalysis.summary}
              </div>
            </div>

            {/* 2. DECISIONS REVIEW (Confirm, Edit, Supersede) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  Decisions Detected ({currentAnalysis.decisions.length})
                </span>
                <span className="text-[10px] text-slate-500">Confirm / Supersede</span>
              </div>

              {currentAnalysis.decisions.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-500 italic">
                  No explicit decisions finalized yet in this thread.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {currentAnalysis.decisions.map((dec) => {
                    const decId = dec.decisionId || dec.id;
                    const isConfirmed = dec.status === 'confirmed';
                    const isSuperseded = dec.status === 'superseded';
                    const isEditing = editingDecId === decId;

                    if (isEditing) {
                      return (
                        <div key={decId} className="p-3 rounded-xl bg-slate-900 border border-emerald-500/50 space-y-2">
                          <label className="text-[9px] font-semibold text-slate-400 uppercase">Title</label>
                          <input
                            type="text"
                            value={editDecForm.title || ''}
                            onChange={(e) => setEditDecForm({ ...editDecForm, title: e.target.value })}
                            className="w-full px-2 py-1 text-xs rounded bg-slate-950 border border-slate-750 text-slate-200"
                          />
                          <label className="text-[9px] font-semibold text-slate-400 uppercase">Description</label>
                          <textarea
                            rows={2}
                            value={editDecForm.description || ''}
                            onChange={(e) => setEditDecForm({ ...editDecForm, description: e.target.value })}
                            className="w-full px-2 py-1 text-xs rounded bg-slate-950 border border-slate-750 text-slate-200 resize-none"
                          />
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              onClick={() => setEditingDecId(null)}
                              className="px-2 py-1 text-[11px] text-slate-400"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEditDec(decId)}
                              className="px-3 py-1 rounded bg-emerald-600 text-white text-[11px] font-semibold"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={decId}
                        className={`p-3 rounded-xl border transition-all ${
                          isConfirmed
                            ? 'bg-emerald-950/20 border-emerald-500/40'
                            : isSuperseded
                            ? 'bg-slate-950/60 border-slate-800 opacity-60'
                            : 'bg-amber-950/20 border-amber-500/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className={`text-xs font-bold leading-snug ${isSuperseded ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {dec.title}
                          </h5>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${
                              isConfirmed
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isSuperseded
                                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {dec.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                          {dec.description}
                        </p>

                        {/* Confirmation requirements if any */}
                        {dec.confirmationRequirements && (
                          <div className="mt-2 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 flex items-start gap-1">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                            <span>{dec.confirmationRequirements}</span>
                          </div>
                        )}

                        {/* Evidence quote */}
                        {dec.evidenceSnippet && (
                          <div className="mt-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-start gap-1.5 text-[10px] text-slate-300 italic">
                            <Quote className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
                            <span className="line-clamp-2">"{dec.evidenceSnippet}"</span>
                          </div>
                        )}

                        {/* Message ID Evidence Tag */}
                        {dec.sourceMessageIds && dec.sourceMessageIds.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                            <Tag className="w-2.5 h-2.5" />
                            <span>Evidence IDs:</span>
                            {dec.sourceMessageIds.map((id) => (
                              <span key={id} className="font-mono text-emerald-400/80 bg-slate-900 px-1 py-0.2 rounded border border-slate-800">
                                {id}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Decision Review Action Toolbar (Confirm, Edit, Supersede) */}
                        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/80 text-[10px]">
                          <span className="text-slate-500 font-mono">
                            Conf: {Math.round(dec.confidence * 100)}%
                          </span>

                          <div className="flex items-center gap-1.5">
                            {!isConfirmed && (
                              <button
                                onClick={() => confirmDecision(decId)}
                                className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-colors"
                                title="Confirm this decision officially"
                              >
                                <Check className="w-3 h-3" />
                                <span>Confirm</span>
                              </button>
                            )}

                            <button
                              onClick={() => startEditDec(dec)}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                              title="Edit decision text"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                              <span>Edit</span>
                            </button>

                            {!isSuperseded && (
                              <button
                                onClick={() => supersedeDecision(decId)}
                                className="px-2 py-0.5 rounded bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                                title="Mark this decision as superseded"
                              >
                                <span>Supersede</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. PROPOSED TASKS REVIEW (Approve, Edit, Reject) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Proposed Tasks ({proposedTasks.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  {approvedCount} selected
                </span>
              </div>

              {proposedTasks.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-500 italic">
                  All proposed tasks have been reviewed and approved!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {proposedTasks.map((task) => {
                    const taskId = task.taskId || task.id;
                    const isEditing = editingTaskId === taskId;

                    if (isEditing) {
                      return (
                        <div key={taskId} className="p-3 rounded-xl bg-slate-900 border border-emerald-500/50 space-y-2.5">
                          <div>
                            <label className="text-[9px] font-semibold text-slate-400 uppercase">Title</label>
                            <input
                              type="text"
                              value={editTaskForm.title || ''}
                              onChange={(e) => setEditTaskForm({ ...editTaskForm, title: e.target.value })}
                              className="w-full px-2.5 py-1 text-xs rounded bg-slate-950 border border-slate-750 text-slate-200 focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-semibold text-slate-400 uppercase">Description</label>
                            <textarea
                              rows={2}
                              value={editTaskForm.description || ''}
                              onChange={(e) => setEditTaskForm({ ...editTaskForm, description: e.target.value })}
                              className="w-full px-2.5 py-1 text-xs rounded bg-slate-950 border border-slate-750 text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-semibold text-slate-400 uppercase">Assignee</label>
                              <select
                                value={editTaskForm.assigneeId || ''}
                                onChange={(e) => {
                                  const selectedId = e.target.value || null;
                                  const selectedMember = teamMembers.find((m) => m.id === selectedId);
                                  setEditTaskForm({
                                    ...editTaskForm,
                                    assigneeId: selectedId,
                                    suggestedAssignee: selectedMember ? selectedMember.name : null,
                                  });
                                }}
                                className="w-full px-2 py-1 text-xs rounded bg-slate-950 border border-slate-750 text-slate-200 focus:outline-none"
                              >
                                <option value="">-- Unassigned --</option>
                                {teamMembers.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] font-semibold text-slate-400 uppercase">Priority</label>
                              <select
                                value={editTaskForm.priority || 'medium'}
                                onChange={(e) => setEditTaskForm({ ...editTaskForm, priority: e.target.value as Priority })}
                                className="w-full px-2 py-1 text-xs rounded bg-slate-950 border border-slate-750 text-slate-200 focus:outline-none"
                              >
                                <option value="urgent">Urgent</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-[9px] font-semibold text-slate-400 uppercase">Deadline</label>
                            <input
                              type="text"
                              value={editTaskForm.deadline || ''}
                              placeholder="e.g. Thursday 3 PM"
                              onChange={(e) => setEditTaskForm({ ...editTaskForm, deadline: e.target.value || null })}
                              className="w-full px-2.5 py-1 text-xs rounded bg-slate-950 border border-slate-750 text-slate-200 focus:outline-none"
                            />
                          </div>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              onClick={() => setEditingTaskId(null)}
                              className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-200"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => saveEditTask(taskId)}
                              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={taskId}
                        className={`p-3 rounded-xl border transition-all ${
                          task.approved
                            ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={Boolean(task.approved)}
                            onChange={() => toggleApproveSuggestedTask(taskId)}
                            className="w-4 h-4 mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer accent-emerald-500"
                            id={`check_${taskId}`}
                          />
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={`check_${taskId}`}
                              className="text-xs font-bold text-slate-200 block hover:text-white cursor-pointer leading-snug"
                            >
                              {task.title}
                            </label>
                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                              {task.description}
                            </p>

                            {/* Meta Tags */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {task.assigneeId ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium text-slate-300">
                                  <UserCheck className="w-3 h-3 text-emerald-400" />
                                  {teamMembers.find((m) => m.id === task.assigneeId)?.name || task.suggestedAssignee}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-400">
                                  <AlertTriangle className="w-3 h-3" />
                                  Unassigned
                                </span>
                              )}

                              {task.deadline ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-medium text-slate-300">
                                  <Clock className="w-3 h-3 text-teal-400" />
                                  {task.deadline}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-850 text-[10px] text-slate-500">
                                  No Deadline
                                </span>
                              )}

                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                  task.priority === 'urgent'
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : task.priority === 'high'
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {task.priority}
                              </span>
                            </div>

                            {/* Missing information warning */}
                            {task.missingInformation && (
                              <div className="mt-2 text-[10px] text-amber-300 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20 flex items-start gap-1">
                                <AlertCircle className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                                <span>{task.missingInformation}</span>
                              </div>
                            )}

                            {/* Evidence snippet */}
                            {task.evidenceSnippet && (
                              <div className="mt-2 text-[10px] text-slate-400 bg-slate-950/60 p-1.5 rounded-lg border border-slate-850 flex items-start gap-1">
                                <Quote className="w-2.5 h-2.5 text-slate-500 flex-shrink-0 mt-0.5" />
                                <span className="italic line-clamp-1">"{task.evidenceSnippet}"</span>
                              </div>
                            )}

                            {/* Source Message IDs */}
                            {task.sourceMessageIds && task.sourceMessageIds.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5 text-[9px] text-slate-500">
                                <Tag className="w-2.5 h-2.5" />
                                <span>Evidence IDs:</span>
                                {task.sourceMessageIds.map((id) => (
                                  <span key={id} className="font-mono text-emerald-400/80 bg-slate-950 px-1 py-0.2 rounded border border-slate-850">
                                    {id}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Action Buttons for Task: Approve, Edit, Reject */}
                            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60">
                              <span className="text-[10px] text-slate-500 font-mono">
                                Conf: {Math.round(task.confidence * 100)}%
                              </span>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => approveProposedTask(taskId)}
                                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                                  title="Approve and add directly to project board"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve</span>
                                </button>

                                <button
                                  onClick={() => startEditTask(task)}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Edit task details"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  onClick={() => rejectProposedTask(taskId)}
                                  className="px-2 py-0.5 rounded bg-slate-850 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Reject proposed task"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. UNRESOLVED QUESTIONS (Assign Owner, Mark Resolved, Keep Open) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  Unresolved Questions ({currentAnalysis.unresolvedQuestions.length})
                </span>
                <span className="text-[10px] text-amber-400 font-semibold">Missing Info</span>
              </div>

              {currentAnalysis.unresolvedQuestions.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-500 italic">
                  No blocking questions identified. Conversation is clear and actionable.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {currentAnalysis.unresolvedQuestions.map((q) => {
                    const isResolved = q.status === 'resolved';

                    return (
                      <div
                        key={q.id}
                        className={`p-3 rounded-xl border space-y-2 transition-all ${
                          isResolved
                            ? 'bg-slate-950/60 border-slate-800 opacity-60'
                            : 'bg-slate-900/90 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h5 className={`text-xs font-bold leading-snug ${isResolved ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {q.question}
                          </h5>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {q.category && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-semibold bg-slate-800 text-slate-400">
                                {q.category === 'explicitly_asked' ? 'Direct' : 'Gap'}
                              </span>
                            )}
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                q.urgency === 'high'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {q.urgency}
                            </span>
                          </div>
                        </div>

                        {q.context && (
                          <p className="text-[11px] text-slate-400 leading-relaxed">{q.context}</p>
                        )}

                        {q.suggestedNextStep && (
                          <div className="text-[10px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                            <span className="font-semibold block">Suggested Next Action:</span>
                            {q.suggestedNextStep}
                          </div>
                        )}

                        {/* Owner Badge */}
                        {q.ownerName && (
                          <div className="text-[10px] text-teal-300 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-teal-400" />
                            <span>Assigned Owner: <strong>{q.ownerName}</strong></span>
                          </div>
                        )}

                        {/* Action buttons: Assign Owner, Mark Resolved, Keep Open */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[10px]">
                          {assigningQuestionId === q.id ? (
                            <div className="flex items-center gap-1 w-full">
                              <select
                                onChange={(e) => {
                                  const memberId = e.target.value;
                                  const member = teamMembers.find((m) => m.id === memberId);
                                  if (member) {
                                    assignQuestionOwner(q.id, member.id, member.name);
                                  }
                                  setAssigningQuestionId(null);
                                }}
                                className="px-2 py-1 rounded bg-slate-950 border border-slate-750 text-slate-200 text-[10px] flex-1"
                              >
                                <option value="">Select team member...</option>
                                {teamMembers.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} ({m.role})
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => setAssigningQuestionId(null)}
                                className="px-1.5 py-1 text-slate-400 hover:text-slate-200"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 ml-auto">
                              <button
                                onClick={() => setAssigningQuestionId(q.id)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <UserPlus className="w-2.5 h-2.5 text-teal-400" />
                                <span>{q.ownerName ? 'Change Owner' : 'Assign Owner'}</span>
                              </button>

                              {!isResolved ? (
                                <button
                                  onClick={() => resolveQuestion(q.id)}
                                  className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Mark Resolved</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => keepQuestionOpen(q.id)}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                                >
                                  <RotateCcw className="w-2.5 h-2.5" />
                                  <span>Re-open</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5. TEAM INSIGHTS & OBSERVATIONS */}
            {currentAnalysis.teamInsights && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                  Team Insights & Workload
                </span>
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Collaboration Dynamics:</span>
                    <span className="font-semibold text-emerald-400 capitalize">
                      {currentAnalysis.teamInsights.sentiment}
                    </span>
                  </div>

                  {currentAnalysis.teamInsights.workloadDistribution && (
                    <div className="text-[11px] text-slate-300">
                      <span className="text-slate-400 block mb-0.5 font-semibold">Workload Balance:</span>
                      {currentAnalysis.teamInsights.workloadDistribution}
                    </div>
                  )}

                  {currentAnalysis.teamInsights.observations && currentAnalysis.teamInsights.observations.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                        Observations:
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1">
                        {currentAnalysis.teamInsights.observations.map((obs, i) => (
                          <li key={i}>{obs}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {currentAnalysis.teamInsights.collaborationGaps && currentAnalysis.teamInsights.collaborationGaps.length > 0 && (
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3 h-3" /> Collaboration Gaps:
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-amber-200/90 space-y-0.5">
                        {currentAnalysis.teamInsights.collaborationGaps.map((gap, i) => (
                          <li key={i}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Key Topics:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {currentAnalysis.teamInsights.keyTopics.map((topic, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px]"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Sticky Action Bar: Batch Commit Approved Tasks */}
      {currentAnalysis && proposedTasks.length > 0 && (
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/95 flex-shrink-0 space-y-2">
          <button
            onClick={commitApprovedTasks}
            disabled={approvedCount === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-98 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Validate & Add to Board ({approvedCount} approved)</span>
          </button>
          <p className="text-[10px] text-slate-500 text-center">
            Human approval required before any AI task is committed to project state.
          </p>
        </div>
      )}
    </aside>
  );
};
