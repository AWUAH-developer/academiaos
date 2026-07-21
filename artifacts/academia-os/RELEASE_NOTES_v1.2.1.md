# AcademiaOS v1.2.1 release notes

## Direct local login

- Removed the initial `/` to `/login` redirect.
- The app address now opens the AcademiaOS username and password form directly.
- Kept `/login` only as a backward-compatible alias.
- Changed unauthenticated portal redirects to return to `/`.
- Changed logout to return to `/`.
- Confirmed that the project contains no Replit Auth, OAuth, Clerk, or social-login dependency.

## Replit deployment provisioning

- Added `npm run db:provision-auth` to the Replit deployment build.
- If `ACADEMIAOS_DEMO_MODE=true`, demo accounts and data are provisioned automatically.
- If the database has no users and complete `INITIAL_SUPER_ADMIN_*` secrets exist, the first Super Admin is created automatically.
- If the database has no users and neither setup method is configured, publishing fails with a clear error instead of producing an app nobody can enter.

## Verification

- TypeScript passed.
- ESLint passed.
- 16 automated tests passed.
- Next.js production build passed.
- Secret scan passed across 83 source and configuration files.
- Production dependency audit reported zero known vulnerabilities.
