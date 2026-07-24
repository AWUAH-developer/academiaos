import React from 'react';

export default function DailyFeesScreen() {
  return (
    <div style={{ maxWidth: 960 }}>
      <h1>Daily Fees</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 4, marginBottom: 24, fontSize: 13 }}>
        Record fee drafts offline — they upload when connected.
      </p>
      <div style={{ padding: '16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e', fontWeight: 600, marginBottom: 20 }}>
        ⚠ Final financial posting requires server connection. Drafts are saved locally.
      </div>
      <div className="card">
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Daily fee recording is available for Standard and Premium packages. Sync learner and fee-category data first.
        </p>
      </div>
    </div>
  );
}
