import React from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { Sidebar } from './components/Sidebar';
import { ChatWorkspace } from './components/ChatWorkspace';
import { AIPanel } from './components/AIPanel';
import { TaskDashboard } from './components/TaskDashboard';
import { DecisionsView } from './components/DecisionsView';
import { InsightsView } from './components/InsightsView';
import { TeamView } from './components/TeamView';
import { FirebaseSetupBanner } from './components/FirebaseSetupBanner';
import { ToastContainer } from './components/ToastContainer';

const MainLayout: React.FC = () => {
  const { activeTab } = useWorkspace();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans']">
      {/* Top Firebase & Environment Banner */}
      <FirebaseSetupBanner />

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Central Workspace & Right Panel depending on Active Tab */}
        {activeTab === 'channels' ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Central Conversation Workspace */}
            <ChatWorkspace />
            {/* Right Persistent AI Assistant Panel */}
            <AIPanel />
          </div>
        ) : activeTab === 'dashboard' || activeTab === 'tasks' ? (
          <TaskDashboard />
        ) : activeTab === 'decisions' ? (
          <DecisionsView />
        ) : activeTab === 'insights' ? (
          <InsightsView />
        ) : activeTab === 'team' ? (
          <TeamView />
        ) : (
          <TaskDashboard />
        )}
      </div>

      {/* Toast Feedback Notifications */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <WorkspaceProvider>
      <MainLayout />
    </WorkspaceProvider>
  );
}
