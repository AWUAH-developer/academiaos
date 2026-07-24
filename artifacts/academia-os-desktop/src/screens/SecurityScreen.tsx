import React from 'react';

export default function SecurityScreen() {
  return (
    <div style={{ maxWidth: 680 }}>
      <h1>Security</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 4, marginBottom: 24, fontSize: 13 }}>
        Gate check-in / check-out and visitor management — available for Premium package.
      </p>
      <div style={{ padding: '16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e', fontWeight: 600, marginBottom: 20 }}>
        ⚠ Gate events recorded offline will sync automatically when connected.
      </div>
      <div className="card">
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Requires Premium subscription. Connect to the server to use gate management.</p>
      </div>
    </div>
  );
}
