import React from 'react';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  currentSection: string;
  setSection: (section: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',     icon: '⚡' },
  { id: 'dailyTracker', label: 'Daily Tracker',  icon: '📋' },
  { id: 'analytics',   label: 'Analytics',      icon: '📊' },
  { id: 'streakEngine', label: 'Streak Engine',  icon: '🔥' },
  { id: 'achievements', label: 'Achievements',   icon: '🏆' },
  { id: 'reflections',  label: 'Reflections',    icon: '📝' },
  { id: 'habitManager', label: 'Habit Manager',  icon: '⚙️' },
  { id: 'reminders',   label: 'Reminders',      icon: '🔔' },
  { id: 'social',      label: 'Social',         icon: '🌍', isBeta: true },
  { id: 'tasks',       label: 'Tasks',          icon: '👷' },
  { id: 'settings',   label: 'Settings',        icon: '🛠️' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  setSection,
  isCollapsed,
  setIsCollapsed,
}) => {
  const { user, profile } = useAuth();

  const displayName  = profile?.display_name || user?.name || 'Apex Performer';
  const totalXp      = profile?.total_xp ?? 0;
  const level        = profile?.level ?? 1;
  const initials     = displayName.substring(0, 2).toUpperCase();

  const handleNav = (id: string) => {
    setSection(id);
    // Auto-close drawer on mobile
    if (window.innerWidth < 1024) setIsCollapsed(true);
  };

  return (
    <aside className={`sidebar glass-sidebar${isCollapsed ? ' collapsed' : ''}`}>

      {/* ── Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          padding: '0 16px',
          height: '60px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        {!isCollapsed && (
          <span
            style={{
              fontFamily: 'Syne, monospace',
              fontSize: '20px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: 'var(--text)',
              whiteSpace: 'nowrap',
            }}
          >
            PPS<span style={{ color: 'var(--accent)' }}>.</span>
          </span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            color: 'var(--muted)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '6px',
            fontSize: '14px',
            lineHeight: 1,
            transition: 'color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? '❯' : '❮'}
        </button>
      </div>

      {/* ── Navigation */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 8px' }}>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = currentSection === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNav(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: isCollapsed ? '10px 0' : '9px 12px',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    width: '100%',
                    borderRadius: '8px',
                    border: 'none',
                    borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    background: isActive ? 'rgba(110,168,255,0.09)' : 'transparent',
                    color: isActive ? 'var(--text)' : 'var(--muted)',
                    fontWeight: 600,
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textAlign: 'left',
                    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = 'var(--text-2)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--muted)';
                    }
                  }}
                >
                  <span style={{ fontSize: '16px', flexShrink: 0, lineHeight: 1 }}>
                    {item.icon}
                  </span>

                  {!isCollapsed && (
                    <>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                      {item.isBeta && (
                        <span
                          style={{
                            fontSize: '9px',
                            background: 'rgba(110,168,255,0.15)',
                            color: 'var(--accent)',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '99px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            flexShrink: 0,
                          }}
                        >
                          Beta
                        </span>
                      )}
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── User chip footer */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isCollapsed ? 0 : '10px',
            padding: isCollapsed ? '8px 0' : '10px 12px',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Syne, monospace',
              fontSize: '12px',
              fontWeight: 800,
              color: '#fff',
              flexShrink: 0,
              boxShadow: 'var(--glow-accent)',
            }}
          >
            {initials}
          </div>

          {!isCollapsed && (
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginTop: '1px',
                }}
              >
                Lv.{level} · {totalXp.toLocaleString()} XP
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
