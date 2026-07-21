# AcademiaOS

AcademiaOS is a multi-school management web application for primary and secondary schools. The product name, branding, database model, and interface are original. The visual direction uses a practical school-desk theme without copying SchoolDesk screens or branding.

This package is a deployment-ready full-stack MVP. It has real PostgreSQL workflows rather than disconnected mock screens. A school can run admissions, attendance, fees, academic approvals, reports, transport, communication, staff movement, help-desk records, and audit activity from one responsive application.

## Current release

Version: `1.2.0`

Runtime: Next.js 16, React 19, TypeScript, Tailwind CSS, PostgreSQL, Drizzle ORM, bcrypt, Zod, ZXing camera scanning, and Vitest.

## Working modules

| Area | Current capability |
| --- | --- |
| Multi-school control | Separate school records, users, settings, learners, finances, academics, and logs. Super Admin can create, suspend, activate, and open a school workspace. |
| Authentication | Hashed passwords, database sessions, forced password change, failed-login tracking, temporary lockout, account suspension, school suspension, idle timeout, and session invalidation after password reset. |
| Role access | Fixed role-based navigation and server-side permission checks for Super Admin, School Admin, Proprietor, Headteacher, Academic Administrator, Teacher, Accounts, Transport, Security, Receptionist, Librarian, Canteen, Parent, and Learner. |
| Learners | Admission profiles, guardian links, classes, payment plans, class promotion, status control, unique badges, parent and learner login provisioning, printable profile details, and parent or learner data scoping. |
| Learner attendance | Manual attendance, entry and exit scans, camera QR or barcode scanning, duplicate-scan protection, check-in and check-out times, absence reasons, and guardian notifications. |
| Staff attendance | Arrival and departure records, permission-to-leave requests, supervisor approval or rejection, return recording, and personal versus supervisor visibility. |
| Fees | Charges, attendance-linked daily tuition and canteen rules, payments, allocation, unique receipts, statements, outstanding balances, controlled reversals, and payment exports. |
| Academics | Score entry, automatic totals and grades, drafts, teacher submission, academic review, proprietor final approval, rejection, return for correction, bulk approval, locking, controlled reopening, position calculation, and approval history. |
| Terminal reports | Reports generated from locked results, attendance summary, fee balance, comments, final proprietor approval, parent and learner visibility, print-to-PDF support, and verification QR code. |
| Homework | Teacher publishing, class and subject assignment, deadlines, maximum score, and parent or learner notifications. |
| Transport | Vehicles, routes, stops, learner assignments, camera badge scanning, morning boarding, school arrival, afternoon boarding, drop-off records, duplicate-scan blocking, and guardian notifications. |
| Communication | In-app announcements, audience selection, individual delivery, SMS queue, WhatsApp queue, email queue, Twilio adapter, WhatsApp Cloud adapter, generic webhook adapter, message log, costs, and failure recording. |
| Reports and exports | CSV exports for learners, attendance, staff attendance, payments, results, transport scans, and audit logs. CSV files open directly in Excel and other spreadsheet software. |
| Operations | Database migrations, repeatable demo seed, Docker PostgreSQL, Replit configuration, health endpoint, PWA manifest, static asset service worker, security headers, audit log, and automated tests. |

## Local installation

### 1. Requirements

Install Node.js 22 or newer, npm, and PostgreSQL 16 or another supported PostgreSQL release.

### 2. Configure the environment

```bash
cp .env.example .env
```

Edit `DATABASE_URL` for the PostgreSQL server you will use. Set `DATABASE_SSL=true` when the provider requires SSL.

### 3. Start PostgreSQL locally

```bash
docker compose up -d
```

This creates a local database named `academiaos` using the development credentials in `docker-compose.yml`.

### 4. Install, migrate, and seed

```bash
npm install
npm run db:migrate
ALLOW_DEMO_SEED=true npm run db:seed
```

### 5. Start AcademiaOS

```bash
npm run dev
```

Open `http://localhost:3000`.

The database health check is available at `http://localhost:3000/api/health`.

## Demo accounts

Demo seeding is disabled unless `ALLOW_DEMO_SEED=true`. Never enable it for a live database. When deliberately enabled in an isolated demo, every seeded account uses `ChangeMe123!`.

| Role | Username |
| --- | --- |
| Super Admin | `superadmin` |
| School Admin | `admin` |
| Proprietor | `proprietor` |
| Headteacher | `headteacher` |
| Academic Administrator | `academic` |
| Teacher 1 | `teacher` |
| Teacher 2 | `teacher2` |
| Teacher 3 | `teacher3` |
| Accounts Officer | `accounts` |
| Transport Officer | `transport` |
| Security Officer | `security` |
| Parent 1 | `parent1` |
| Parent 2 | `parent2` |
| Learner | `learner1` |

Set `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=false` before a real deployment. Replace every demonstration password before storing live school data.

## Production build verification

```bash
npm run release:check
```

The command runs TypeScript validation, ESLint, 16 automated tests, the production build, a source secret scan, and a production dependency audit.

The required daily-fee scenarios and core role restrictions are covered by the test suite.

## Replit deployment

Create a Replit project from this folder, attach a managed PostgreSQL database, and add the values from `.env.example` to Replit Secrets.

Run `npm ci` and `npm run db:migrate` in the Replit Shell. Create the first production administrator with `npm run db:bootstrap-admin`. Do not run the demo seed against a live database.

For deployment, use:

```bash
npm run build
npm run start
```

The included `.replit` file separates the deployment build and run commands, listens on `0.0.0.0`, and uses Replit’s assigned port. Camera scanning requires the HTTPS address provided by the deployment platform.

Detailed deployment steps are in `docs/DEPLOYMENT.md`.

## SMS, WhatsApp, and email processing

External messages are stored in the database before delivery. Configure one of the provider methods in `.env`, then run:

```bash
npm run messages:process
```

In production, schedule that command with the hosting provider's cron or worker service. The queue processor handles up to 100 waiting messages per run and records provider IDs, costs, and failures.

Twilio is supported for SMS. Meta WhatsApp Cloud is supported for WhatsApp text messages. A generic authenticated webhook can be used for Hubtel, Africa's Talking, another SMS provider, or an email delivery service.

## PWA and camera scanning

AcademiaOS can be installed from a supported browser as a progressive web app. The service worker caches only public static assets. It deliberately does not cache authenticated pages, server actions, or API responses.

The attendance and transport pages can scan QR codes and common barcodes through the phone camera. Manual entry remains available. Camera access requires HTTPS or localhost and the user must grant browser permission.

## Data and security rules

The application never stores plain-text passwords. Approved academic results are locked. Financial records are reversed rather than deleted. Parent and learner accounts are restricted to linked learner records. School users cannot access another school's records through the application workflows.

Security headers are enabled. The project currently reports no production dependency vulnerabilities through `npm audit --omit=dev` at packaging time.

A real launch still requires managed database backups, TLS, provider credentials, monitoring, a recovery drill, and an independent security review. Read `docs/SECURITY.md` and `IMPLEMENTATION_STATUS.md` before accepting live payments or storing sensitive learner information.

## Main commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create the production build |
| `npm run start` | Run the production server |
| `npm run db:generate` | Generate a new Drizzle migration after schema changes |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Create demonstration records only when `ALLOW_DEMO_SEED=true` |
| `npm run messages:process` | Process queued external messages |
| `npm test` | Run automated tests |
| `npm run check` | Run type checking, linting, tests, and the production build |
| `npm run release:check` | Run the full release gate, including secret scan and dependency audit |

## Version 1.1.1 profile and branding update

This package is configured for Replit through the included `.replit` file. The Replit deployment command applies database migrations, builds the Next.js application, and starts it on the port supplied by Replit.

New profile and branding features:

- Learner admission now requires a profile photograph.
- Existing learner profiles can replace their photograph from the learner profile page.
- Staff account creation now requires a photograph, mobile number, and email address.
- Existing staff profiles can update their photograph, mobile number, and email address from Users and staff.
- Parent or guardian name, mobile number, and email address are required during learner admission.
- School registration and School setup now support school logo uploads.
- The active school logo appears in the school list, setup page, and navigation panel.
- Staff usernames are generated automatically from the staff member's name. Duplicate names receive a number suffix.
- New staff accounts receive a cryptographically generated six-character temporary password.
- Password resets generate a new six-character temporary password and close existing sessions.
- Every temporary password must be changed at the next login.

Uploaded JPG, PNG, and WebP images are stored as protected database values so they remain available after a Replit restart. The maximum size per image is 1.5 MB.

### Replit setup

1. Import this ZIP into Replit.
2. Add a PostgreSQL database and set `DATABASE_URL` in Replit Secrets.
3. Set `DATABASE_SSL=true` if the database provider requires SSL.
4. Run `npm ci`.
5. Run `npm run db:migrate`.
6. Never run `npm run db:seed` on a live school database. Use `ALLOW_DEMO_SEED=true npm run db:seed` only in an isolated demonstration project.
7. Use Replit Publish. The included deployment command runs migrations, builds, and starts the app automatically.


## Version 1.2.0 public-launch hardening

This security release adds IP and username login throttling, unknown-user timing protection, expiring one-time temporary passwords, stricter permanent passwords, secure production startup checks, hardened cookies, Content Security Policy, HSTS, real image-signature verification, CSV formula-injection protection, audit-log secret redaction, database timeouts, production demo-seed blocking, a one-time Super Admin bootstrap command, a source secret scanner, and a Replit-specific final launch checklist.

The requested six-character staff password remains available only as a 24-hour temporary credential. It cannot be used after expiry and must be replaced at first login.

Read `FINAL_PUBLIC_LAUNCH.md` before changing the Replit deployment from private or password-protected access to Public.

## Version 1.2.1 direct-login correction

AcademiaOS uses its own PostgreSQL username and password authentication. It does not use Replit Auth, OAuth, Clerk, or Replit user accounts.

The `/` address now renders the AcademiaOS login form directly. It no longer redirects signed-out visitors to `/login`. The `/login` route remains as a compatible alias.

A Replit-branded sign-in page is controlled by the published app's Access setting, not by this source code. Set the published app Access option to **Public** to remove that Replit screen. AcademiaOS role and session security still protects every portal route.

For an isolated demo deployment, set `ACADEMIAOS_DEMO_MODE=true` in Published App Secrets. The deployment build will provision the `admin` and `proprietor` demo users. Do not use demo mode with real school data.
