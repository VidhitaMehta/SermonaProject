import React, { ReactNode } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { Loader2, ShieldCheck, ChevronRight, FileCheck2, Crosshair } from 'lucide-react';
import { Insignia } from './Insignia';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

/** "Live feed" preview on the left of the login page: chat → decision → mission. */
const FeedPreview: React.FC = () => (
  <div className="space-y-3 max-w-md">
    <div className="rounded-lg border border-slate-750 bg-slate-900/80 p-3.5 animate-fade-up">
      <div className="term text-[10px] text-slate-500 flex items-center gap-1.5">
        <ChevronRight className="w-3 h-3 text-emerald-500" /> #design · 21:04
      </div>
      <p className="text-sm text-slate-200 mt-1">
        <span className="font-semibold text-slate-100">Riya:</span> Let's lock the dark theme. Aman, can you ship the login screen by Friday?
      </p>
    </div>
    <div className="ml-8 rounded-lg border border-signal/40 bg-slate-900/80 p-3 animate-fade-up [animation-delay:150ms]">
      <div className="term text-[10px] text-signal flex items-center gap-1.5">
        <FileCheck2 className="w-3 h-3" /> DECISION LOGGED
      </div>
      <p className="text-sm font-semibold text-slate-100 mt-0.5">Use the dark theme</p>
    </div>
    <div className="ml-16 relative overflow-hidden rounded-lg border border-emerald-500/50 bg-slate-900/80 p-3 animate-fade-up [animation-delay:300ms]">
      <div className="hazard absolute left-0 top-0 bottom-0 w-1" />
      <div className="flex items-center justify-between">
        <span className="term text-[10px] text-emerald-500 flex items-center gap-1.5">
          <Crosshair className="w-3 h-3" /> MISSION · AMAN
        </span>
        <span className="term text-[10px] px-1.5 py-0.5 rounded-sm border border-amber-500/50 text-amber-400">DUE FRI</span>
      </div>
      <p className="text-sm font-semibold text-slate-100 mt-0.5">Ship the login screen</p>
    </div>
  </div>
);

/**
 * In cloud mode (Firebase configured) every user must sign in so their messages
 * carry a real identity and Firestore rules can enforce project membership.
 * In local demo mode this renders children straight away.
 */
export const AuthGate: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { mode, authReady, isSignedIn, workspaceReady, signInWithGoogle, cloudError, signOutUser, allowedEmailDomains } =
    useWorkspace();

  if (mode === 'local') return <>{children}</>;

  if (!authReady || (isSignedIn && !workspaceReady)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 text-slate-300 font-sans">
        {cloudError ? (
          <div className="hud relative max-w-md text-center space-y-3 p-8 rounded-xl border border-rose-500/40 bg-slate-900">
            <div className="hazard h-1.5 rounded-sm" />
            <p className="term text-xs uppercase tracking-[0.2em] text-rose-400">// system fault</p>
            <p className="text-base font-bold text-slate-100">Couldn't load your workspace</p>
            <p className="text-sm text-slate-400">{cloudError}</p>
            <button onClick={signOutUser} className="term px-5 py-2 rounded-md border border-slate-700 text-xs uppercase tracking-wider text-slate-200 hover:border-emerald-500">
              Sign out
            </button>
          </div>
        ) : (
          <>
            <div className="animate-float">
              <Insignia size={84} active />
            </div>
            <div className="term flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> Establishing link…
            </div>
          </>
        )}
      </div>
    );
  }

  if (!isSignedIn) {
    const domains = allowedEmailDomains.map((d) => `@${d}`).join(' or ');
    return (
      <div className="min-h-screen w-screen flex font-sans">
        {/* Left: brand + live feed */}
        <div className="hidden lg:flex relative w-[55%] flex-col justify-between p-12 border-r border-slate-800">
          <div className="flex items-center gap-3">
            <Insignia size={44} active />
            <div>
              <div className="text-lg font-extrabold tracking-[0.15em] text-slate-100">SERMONA</div>
              <div className="term text-[10px] text-slate-500 tracking-[0.2em]">COMMAND · COLLABORATION</div>
            </div>
          </div>

          <div className="space-y-10">
            <div>
              <div className="term text-[11px] uppercase tracking-[0.25em] text-emerald-500">// talk → understand → organize → execute</div>
              <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-slate-100 mt-4 max-w-xl">
                Every conversation
                <br />
                becomes a <span className="text-emerald-500">mission</span>.
              </h1>
              <p className="text-slate-400 mt-4 max-w-md">
                Chat with your squad. Sermona logs the decisions, assigns the tasks and tracks every deadline — automatically.
              </p>
            </div>
            <FeedPreview />
          </div>

          <div className="term text-[10px] text-slate-600 tracking-[0.2em]">SYS.STATUS: <span className="text-signal">ONLINE</span></div>
        </div>

        {/* Right: sign in */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="hud relative w-full max-w-sm rounded-xl border border-slate-750 bg-slate-900/90 p-8 animate-fade-up">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <Insignia size={40} active />
              <span className="text-lg font-extrabold tracking-[0.15em] text-slate-100">SERMONA</span>
            </div>

            <div className="term text-[10px] uppercase tracking-[0.25em] text-emerald-500">// access terminal</div>
            <h2 className="text-2xl font-extrabold text-slate-100 mt-1">Identify yourself</h2>
            <p className="text-sm text-slate-500 mt-1.5">Sign in to reach your workspaces.</p>

            <button
              onClick={signInWithGoogle}
              className="mt-7 w-full flex items-center justify-center gap-3 px-4 py-3 rounded-md bg-slate-100 hover:bg-white text-slate-950 font-semibold text-sm transition-colors cursor-pointer"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {domains && (
              <div className="mt-4 flex items-start gap-2.5 p-3 rounded-md border border-emerald-500/30 bg-emerald-950 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-px text-emerald-500" />
                <span>
                  Clearance restricted to <span className="term font-bold text-emerald-500">{domains}</span> accounts.
                </span>
              </div>
            )}

            <p className="text-xs text-slate-500 mt-6 leading-relaxed">
              Got an invite link? Open it and sign in — you'll join that workspace automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
