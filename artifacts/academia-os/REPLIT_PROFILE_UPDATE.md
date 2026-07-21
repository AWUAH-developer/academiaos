# AcademiaOS Replit Profile Update

Version 1.1.1 is a Replit-ready Next.js application.

## Added

- Required learner photograph at admission
- Learner photograph replacement
- Required staff photograph, mobile number, and email address
- Staff profile editing for photograph and contact details
- Required parent or guardian mobile number and email address
- School logo upload during school registration
- School logo replacement in School setup
- Automatic staff username generation from full name
- Automatic six-character temporary password generation
- One-click six-character password reset
- Forced password change after first login or reset
- Database migration for staff photograph storage

## Replit deployment

The `.replit` file is included and uses the Cloud Run deployment target. The deployment command is:

```bash
npm run db:migrate && npm run build && npm run start
```

The application listens on Replit's `PORT` value and falls back to port 3000 during local development.
