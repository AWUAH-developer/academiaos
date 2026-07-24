import React from 'react';

export default function NotificationsScreen() {
  return (
    <div style={{ maxWidth: 680 }}>
      <h1>Notifications</h1>
      <p style={{ color: 'var(--text-muted)', marginTop: 4, marginBottom: 24, fontSize: 13 }}>
        School notifications and announcements.
      </p>
      <div className="empty">
        <span style={{ fontSize: 32 }}>🔔</span>
        <p>No notifications. Connect and sync to download announcements.</p>
      </div>
    </div>
  );
}
