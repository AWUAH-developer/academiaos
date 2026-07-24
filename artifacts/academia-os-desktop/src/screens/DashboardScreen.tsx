import React from 'react';
import { useAuth } from '../store/auth';

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
    </div>
  );
}

export default function DashboardScreen() {
  const { authState } = useAuth();
  if (authState.status !== 'authenticated') return null;
  const { user } = authState;

  return (
    <div style={{ maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <h1>Welcome back, {user.name.split(' ')[0]}</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          {user.school?.name} · {user.role.replace(/_/g, ' ')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Today's date"    value={new Date().toLocaleDateString('en-GH', { weekday: 'short', day: 'numeric', month: 'short' })} color="var(--chalk)" />
        <StatCard label="Platform"        value="Desktop"    color="var(--gold)" />
        <StatCard label="School code"     value={user.school?.code ?? '—'} color="#6366f1" />
        <StatCard label="Currency"        value={user.school?.currency ?? 'GHS'} color="#0891b2" />
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ marginBottom: 14 }}>Quick actions</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Use the sidebar to navigate to Learners, Attendance, Daily Fees, Academics, Finance, Reports and more.
          Actions available to you are filtered by your role and your school's subscription.
        </p>
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--chalk-50)', borderRadius: 8, fontSize: 12, color: 'var(--chalk-dark)', fontWeight: 600 }}>
          ✓ Connected to AcademiaOS · Sync enabled · All data encrypted locally
        </div>
      </div>
    </div>
  );
}
