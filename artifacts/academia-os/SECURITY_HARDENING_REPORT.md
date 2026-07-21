# AcademiaOS Replit v1.2.0 security hardening report

## Scope

This release is hardened for deployment through Replit using a managed PostgreSQL database and Replit Secrets. It is not a claim that the system is impossible to breach. A public system holding learner, parent, staff, financial, and academic records still requires an independent penetration test and an operational privacy programme.

## Controls added

- Production server refuses to start without a valid `DATABASE_URL`.
- Production server refuses to start when demo credentials are displayed.
- Authentication cookies are Secure, HttpOnly, SameSite=Lax, and use the `__Host-` prefix by default.
- Sessions have idle and absolute expiry limits. Password resets and password changes revoke existing sessions.
- Login attempts are throttled by username and IP address. Unknown usernames still perform a password hash comparison to reduce timing leaks.
- Six-character generated staff credentials are temporary only, expire after 24 hours, and force a permanent password change. Permanent passwords require 12 to 128 characters with upper-case, lower-case, and numeric characters.
- The first Super Admin is created through environment Secrets with a one-time bootstrap command. Demo seeding is blocked unless explicitly enabled.
- Learner photos, staff photos, and school logos accept only verified JPEG, PNG, or WebP data up to 1.5 MB. Uploaded SVG and renamed executable content are rejected.
- Parent phone and email fields and staff phone and email fields are validated on the server.
- Database connections use bounded pools, timeouts, optional verified TLS, and no production fallback password.
- Content Security Policy, HSTS, frame denial, MIME sniffing protection, restrictive permissions policy, and cross-origin isolation headers are enabled.
- CSV exports neutralise formula injection.
- Audit logging redacts common secret fields and limits stored request metadata.
- School and user actions apply tenant checks, role checks, and protection against suspending the final Super Admin.
- Proprietor approval remains mandatory before academic reports are released.
- A source secret scanner and production dependency audit are included in `npm run release:check`.

## Deployment model

- Replit runs `npm run db:migrate && npm run build` during deployment.
- Replit runs `npm run start` for the published application.
- The server binds to `0.0.0.0` and the Replit-provided `PORT`.
- Runtime records belong in PostgreSQL. The application does not rely on the deployment filesystem for persistent school data.

## Required operator actions before Public access

- Keep the first release private or password-protected for a controlled soft launch.
- Store all database, SMS, WhatsApp, and bootstrap credentials in Replit Secrets and Published App Secrets only.
- Delete the bootstrap password after creating the Super Admin.
- Enable managed database backups and prove restoration into a separate database.
- Test two-school isolation by changing record IDs in URLs and requests.
- Rotate any credential that has ever appeared in chat, screenshots, source code, logs, or Git history.
- Complete the checklist in `FINAL_PUBLIC_LAUNCH.md`.
- Run Replit Security Agent and arrange an independent penetration test before accepting live payments or storing a complete school population.

## Release verification

The package is accepted only when `npm run release:check` completes successfully. The release archive excludes `.env`, `node_modules`, `.next`, build caches, logs, and runtime secrets.
