import React from 'react';
import { getChannelTheme } from './data/channelThemes';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { WorkspaceRail } from './components/WorkspaceRail';
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

const MainLayout: React.FC = () => {
  const { activeTab, mode, channels, activeChannelId } = useWorkspace();
  const theme = activeTab === 'channels' ? getChannelTheme(channels.find((channel) => channel.id === activeChannelId)?.theme) : null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-slate-100 font-sans">
      {/* Setup hint only while running without Firebase */}
      {mode === 'local' && <FirebaseSetupBanner />}

      <div className="workspace-topline flex items-center justify-between border-b border-slate-800 px-6 term text-[10px] tracking-[0.16em]"><span className="flex items-center gap-3"><span className="text-emerald-400 font-bold">SERMONA</span><span className="text-slate-600">/</span><span className="text-slate-400">COLLABORATIVE INTELLIGENCE</span></span><span className="flex items-center gap-2 text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-signal" />{mode === 'local' ? 'LOCAL WORKSPACE' : 'CLOUD WORKSPACE'}</span></div><div className="workspace-layout flex-1 flex overflow-hidden p-3 gap-3">
        {/* 1. Workspaces (like Discord servers) */}
        <WorkspaceRail />
        {/* 2. Channels, navigation & people */}
        <Sidebar />

        {/* 3. Main area */}
        <main key={activeTab} data-channel-theme={theme?.id} className="workspace-main glass flex-1 flex overflow-hidden rounded-2xl animate-fade-up">
          {activeTab === 'channels' ? (
            <>
              <ChatWorkspace />
              <AIPanel />
            </>
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
