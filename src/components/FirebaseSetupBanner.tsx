import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Database, ShieldCheck, AlertCircle, ExternalLink, X, CheckCircle, Info } from 'lucide-react';

export const FirebaseSetupBanner: React.FC = () => {
  const { firebaseStatus } = useWorkspace();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (isDismissed) return null;

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-b border-emerald-500/20 px-4 py-2 text-xs flex items-center justify-between gap-3 text-slate-300">
        <div className="flex items-center gap-2.5 min-w-0">
          {firebaseStatus.isConfigured ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <ShieldCheck className="w-3.5 h-3.5" />
              Firebase Connected ({firebaseStatus.projectId})
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-amber-400 font-medium flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <Database className="w-3.5 h-3.5" />
              Local Storage Demo Mode
            </span>
          )}
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="truncate text-slate-300">
            {firebaseStatus.isConfigured
              ? 'Multi-user Firestore synchronization & Google Auth are active.'
              : 'Firebase is not yet configured. Running in Local Hackathon Demo Mode with browser persistence & server-side Gemini AI.'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowModal(true)}
            className="text-emerald-400 hover:text-emerald-300 font-medium underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-colors"
          >
            Details & Status
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-slate-400 hover:text-slate-200 p-0.5 rounded transition-colors"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Persistence & Authentication Status</h3>
                <p className="text-xs text-slate-400">CollabAI data storage architecture</p>
              </div>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Google Gemini 3.8 Flash API:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Active (Server-Side Proxy)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Workspace Data Persistence:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Active (Browser Storage)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Firebase Firestore & Auth:</span>
                  <span className={firebaseStatus.isConfigured ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                    {firebaseStatus.isConfigured ? `Connected (${firebaseStatus.projectId})` : 'Awaiting Configuration'}
                  </span>
                </div>
              </div>

              {!firebaseStatus.isConfigured ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="flex items-start gap-2 text-amber-300 text-xs">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Notice on Database Persistence</span>
                      CollabAI is transparently operating in Local Hackathon Mode. All new messages, AI analyses, manual tasks, and decisions are preserved in your browser session.
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 pl-6">
                    To activate cloud-synchronized persistence and real Google Sign-in across multiple team members, Firebase can be provisioned through the AI Studio environment.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Cloud Firestore is Active
                  </div>
                  <p className="text-slate-400 pl-6">
                    Project workspaces and tasks are synchronized with project <span className="font-mono text-emerald-300">{firebaseStatus.projectId}</span> under hardened ABAC security rules.
                  </p>
                </div>
              )}

              <div className="text-xs text-slate-400 space-y-1.5 pt-2 border-t border-slate-800">
                <span className="font-semibold text-slate-300 block">Demonstration Ready Features:</span>
                <ul className="list-disc list-inside space-y-1 pl-1 text-slate-400">
                  <li>AI Conversation Analysis extracting decisions, tasks, confidence, and questions</li>
                  <li>Validation flow: Approve & modify tasks before committing to board</li>
                  <li>Interactive task management (Kanban, List, filters, priority)</li>
                  <li>Sample ML capstone scenario (Random Forest vs SVM, dataset hygiene, evaluation)</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                Close & Return to Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
