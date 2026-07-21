# Replit-only deployment guide

AcademiaOS is a server-rendered Next.js application. Publish it as an Autoscale web application or a Reserved VM. Do not choose Static Deployment.

## 1. Import and connect the database

Import `AcademiaOS-Replit-v1.2.0.zip` into a new Replit App.

Add Replit Database. Replit should create `DATABASE_URL` automatically. Confirm it exists under Secrets.

Add these Secrets:

```text
DATABASE_POOL_MAX=10
DATABASE_SSL=false
DATABASE_SSL_REJECT_UNAUTHORIZED=true
SESSION_COOKIE_NAME=__Host-academiaos_session
NEXT_PUBLIC_APP_NAME=AcademiaOS
NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=false
```

Use `DATABASE_SSL=true` only when the database provider requires it. Do not guess.

## 2. Create the first Super Admin safely

Add these temporary Secrets:

```text
INITIAL_SUPER_ADMIN_NAME=Your full name
INITIAL_SUPER_ADMIN_USERNAME=your.username
INITIAL_SUPER_ADMIN_EMAIL=your-email@example.com
INITIAL_SUPER_ADMIN_PHONE=+233XXXXXXXXX
INITIAL_SUPER_ADMIN_PASSWORD=use-at-least-15-characters
```

Run in the Replit Shell:

```bash
npm ci
npm run db:migrate
npm run db:bootstrap-admin
```

After the script succeeds, delete `INITIAL_SUPER_ADMIN_PASSWORD` from Secrets. Sign in within 72 hours and change the password immediately.

Do not run `npm run db:seed` for the live system. That command creates known demonstration accounts and is blocked unless `ALLOW_DEMO_SEED=true`.

## 3. Verify the release

Run:

```bash
npm run release:check
```

This runs TypeScript checking, ESLint, 16 automated tests, a production build, a source secret scan, and the production dependency audit.

Start Preview and test:

```text
/api/health
/login
/dashboard
/learners
/attendance
/fees
/academics
/approvals
/reports
```

The health endpoint must report `database: connected`.

## 4. Publish on Replit

The included `.replit` configuration separates build and runtime work:

```text
Build: npm run db:migrate && npm run build
Run: npm run start
```

The runtime listens on `0.0.0.0` and uses Replit’s assigned `PORT`.

In Publishing:

1. Select Autoscale.
2. Choose Web server.
3. Verify every required Secret is available to the published app.
4. Use password-protected or private access for the soft launch.
5. Publish and test the `replit.app` URL.
6. Enable App Monitoring.
7. Connect the custom domain only after the Replit URL works.

## 5. Final launch checks

Before changing access to Public:

1. Create two schools and confirm neither can read the other’s learners, staff, fees, results, or reports.
2. Verify parent accounts see only their linked children.
3. Confirm teacher marks remain hidden until Proprietor approval.
4. Confirm six-character temporary passwords expire after 24 hours.
5. Confirm permanent passwords require at least 12 characters.
6. Confirm suspended users lose active sessions.
7. Upload fake HTML or renamed scripts as photos and confirm rejection.
8. Verify HTTP redirects to HTTPS and the browser shows no certificate warning.
9. Export and restore a database backup.
10. Test Android, iPhone, Chrome, Safari, mobile data, and weak Wi-Fi.
11. Review Replit Security Agent findings and resolve every accepted critical or high issue.
12. Verify `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=false`.

## 6. Messaging worker

SMS and WhatsApp messages are queued in the database. If external messaging is enabled, create a Replit Scheduled Deployment that runs:

```bash
npm run messages:process
```

Give the scheduled deployment the same database and provider Secrets. A one-minute to five-minute interval is suitable for school alerts.
