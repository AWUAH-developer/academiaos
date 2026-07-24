import React from 'react';
import type { Screen } from '../App';
import type { SyncStatus } from '../store/sync';

interface NavItem { id: Screen; label: string; icon: string }

const ALL_NAV: NavItem[] = [
  { id: 'dashboard',     label: 'Dashboard',      icon: '⬡' },
  { id: 'learners',      label: 'Learners',        icon: '👩‍🎓' },
  { id: 'staff',         label: 'Staff',           icon: '👥' },
  { id: 'attendance',    label: 'Attendance',      icon: '✓' },
  { id: 'daily-fees',    label: 'Daily Fees',      icon: '₵' },
  { id: 'academics',     label: 'Academics',       icon: '📋' },
  { id: 'finance',       label: 'Finance',         icon: '💰' },
  { id: 'smart-id',      label: 'Smart ID',        icon: '🪪' },
  { id: 'security',      label: 'Security',        icon: '🔒' },
  { id: 'reports',       label: 'Reports',         icon: '📊' },
  { id: 'notifications', label: 'Notifications',   icon: '🔔' },
  { id: 'sync',          label: 'Offline & Sync',  icon: '⟳' },
  { id: 'settings',      label: 'Settings',        icon: '⚙' },
];

// Role → allowed desktop screens
const ROLE_SCREENS: Record<string, Screen[]> = {
  SUPER_ADMIN:    ['dashboard','learners','staff','attendance','daily-fees','academics','finance','smart-id','security','reports','notifications','sync','settings'],
  SCHOOL_ADMIN:   ['dashboard','learners','staff','attendance','daily-fees','academics','finance','smart-id','security','reports','notifications','sync','settings'],
  PROPRIETOR:     ['dashboard','learners','staff','academics','finance','reports','notifications','sync','settings'],
  HEADTEACHER:    ['dashboard','learners','staff','attendance','academics','reports','notifications','sync','settings'],
  ACADEMIC_ADMIN: ['dashboard','learners','staff','attendance','academics','reports','notifications','sync','settings'],
  TEACHER:        ['dashboard','learners','attendance','academics','reports','notifications','sync','settings'],
  ACCOUNTS:       ['dashboard','learners','daily-fees','finance','reports','notifications','sync','settings'],
  TRANSPORT:      ['dashboard','learners','attendance','notifications','sync','settings'],
  SECURITY:       ['dashboard','attendance','smart-id','security','notifications','sync','settings'],
  RECEPTIONIST:   ['dashboard','learners','attendance','smart-id','notifications','sync','settings'],
  LIBRARIAN:      ['dashboard','learners','notifications','sync','settings'],
  CANTEEN:        ['dashboard','attendance','daily-fees','notifications','sync','settings'],
  PARENT:         ['dashboard','learners','academics','reports','notifications','sync','settings'],
  LEARNER:        ['dashboard','academics','reports','notifications','sync','settings'],
};

interface Props {
  role: string;
  activeScreen: Screen;
  onNavigate(screen: Screen): void;
  syncStatus: SyncStatus;
}

export default function Sidebar({ role, activeScreen, onNavigate, syncStatus }: Props) {
  const allowed = ROLE_SCREENS[role] ?? ['dashboard', 'notifications', 'sync', 'settings'];
  const visible = ALL_NAV.filter((n) => allowed.includes(n.id));

  return (
    <aside style={{
      width: 'var(--sidebar-w)', minWidth: 'var(--sidebar-w)', background: 'var(--chalk-dark)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
        {visible.map((item) => {
          const active = activeScreen === item.id;
          const badge  = item.id === 'sync' && syncStatus.pendingOps > 0 ? syncStatus.pendingOps : null;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                background: active ? 'rgba(255,255,255,.12)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,.65)',
                fontSize: 13, fontWeight: active ? 700 : 500,
                borderLeft: active ? '3px solid var(--gold)' : '3px solid transparent',
                transition: 'background .12s, color .12s',
              }}
            >
              <span style={{ width: 20, textAlign: 'center', fontSize: 15 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {badge && (
                <span style={{ background: 'var(--gold)', color: '#fff', borderRadius: 100, padding: '0 6px', fontSize: 10, fontWeight: 800 }}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Offline indicator at bottom */}
      {!syncStatus.online && (
        <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,.15)', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <span style={{ fontSize: 11, color: '#fca5a5', fontWeight: 600 }}>● Offline mode</span>
        </div>
      )}
    </aside>
  );
}
