import React, { useEffect, useState } from 'react';
import { WorkspaceModal } from './components/WorkspaceModal';
import { SermonaLogo } from './components/SermonaLogo';
import { getChannelTheme } from './data/channelThemes';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { WorkspaceRail } from './components/WorkspaceRail';
import { ChannelManagement } from './components/ChannelManagement';
import { HomeHub } from './components/HomeHub';
import { PageBar } from './components/PageBar';
import { Menu, X } from 'lucide-react';
import { HomeView } from './components/HomeView';
import { ChatWorkspace } from './components/ChatWorkspace';
import { AIPanel } from './components/AIPanel';
import { TaskDashboard } from './components/TaskDashboard';
import { DecisionsView } from './components/DecisionsView';
import { InsightsView } from './components/InsightsView';
import { TeamView } from './components/TeamView';
import { FirebaseSetupBanner } from './components/FirebaseSetupBanner';
import { ToastContainer } from './components/ToastContainer';
import { AuthGate } from './components/AuthGate';

const EmptyWorkspace = () => {
  const { myProjects, switchProject } = useWorkspace();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-slate-100">
      <SermonaLogo />
      <h1 className="text-2xl">Your next workspace starts here.</h1>
      <button onClick={() => setOpen(true)} className="rounded-lg bg-emerald-500 px-4 py-2 text-sm text-slate-950">Create or join a workspace</button>
      {myProjects.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {myProjects.map((entry) => <button key={entry.id} onClick={() => switchProject(entry.id)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs">Open {entry.name}</button>)}
        </div>
      )}
      <WorkspaceModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { activeTab, setActiveTab, mode, channels, activeChannelId, isChannelGuest, project } = useWorkspace();
  const shownTab = isChannelGuest ? 'channels' : activeTab;
  const [aiSheet, setAiSheet] = useState(false);
  const [railOpen, setRailOpen] = useState(false);

  // Phone/browser Back button returns to the home cards instead of leaving the app
  useEffect(() => {
    if (activeTab !== 'home' && window.history.state?.sermonaTab !== activeTab) {
      window.history.pushState({ sermonaTab: activeTab }, '');
    }
    setAiSheet(false);
  }, [activeTab]);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => setActiveTab(e.state?.sermonaTab || 'home');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setActiveTab]);
  const goHome = () => {
    if (window.history.state?.sermonaTab) window.history.back();
    else setActiveTab('home');
  };
  const theme = shownTab === 'channels' ? getChannelTheme(channels.find((channel) => channel.id === activeChannelId)?.theme) : null;

  if (mode === 'cloud' && !project.id) return <EmptyWorkspace />;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-slate-100 font-sans">
      {/* Setup hint only while running without Firebase */}
      {mode === 'local' && <FirebaseSetupBanner />}

      <div className="workspace-topline flex items-center justify-between border-b border-slate-800 px-6 term text-[10px] tracking-[0.16em]">
        <div className="workspace-identity flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRailOpen(true)}
            className="md:hidden p-1.5 -ml-1 rounded-md text-slate-400 hover:text-slate-100"
            aria-label="Open workspaces"
          >
            <Menu size={18} />
          </button>
          <SermonaLogo className="workspace-brand-logo" />
          <span className="workspace-identity-caption">Collaborative intelligence</span>
        </div>
        <span className="flex items-center gap-2 text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-signal" />
          {mode === 'local' ? 'LOCAL WORKSPACE' : 'CLOUD WORKSPACE'}
        </span>
      </div>
      <div className="workspace-layout flex-1 flex overflow-hidden p-3 gap-3 max-md:flex-nowrap! max-md:overflow-hidden! max-md:p-2!">
        {/* 1. Workspaces (like Discord servers); a slide-in drawer on phones */}
        <div className="hidden md:flex">
          <WorkspaceRail />
        </div>
        {railOpen && (
          <div className="md:hidden fixed inset-0 z-[70] flex bg-black/60 animate-fade-up" onClick={() => setRailOpen(false)}>
            <div className="p-3 h-full" onClick={(e) => e.stopPropagation()}>
              <WorkspaceRail />
            </div>
            <button className="m-3 self-start p-2 rounded-lg text-slate-300 bg-slate-900" aria-label="Close" onClick={() => setRailOpen(false)}>
              <X size={18} />
            </button>
          </div>
        )}

        {/* 2. Main area: home cards, or a page with a Back button */}
        <main key={activeTab} data-channel-theme={theme?.id} className="workspace-main glass flex-1 min-w-0 min-h-0! flex flex-col overflow-hidden rounded-2xl animate-fade-up">
          {shownTab !== 'home' && <PageBar onBack={goHome} onOpenAI={isChannelGuest ? undefined : () => setAiSheet(true)} />}
          <div className="flex-1 min-h-0 flex overflow-hidden">
          {shownTab === 'home' ? (
            <HomeHub />
          ) : shownTab === 'channels' ? (
            <>
              <ChatWorkspace />
              {!isChannelGuest && (
                <div className="hidden lg:flex">
                  <AIPanel />
                </div>
              )}
              {aiSheet && !isChannelGuest && (
                <div className="lg:hidden fixed inset-0 z-[60] flex flex-col justify-end bg-black/60" onClick={() => setAiSheet(false)}>
                  <div
                    className="h-[85vh] rounded-t-2xl overflow-hidden border-t border-slate-700 flex [&>aside]:w-full [&>aside]:border-l-0 animate-fade-up"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <AIPanel />
                  </div>
                </div>
              )}
            </>
          ) : activeTab === 'channel-settings' ? (
            <ChannelManagement />
          ) : activeTab === 'tasks' ? (
            <TaskDashboard />
          ) : activeTab === 'decisions' ? (
            <DecisionsView />
          ) : activeTab === 'insights' ? (
            <InsightsView />
          ) : activeTab === 'team' ? (
            <TeamView />
          ) : (
            <HomeView />
          )}
          </div>
        </main>
      </div>
    </div>
  );
};

/** Soft, slowly drifting colour blobs behind the frosted-glass UI. */
const Background = () => (
  <div className="sermona-bg" aria-hidden="true">
    <span />
    <span />
    <span />
    <span />
  </div>
);

export default function App() {
  return (
    <WorkspaceProvider>
      <Background />
      <AuthGate>
        <MainLayout />
      </AuthGate>
      <ToastContainer />
    </WorkspaceProvider>
  );
}
