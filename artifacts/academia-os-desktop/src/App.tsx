import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './store/auth';
import { useSyncStore } from './store/sync';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import TitleBar from './components/TitleBar';
import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';

// Lazy-load screens to keep initial bundle small
const DashboardScreen     = lazy(() => import('./screens/DashboardScreen'));
const LearnersScreen      = lazy(() => import('./screens/LearnersScreen'));
const StaffScreen         = lazy(() => import('./screens/StaffScreen'));
const AttendanceScreen    = lazy(() => import('./screens/AttendanceScreen'));
const DailyFeesScreen     = lazy(() => import('./screens/DailyFeesScreen'));
const AcademicsScreen     = lazy(() => import('./screens/AcademicsScreen'));
const FinanceScreen       = lazy(() => import('./screens/FinanceScreen'));
const SmartIdScreen       = lazy(() => import('./screens/SmartIdScreen'));
const SecurityScreen      = lazy(() => import('./screens/SecurityScreen'));
const ReportsScreen       = lazy(() => import('./screens/ReportsScreen'));
const NotificationsScreen = lazy(() => import('./screens/NotificationsScreen'));
const SyncScreen          = lazy(() => import('./screens/SyncScreen'));
const SettingsScreen      = lazy(() => import('./screens/SettingsScreen'));

export type Screen =
  | 'dashboard' | 'learners' | 'staff' | 'attendance' | 'daily-fees'
  | 'academics' | 'finance' | 'smart-id' | 'security' | 'reports'
  | 'notifications' | 'sync' | 'settings';

function SCREEN_MAP(screen: Screen, sync: ReturnType<typeof useSyncStore>) {
  const screens: Record<Screen, React.ReactNode> = {
    dashboard:      <DashboardScreen />,
    learners:       <LearnersScreen />,
    staff:          <StaffScreen />,
    attendance:     <AttendanceScreen syncStore={sync} />,
    'daily-fees':   <DailyFeesScreen />,
    academics:      <AcademicsScreen />,
    finance:        <FinanceScreen />,
    'smart-id':     <SmartIdScreen />,
    security:       <SecurityScreen />,
    reports:        <ReportsScreen />,
    notifications:  <NotificationsScreen />,
    sync:           <SyncScreen syncStore={sync} />,
    settings:       <SettingsScreen />,
  };
  return screens[screen];
}

function AppShell() {
  const { authState, logout } = useAuth();
  const syncStore = useSyncStore();
  const [screen, setScreen] = React.useState<Screen>('dashboard');

  if (authState.status === 'loading') return <SplashScreen />;
  if (authState.status === 'unauthenticated') return <LoginScreen />;

  const { user } = authState;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <TitleBar schoolName={user.school?.name} userName={user.name} onLogout={logout} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', paddingTop: 'var(--titlebar-h)' }}>
        <Sidebar
          role={user.role}
          activeScreen={screen}
          onNavigate={setScreen}
          syncStatus={syncStore.status}
        />
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', padding: '20px 24px' }}>
          <Suspense fallback={<LoadingPane />}>
            {SCREEN_MAP(screen, syncStore)}
          </Suspense>
        </main>
      </div>
      <StatusBar
        online={syncStore.status.online}
        lastSynced={syncStore.status.lastSyncedAt}
        pendingOps={syncStore.status.pendingOps}
        conflictCount={syncStore.status.conflictCount}
        syncing={syncStore.status.syncing}
        onSync={syncStore.runSync}
        role={user.role}
        packageName={user.school?.name ?? ''}
      />
    </div>
  );
}

function LoadingPane() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-faint)' }}>
      <span className="spin" style={{ fontSize: 22, marginRight: 10 }}>⟳</span> Loading…
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
