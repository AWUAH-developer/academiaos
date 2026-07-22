# Mobile API security checklist

Complete these checks before submitting the Expo application to Google Play or the App Store.

- Replit published app Access is Public, with no Replit Auth screen in front of AcademiaOS.
- The API is available only through HTTPS.
- `DATABASE_URL` exists only in Replit Secrets and Published App Secrets.
- `/api/mobile/v1/status` reports `database: connected`.
- The migration containing `mobile_devices` and `mobile_sessions` has been applied.
- A parent account cannot request an unlinked learner ID.
- A teacher account cannot request a learner outside assigned classes.
- A School A account cannot request any School B learner, attendance, fee, payment, result, or report.
- Accounts, Security, Transport, and other roles receive `PERMISSION_DENIED` for modules outside their permissions.
- An expired access token refreshes only once with the current refresh token.
- Reusing a rotated refresh token revokes the session.
- Password reset, password change, suspension, logout, and device removal invalidate affected mobile sessions.
- The Expo app stores tokens only with SecureStore.
- The Expo app contains no database URL, password hash, Replit Secret, Supabase service key, SMS key, or WhatsApp key.
- Error tracking masks usernames, telephone numbers, email addresses, learner records, fee records, academic results, and tokens.
