import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Sidebar } from './components/Sidebar';
import { Login } from './components/Login';

// Import View Components
import { DashboardView } from './components/views/DashboardView';
import { DailyTrackerView } from './components/views/DailyTrackerView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { StreakEngineView } from './components/views/StreakEngineView';
import { AchievementsView } from './components/views/AchievementsView';
import { ReflectionsView } from './components/views/ReflectionsView';
import { HabitManagerView } from './components/views/HabitManagerView';
import { RemindersView } from './components/views/RemindersView';
import { TasksView } from './components/views/TasksView';
import { SettingsView } from './components/views/SettingsView';

const SocialComingSoon: React.FC = () => (
  <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-bg flex items-center justify-center">
    <div className="glass-panel p-12 text-center rounded-radius flex flex-col items-center justify-center gap-4 max-w-md shadow-soft-shadow">
      <div className="text-5xl select-none">🌍</div>
      <div className="space-y-2">
        <h2 className="font-syne text-2xl font-extrabold text-text-2">Social Hub</h2>
        <span className="inline-block text-[9px] bg-accent/20 text-accent font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          Beta / Coming Soon
        </span>
        <p className="text-muted text-xs leading-relaxed pt-2">
          Social leaderboards, performer rankings, PvP habit streaks battle, and accountability clans will be linked in the next update system.
        </p>
      </div>
    </div>
  </div>
);

function App() {
  const { user, isLoading } = useAuth();
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Initialize theme from persistence cache
  useEffect(() => {
    const savedTheme = localStorage.getItem('pps_theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  // Collapse sidebar automatically on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      } else {
        setIsSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-bg text-text">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-accent/20 border-t-accent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-muted uppercase tracking-wider">
            Syncing Performer Session...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderView = () => {
    switch (currentSection) {
      case 'dashboard':
        return <DashboardView />;
      case 'dailyTracker':
        return <DailyTrackerView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'streakEngine':
        return <StreakEngineView />;
      case 'achievements':
        return <AchievementsView />;
      case 'reflections':
        return <ReflectionsView />;
      case 'habitManager':
        return <HabitManagerView />;
      case 'reminders':
        return <RemindersView />;
      case 'tasks':
        return <TasksView />;
      case 'settings':
        return <SettingsView />;
      case 'social':
        return <SocialComingSoon />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-text bg-bg select-none overflow-hidden relative font-sans">
      {/* Mobile Backdrop Overlay */}
      {!isSidebarCollapsed && (
        <div
          onClick={() => setIsSidebarCollapsed(true)}
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-all duration-300 cursor-pointer"
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        setSection={setCurrentSection}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* Main Content Side */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Mobile Header Bar */}
        <div className="lg:hidden flex items-center justify-between px-6 h-14 bg-surface border-b border-border flex-shrink-0 z-30">
          <div className="font-syne text-lg font-extrabold tracking-wider text-text">
            PPS<span className="text-accent">.</span>
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="text-text hover:text-accent font-bold text-xl cursor-pointer p-1"
            aria-label="Open navigation sidebar menu"
          >
            ☰
          </button>
        </div>

        {/* Dynamic View container */}
        <main className="flex-1 flex flex-col min-h-0 relative z-10">
          {renderView()}
        </main>
      </div>
    </div>
  );
}

export default App;
