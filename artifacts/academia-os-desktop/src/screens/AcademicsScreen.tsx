import React from 'react';

export default function AcademicsScreen() {
  return (
    <div style={{ maxWidth: 960 }}>
      <h1>Academics</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 4, marginBottom: 24, fontSize: 13 }}>
        Enter marks and remarks offline — they upload when connected.
      </p>
      <div style={{ padding: '16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e', fontWeight: 600, marginBottom: 20 }}>
        ⚠ Proprietor final approval and report publication require server connection.
      </div>
      <div className="card">
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Academic entry is available for Standard and Premium packages. Sync class, subject and learner data first.
        </p>
      </div>
    </div>
  );
}
