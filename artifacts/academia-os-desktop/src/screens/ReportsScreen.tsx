import React from 'react';

export default function ReportsScreen() {
  return (
    <div style={{ maxWidth: 960 }}>
      <h1>Reports</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 4, marginBottom: 24, fontSize: 13 }}>
        View and download previously cached reports.
      </p>
      <div style={{ padding: '16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, fontSize: 13, color: '#92400e', fontWeight: 600, marginBottom: 20 }}>
        ⚠ Final report publication requires server connection and Proprietor approval.
      </div>
      <div className="card">
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Connect to AcademiaOS and run a sync to download your available reports for offline viewing.
        </p>
      </div>
    </div>
  );
}
