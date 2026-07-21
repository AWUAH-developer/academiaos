# AcademiaOS implementation status

## Release position

This codebase is a deployment-ready MVP, not a claim that every item in the full long-term specification has been completed. The application has working database-backed workflows and can be demonstrated, tested, extended, and deployed after a PostgreSQL database is connected.

## Implemented now

The current build includes multi-school isolation, school lifecycle control, secure login sessions, password hashing, forced password changes, account suspension, login lockout, role-based access, learner and guardian management, class promotion, parent and learner account provisioning, badge generation, phone-camera scanning, learner attendance, staff attendance, staff movement approval, fees and receipts, attendance-linked daily charges, payment allocation, controlled payment reversal, academic scoring, academic review, compulsory proprietor approval, result locking, controlled reopening, bulk approval, homework, terminal report generation, report QR verification, parent and learner visibility controls, transport management, boarding and drop-off notifications, in-app communication, external message queues, provider adapters, help-desk records, audit logs, CSV exports, PWA installation, security headers, migrations, seed data, automated tests, and a deployment health endpoint.

## Items that still require production operations

A managed PostgreSQL database must be provisioned. Backups, point-in-time recovery, alerting, log retention, TLS, a custom domain, environment secrets, an external message provider, and a scheduled queue worker must be configured by the operator.

The system should undergo an independent penetration test and a Ghana Data Protection compliance review before sensitive live records are imported. Staff must receive role and data-handling training. A recovery exercise should prove that database backups can be restored.

## Product work not yet included

The following items remain outside this MVP: database-driven custom permission matrices, subscription billing and school limits, self-service email password recovery, TOTP two-factor authentication, persistent file storage with malware scanning, native XLSX generation, a full offline write queue for attendance and scans, native Android or iOS packages, automatic provider delivery webhooks, configurable assessment weighting by every class and subject combination, behaviour incident management, library circulation, canteen inventory, payroll, vehicle GPS tracking, and automatic retention or deletion policies.

Reports can be printed or saved as PDF by the browser. The application does not yet store a separately generated PDF file in object storage.

## Release gate

Before live use, complete the production checklist in `docs/DEPLOYMENT.md` and `docs/SECURITY.md`. Do not expose demonstration credentials or the local PostgreSQL password on a public deployment.


## Security release 1.2.0

The Replit build now includes expiring temporary passwords, IP and username login throttling, hardened security headers, file-signature validation, audit redaction, formula-safe CSV exports, production start guards, safe initial Super Admin creation, demo-seed protection, a secret scan, and a final public launch checklist.
