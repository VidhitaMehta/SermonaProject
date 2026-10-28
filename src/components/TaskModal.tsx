import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Task, Priority, TaskStatus } from '../types';
import { X, CheckSquare, Calendar, User as UserIcon, Tag, AlertCircle } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, taskToEdit }) => {
  const { teamMembers, createTask, updateTask } = useWorkspace();

  const [title, setTitle] = useState(taskToEdit ? taskToEdit.title : '');
  const [description, setDescription] = useState(taskToEdit ? taskToEdit.description : '');
  const [assigneeId, setAssigneeId] = useState(taskToEdit ? taskToEdit.assigneeId || '' : '');
  const [deadline, setDeadline] = useState(taskToEdit ? taskToEdit.deadline || '' : '');
  const [priority, setPriority] = useState<Priority>(taskToEdit ? taskToEdit.priority : 'medium');
  const [status, setStatus] = useState<TaskStatus>(taskToEdit ? taskToEdit.status : 'todo');
  const [tagInput, setTagInput] = useState(taskToEdit && taskToEdit.tags ? taskToEdit.tags.join(', ') : 'Engineering');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const assignedUser = teamMembers.find((m) => m.id === assigneeId);
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (taskToEdit) {
      updateTask(taskToEdit.id, {
        title: title.trim(),
        description: description.trim(),
        assigneeId: assignedUser ? assignedUser.id : null,
        assigneeName: assignedUser ? assignedUser.name : null,
        assigneeAvatar: assignedUser ? assignedUser.avatar : null,
        deadline: deadline.trim() || null,
        priority,
        status,
        tags,
      });
    } else {
      createTask({
        title: title.trim(),
        description: description.trim(),
        assigneeId: assignedUser ? assignedUser.id : null,
        assigneeName: assignedUser ? assignedUser.name : null,
        assigneeAvatar: assignedUser ? assignedUser.avatar : null,
        deadline: deadline.trim() || null,
        priority,
        status,
        tags,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckSquare className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-100">
            {taskToEdit ? 'Edit Task' : 'Create New Task'}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Task Title <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement ROC-AUC visualization curves"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe requirements, deliverables, or technical criteria..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Unassigned --</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="urgent">🔴 Urgent</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Deadline</label>
              <input
                type="text"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                placeholder="e.g. Friday, Oct 30 at 4:00 PM"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. ML, Evaluation, SHAP"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-750 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20"
            >
              {taskToEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
