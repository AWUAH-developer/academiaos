import React from 'react';

export default function FinanceScreen() {
  return (
    <div style={{ maxWidth: 960 }}>
      <h1>Finance</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 4, marginBottom: 24, fontSize: 13 }}>
        Financial overview and payment recording.
      </p>
      <div style={{ padding: '16px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#991b1b', fontWeight: 600, marginBottom: 20 }}>
        🔒 Final financial posting, withdrawals and refund approvals require an active server connection. These operations cannot be performed offline.
      </div>
      <div className="card">
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Available for Standard and Premium packages. Connect to the server to view balances and record payments.
        </p>
      </div>
    </div>
  );
}
