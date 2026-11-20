import React, { ReactNode } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ShieldCheck } from 'lucide-react';
import { ConnectionLoader } from './ConnectionLoader';
import { SermonaLogo } from './SermonaLogo';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
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
          <ConnectionLoader />
        )}
      </div>
    );
  }

  if (!isSignedIn) {
    const domains = allowedEmailDomains.map((d) => `@${d}`).join(' or ');
    return (
      <div className="auth-layout min-h-screen w-full flex font-sans">
        <div className="auth-welcome hidden lg:flex relative w-[55%] flex-col justify-between p-10 xl:p-12 border-r border-slate-800">
          <ConnectionLoader variant="welcome" />
        </div>

        {/* Right: sign in */}
        <div className="auth-signin flex-1 flex items-center justify-center p-6 lg:p-10">
          <div className="auth-signin-card relative w-full max-w-sm rounded-xl border border-slate-800 p-7 animate-fade-up">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <SermonaLogo className="auth-sermona-logo" />
            </div>

            <div className="term text-[10px] uppercase tracking-[0.25em] text-emerald-500">Your shared workspace</div>
            <h2 className="text-2xl font-extrabold text-slate-100 mt-1">Welcome to Sermona</h2>
            <p className="text-sm text-slate-500 mt-1.5">Sign in with your Google account to continue.</p>

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
                  Use your <span className="term font-bold text-emerald-500">{domains}</span> account.
                </span>
              </div>
            )}

            <p className="text-xs text-slate-500 mt-6 leading-relaxed">
              Joining a team? Open your invite link and sign in to access your invited channels.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
