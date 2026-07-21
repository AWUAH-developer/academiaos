# AcademiaOS security controls

## Controls included in version 1.2.0

AcademiaOS uses bcrypt password hashing, random database-backed sessions, HTTP-only cookies, idle session expiry, absolute session expiry, account suspension, school suspension, forced password changes, and session invalidation after password resets.

The public deployment uses a `__Host-` session cookie by default when `SESSION_COOKIE_NAME` is not overridden. Production cookies use `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and high priority settings.

Login protection includes generic failure messages, a dummy password comparison for unknown usernames, per-account lockout, per-username throttling, and IP-based throttling. Login attempts are recorded for security review.

Staff accounts still receive the requested six-character temporary password, but it is now a one-time bootstrap credential. It expires after 24 hours, cannot bypass the forced password-change screen, and is invalidated when reset. Permanent passwords must contain 12 to 128 characters, including upper-case, lower-case, and numeric characters.

Every school-owned record is scoped to a school ID. Sensitive server actions load the authenticated user's current school before reading or changing records. Parent and learner accounts are restricted to linked learner records. Academic results remain hidden until the proprietor gives final approval and the report is locked.

Uploaded learner photos, staff photos, and school logos are limited to 1.5 MB. Only JPEG, PNG, and WebP are accepted. The application checks the actual file signature instead of trusting only the browser-provided MIME type. SVG, HTML, JavaScript, and disguised files are rejected.

Browser protections include Content Security Policy, frame blocking, MIME sniffing prevention, strict referrer handling, restricted camera permissions, Cross-Origin policies, and HSTS in production.

CSV exports neutralize values that could be interpreted as spreadsheet formulas. Audit values redact keys containing password, secret, token, cookie, authorization, or database connection information.

The production start process refuses to run when `DATABASE_URL` is missing or malformed. It also refuses to publish while demonstration credentials are displayed.

## Operator responsibilities

Keep all database credentials, messaging tokens, and API keys in Replit Secrets and Published App Secrets. Never place them in source files, screenshots, Agent prompts, or chat messages.

Do not run `npm run db:seed` against a live school database. The demo seed now requires `ALLOW_DEMO_SEED=true`, but that is not permission to use it in production.

Enable Replit database backups, review failed logins and audit logs, remove unused staff accounts, test data restoration, and rotate credentials after staff changes.

Use a custom domain only after the `replit.app` deployment works correctly. Confirm HTTPS, mobile scanning, login, attendance, fee payments, report approvals, and session expiry on the custom domain.

Run Replit Security Agent before the first public release and after major authentication, payment, file upload, or permission changes.

## Remaining limitations

Version 1.2.0 does not include TOTP two-factor authentication, breached-password checking, antivirus scanning, automatic data-retention deletion, or external penetration testing.

For a school system containing children’s photographs, attendance records, financial balances, medical notes, and parent contact information, an independent security review is still required before a large multi-school rollout.
