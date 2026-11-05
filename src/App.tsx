import React from 'react';
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
  const { activeTab, mode } = useWorkspace();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-slate-100 font-sans">
      {/* Setup hint only while running without Firebase */}
      {mode === 'local' && <FirebaseSetupBanner />}

      <div className="flex-1 flex overflow-hidden p-3 gap-3">
        {/* 1. Workspaces (like Discord servers) */}
        <WorkspaceRail />
        {/* 2. Channels, navigation & people */}
        <Sidebar />

        {/* 3. Main area */}
        <main key={activeTab} className="glass flex-1 flex overflow-hidden rounded-2xl animate-fade-up">
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
