import React from 'react';

export default function SplashScreen() {
  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--chalk-dark)', color: '#fff',
    }}>
      <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: '.04em' }} aria-label="AcademiaOS">
        <span style={{ color: '#fff8ea' }}>Academia</span><span style={{ color: '#f4c542' }}>OS</span>
      </div>
      <div style={{ fontSize: 13, opacity: .55, marginTop: 8, letterSpacing: '.1em', textTransform: 'uppercase' }}>
        School Command Centre
      </div>
      <div style={{ marginTop: 36, display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)',
            animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite`,
            opacity: .7,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(.6);opacity:.4} 50%{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  );
}
