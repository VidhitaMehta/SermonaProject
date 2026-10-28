import React from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useWorkspace();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let Icon = Info;
        let borderColor = 'border-slate-700';
        let iconColor = 'text-blue-400';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          borderColor = 'border-emerald-500/40';
          iconColor = 'text-emerald-400';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          borderColor = 'border-amber-500/40';
          iconColor = 'text-amber-400';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          borderColor = 'border-rose-500/40';
          iconColor = 'text-rose-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-slate-900/95 backdrop-blur-md border ${borderColor} shadow-2xl shadow-black/60 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-semibold text-slate-100 tracking-wide uppercase">
                {toast.title}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
