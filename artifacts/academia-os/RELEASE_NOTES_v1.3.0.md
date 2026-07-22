# AcademiaOS Replit v1.3.0

## Secure mobile API foundation

This release adds a versioned native-mobile API at `/api/mobile/v1` for the future Expo Android and iOS application.

### Authentication

- Uses the existing AcademiaOS username and password accounts.
- Does not use Replit Auth, OAuth, browser redirection, Firebase Auth, Clerk, or Supabase Auth.
- Adds short-lived opaque access tokens and rotating refresh tokens.
- Stores only token hashes in PostgreSQL.
- Tracks devices and supports push-token registration.
- Revokes mobile sessions after password changes, password resets, account suspension, logout, or device removal.
- Blocks application data until a temporary password is changed.
- Applies username and IP login throttling.

### Data protection

- Enforces school isolation on every mobile data query.
- Restricts parents to linked learners.
- Restricts learners to their own records.
- Restricts teachers to assigned classes.
- Returns only approved or locked academic results and published terminal reports.
- Uses server-side Zod validation and parameterised Drizzle queries.
- Sends `Cache-Control: no-store` on API responses.

### Endpoints

The release includes status, login, refresh, logout, password change, profile, learners, attendance, fees, payments, results, reports, announcements, notifications, and device-management routes.

### Replit

The `.replit` deployment build now applies migrations, provisions authentication, verifies the mobile routes, and builds the web application. Use Replit Public access so Replit does not place its own authentication screen in front of AcademiaOS.
