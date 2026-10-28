import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Task, Priority, TaskStatus } from '../types';
import { TaskModal } from './TaskModal';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Plus,
  Filter,
  Search,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Sparkles,
  Calendar,
  FileCheck2,
  TrendingUp,
  User as UserIcon,
  Quote,
  MoreVertical,
} from 'lucide-react';

export const TaskDashboard: React.FC = () => {
  const { tasks, decisions, teamMembers, toggleTaskComplete, deleteTask, updateTask } = useWorkspace();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Metrics calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed || t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const urgentTasks = tasks.filter((t) => (t.priority === 'urgent' || t.priority === 'high') && !t.completed).length;
  const aiExtractedCount = tasks.filter((t) => t.source === 'ai_extracted').length;

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (filterAssignee !== 'all') {
      if (filterAssignee === 'unassigned' && task.assigneeName) return false;
      if (filterAssignee !== 'unassigned' && task.assigneeId !== filterAssignee && task.assigneeName !== filterAssignee) return false;
    }
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    if (filterSource !== 'all' && task.source !== filterSource) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description.toLowerCase().includes(q);
      const matchAssignee = (task.assigneeName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAssignee) return false;
    }
    return true;
  });

  const kanbanColumns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'backlog', label: 'Backlog', color: 'border-slate-700' },
    { status: 'todo', label: 'To Do', color: 'border-blue-500/40' },
    { status: 'in_progress', label: 'In Progress', color: 'border-amber-500/40' },
    { status: 'review', label: 'Review', color: 'border-purple-500/40' },
    { status: 'completed', label: 'Completed', color: 'border-emerald-500/40' },
  ];

  const handleEdit = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setTaskToEdit(null);
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-y-auto">
      {/* Header Bar */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/50 space-y-5 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
              <span>Project Dashboard & Tasks</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {completedTasks}/{totalTasks} Done
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Synchronized workboard connecting conversation intelligence to validated task execution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNew}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* 6 Metric Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Tasks
            </span>
            <div className="text-xl font-black text-slate-100 mt-1">{totalTasks}</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">{aiExtractedCount} AI-extracted</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
              Pending
            </span>
            <div className="text-xl font-black text-amber-300 mt-1">{pendingTasks}</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Active sprint items</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block">
              Completed
            </span>
            <div className="text-xl font-black text-emerald-300 mt-1">{completedTasks}</div>
            <span className="text-[10px] text-emerald-400/80 mt-0.5 block">
              {totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}% velocity
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider block">
              Urgent / High
            </span>
            <div className="text-xl font-black text-rose-300 mt-1">{urgentTasks}</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Priority focus</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] font-semibold text-teal-400 uppercase tracking-wider block">
              Decisions
            </span>
            <div className="text-xl font-black text-teal-300 mt-1">{decisions.length}</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Confirmed & logged</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider block">
              Sprint Deadline
            </span>
            <div className="text-xs font-bold text-purple-300 mt-1.5 truncate">Oct 30, 6:00 PM</div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Judging rehearsal</span>
          </div>
        </div>

        {/* Filters and View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks or tags..."
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-44 sm:w-56"
              />
            </div>

            {/* Assignee Filter */}
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Assignees</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="backlog">Backlog</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Source Filter */}
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="ai_extracted">✨ AI Extracted</option>
              <option value="manual">Manual</option>
            </select>
          </div>

          {/* Kanban vs List toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-x-auto">
        {viewMode === 'kanban' ? (
          /* Kanban Board View */
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 min-w-[950px] items-start">
            {kanbanColumns.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.status);

              return (
                <div
                  key={col.status}
                  className="rounded-2xl bg-slate-950/70 border border-slate-800/80 p-3 space-y-3 flex flex-col min-h-[450px]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-bold text-slate-200 tracking-wide">
                      {col.label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1">
                    {colTasks.length === 0 ? (
                      <div className="h-28 flex items-center justify-center text-[11px] text-slate-600 italic">
                        Empty column
                      </div>
                    ) : (
                      colTasks.map((task) => (
                        <div
                          key={task.id}
                          className={`p-3 rounded-xl border bg-slate-900/90 transition-all hover:border-slate-700 shadow-sm space-y-2.5 ${
                            task.completed ? 'opacity-60 bg-slate-950/80' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={Boolean(task.completed)}
                              onChange={() => toggleTaskComplete(task.id)}
                              className="w-4 h-4 mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer accent-emerald-500"
                            />
                            <div className="flex-1 min-w-0">
                              <h4
                                className={`text-xs font-bold leading-snug cursor-pointer ${
                                  task.completed ? 'line-through text-slate-500' : 'text-slate-100 hover:text-emerald-300'
                                }`}
                                onClick={() => handleEdit(task)}
                              >
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Chips */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
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

                            {task.source === 'ai_extracted' && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" />
                                {task.confidence ? `${Math.round(task.confidence * 100)}%` : 'AI'}
                              </span>
                            )}

                            {task.sourceMessageIds && task.sourceMessageIds.length > 0 && (
                              <span className="px-1.5 py-0.2 rounded text-[8px] font-mono bg-slate-950 text-slate-400 border border-slate-800" title={`Evidence from ${task.sourceMessageIds.join(', ')}`}>
                                {task.sourceMessageIds[0]}
                              </span>
                            )}
                          </div>

                          {/* Assignee & Deadline Row */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
                            <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                              {task.assigneeAvatar ? (
                                <img
                                  src={task.assigneeAvatar}
                                  alt={task.assigneeName || ''}
                                  className="w-4 h-4 rounded-full object-cover"
                                />
                              ) : (
                                <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                              )}
                              <span className="truncate">{task.assigneeName || 'Unassigned'}</span>
                            </div>

                            <div className="flex items-center gap-1 text-slate-500">
                              <button
                                onClick={() => handleEdit(task)}
                                className="p-1 hover:text-slate-200 transition-colors"
                                title="Edit task"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => deleteTask(task.id)}
                                className="p-1 hover:text-rose-400 transition-colors"
                                title="Delete task"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Quick Status Dropdown */}
                          <div className="pt-1">
                            <select
                              value={task.status}
                              onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
                              className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-400 focus:outline-none"
                            >
                              <option value="backlog">Move to Backlog</option>
                              <option value="todo">Move to To Do</option>
                              <option value="in_progress">Move to In Progress</option>
                              <option value="review">Move to Review</option>
                              <option value="completed">Move to Completed</option>
                            </select>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List Table View */
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/70 shadow-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 pl-4 pr-2 w-8"></th>
                  <th className="py-3.5 px-3">Task Title & Description</th>
                  <th className="py-3.5 px-3">Assignee</th>
                  <th className="py-3.5 px-3">Deadline</th>
                  <th className="py-3.5 px-3">Priority</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Source</th>
                  <th className="py-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                      No matching tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      className={`hover:bg-slate-900/50 transition-colors ${
                        task.completed ? 'opacity-60 bg-slate-950/40' : ''
                      }`}
                    >
                      <td className="py-3 pl-4 pr-2">
                        <input
                          type="checkbox"
                          checked={Boolean(task.completed)}
                          onChange={() => toggleTaskComplete(task.id)}
                          className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer accent-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <div
                          className={`font-semibold cursor-pointer ${
                            task.completed ? 'line-through text-slate-500' : 'text-slate-100 hover:text-emerald-300'
                          }`}
                          onClick={() => handleEdit(task)}
                        >
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {task.assigneeAvatar ? (
                            <img
                              src={task.assigneeAvatar}
                              alt={task.assigneeName || ''}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-4 h-4 text-slate-500" />
                          )}
                          <span className="truncate">{task.assigneeName || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-400">
                        {task.deadline || 'No deadline'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            task.priority === 'urgent'
                              ? 'bg-rose-500/20 text-rose-300'
                              : task.priority === 'high'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={task.status}
                          onChange={(e) => updateTask(task.id, { status: e.target.value as TaskStatus })}
                          className="px-2 py-1 rounded bg-slate-900 border border-slate-750 text-xs text-slate-200 focus:outline-none"
                        >
                          <option value="backlog">Backlog</option>
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="review">Review</option>
                          <option value="completed">Completed</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        {task.source === 'ai_extracted' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 w-fit">
                            <Sparkles className="w-3 h-3" />
                            AI Validated
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Manual</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1 text-slate-400">
                          <button
                            onClick={() => handleEdit(task)}
                            className="p-1 hover:text-slate-200 transition-colors"
                            title="Edit task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-1 hover:text-rose-400 transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        taskToEdit={taskToEdit}
      />
    </div>
  );
};
