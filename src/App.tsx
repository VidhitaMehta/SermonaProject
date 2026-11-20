import React, { useState } from 'react';
import { WorkspaceModal } from './components/WorkspaceModal';
import { SermonaLogo } from './components/SermonaLogo';
import { getChannelTheme } from './data/channelThemes';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { WorkspaceRail } from './components/WorkspaceRail';
import { ChannelManagement } from './components/ChannelManagement';
import { Sidebar } from './components/Sidebar';
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
  const { activeTab, mode, channels, activeChannelId, isChannelGuest, project } = useWorkspace();
  const shownTab = isChannelGuest ? 'channels' : activeTab;
  const theme = shownTab === 'channels' ? getChannelTheme(channels.find((channel) => channel.id === activeChannelId)?.theme) : null;

  if (mode === 'cloud' && !project.id) return <EmptyWorkspace />;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-slate-100 font-sans">
      {/* Setup hint only while running without Firebase */}
      {mode === 'local' && <FirebaseSetupBanner />}

      <div className="workspace-topline flex items-center justify-between border-b border-slate-800 px-6 term text-[10px] tracking-[0.16em]">
        <div className="workspace-identity">
          <SermonaLogo className="workspace-brand-logo" />
          <span className="workspace-identity-caption">Collaborative intelligence</span>
        </div>
        <span className="flex items-center gap-2 text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-signal" />
          {mode === 'local' ? 'LOCAL WORKSPACE' : 'CLOUD WORKSPACE'}
        </span>
      </div>
      <div className="workspace-layout flex-1 flex overflow-hidden p-3 gap-3">
        {/* 1. Workspaces (like Discord servers) */}
        <WorkspaceRail />
        {/* 2. Channels, navigation & people */}
        <Sidebar />

        {/* 3. Main area */}
        <main key={activeTab} data-channel-theme={theme?.id} className="workspace-main glass flex-1 flex overflow-hidden rounded-2xl animate-fade-up">
          {shownTab === 'channels' ? (
            <>
              <ChatWorkspace />
              {!isChannelGuest && <AIPanel />}
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
