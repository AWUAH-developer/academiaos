import React from 'react';

interface Props {
  schoolName?: string;
  userName?: string;
  onLogout(): void;
}

export default function TitleBar({ schoolName, userName, onLogout }: Props) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 'var(--titlebar-h)',
      background: 'var(--chalk-dark)', color: '#fff', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between', zIndex: 100,
      WebkitAppRegion: 'drag' as never, userSelect: 'none',
      padding: '0 16px 0 80px', /* 80px left margin for macOS traffic lights */
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.04em', color: '#d4edda' }}>
          AcademiaOS
        </span>
        {schoolName && (
          <>
            <span style={{ opacity: .35 }}>·</span>
            <span style={{ fontSize: 12, opacity: .75 }}>{schoolName}</span>
          </>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, WebkitAppRegion: 'no-drag' as never }}>
        {userName && <span style={{ fontSize: 12, opacity: .65 }}>{userName}</span>}
        <button
          onClick={onLogout}
          style={{ background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', padding: '3px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
