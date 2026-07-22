# AcademiaOS Mobile API v1

## Purpose

This API allows the Android and iOS applications to use the same AcademiaOS schools, users, learners, attendance, fees, payments, results, reports, announcements, and notifications as the Replit web application.

The mobile application never connects directly to PostgreSQL. It signs in through the Replit-hosted API and receives opaque mobile session tokens.

Base URL:

```text
https://YOUR-DOMAIN.replit.app/api/mobile/v1
```

## Authentication model

- Existing AcademiaOS usernames and passwords are used.
- Replit Auth and browser redirects are not used.
- Access tokens expire after 15 minutes by default.
- Refresh tokens expire after 30 days by default.
- Refresh tokens rotate every time they are used.
- Tokens are stored only as SHA-256 hashes in PostgreSQL.
- Reusing an old rotated refresh token revokes that mobile session.
- Password reset, password change, account suspension, and device revocation invalidate mobile sessions.
- Temporary-password users may access only profile, password-change, refresh, logout, and device endpoints until the password is changed.

The Expo app must store the access and refresh tokens with `expo-secure-store`. Never place them in AsyncStorage, source code, logs, analytics, screenshots, or error reports.

## Endpoint list

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/status` | Check API and database availability |
| POST | `/auth/login` | Sign in with AcademiaOS username and password |
| POST | `/auth/refresh` | Rotate refresh token and obtain a new access token |
| POST | `/auth/logout` | Revoke the current mobile session |
| POST | `/auth/change-password` | Replace a temporary or existing password |
| GET | `/profile` | Get current user and school branding |
| GET | `/learners` | Get learners permitted for the signed-in account |
| GET | `/attendance` | Get permitted learner attendance |
| POST | `/attendance` | Record or safely update attendance for authorised staff |
| GET | `/fees` | Get charges and complete balance summaries |
| GET | `/payments` | Get permitted payment receipts |
| GET | `/results` | Get proprietor-approved or locked results |
| GET | `/reports` | Get published terminal reports |
| GET | `/announcements` | Get applicable in-app school announcements |
| GET/PATCH | `/notifications` | Read and mark personal notifications |
| GET/POST/DELETE | `/devices` | Manage the user’s mobile devices and push token |

All protected requests use:

```http
Authorization: Bearer ACCESS_TOKEN
```

A Super Admin without a school assignment must also provide a verified active school:

```http
X-AcademiaOS-School-ID: SCHOOL_UUID
```

Ordinary users cannot select or override their school with this header.

## Login example

```bash
curl -X POST "https://YOUR-DOMAIN.replit.app/api/mobile/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "YOUR_TEST_USERNAME",
    "password": "YOUR_TEST_PASSWORD",
    "deviceIdentifier": "expo-test-device-001",
    "deviceName": "Test Android Phone",
    "platform": "android",
    "appVersion": "1.0.0"
  }'
```

The response contains `accessToken`, `refreshToken`, expiration times, user role, school logo, school currency, and `mustChangePassword`.

## Refresh example

```bash
curl -X POST "https://YOUR-DOMAIN.replit.app/api/mobile/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"REFRESH_TOKEN"}'
```

Replace the saved access token and refresh token with both new values after every successful refresh. An old refresh token must never be reused.

## Read linked learners

```bash
curl "https://YOUR-DOMAIN.replit.app/api/mobile/v1/learners" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

Parents receive only linked learners. Learners receive only their own profile. Teachers receive learners from assigned classes. Authorised school-wide roles receive learners only from their assigned school.

## Record attendance

```bash
curl -X POST "https://YOUR-DOMAIN.replit.app/api/mobile/v1/attendance" \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "learnerId": "LEARNER_UUID",
    "date": "2026-07-21",
    "status": "PRESENT",
    "reason": ""
  }'
```

Only attendance-authorised roles can use this operation. A teacher is restricted to assigned learners. The learner/date database constraint makes repeated submissions update the same attendance record instead of creating duplicates.

## Query parameters

List endpoints accept:

```text
limit=1..100 or endpoint-specific safe maximum
offset=0 or greater
learnerId=UUID where supported
from=YYYY-MM-DD and to=YYYY-MM-DD for attendance
termId=UUID for results
unreadOnly=true for notifications
```

## Error format

```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "The access token has expired."
  }
}
```

Important codes include:

```text
AUTH_REQUIRED
INVALID_TOKEN
TOKEN_EXPIRED
PASSWORD_CHANGE_REQUIRED
INVALID_CREDENTIALS
LOGIN_RATE_LIMITED
REFRESH_TOKEN_REUSED
SCHOOL_REQUIRED
PERMISSION_DENIED
LEARNER_NOT_FOUND
```

The mobile app should refresh once after `TOKEN_EXPIRED`. If refresh fails, clear secure tokens and return to the AcademiaOS username-and-password screen.

## Security boundaries

Every data endpoint checks the active session, user status, school status, role, school ID, and learner relationship. Parent and teacher learner scopes are resolved on the server. The phone is never trusted to declare its own school or learner access.

API responses use `Cache-Control: no-store`. Secret database credentials are never returned. Login attempts are throttled by username and IP address. Inputs are parsed with Zod and database queries use Drizzle parameterisation.

## Replit commands

```bash
npm ci
npm run db:migrate
npm run mobile:api:check
npm run build
```

For Replit Publish, the included `.replit` file runs:

```bash
npm run db:migrate && npm run db:provision-auth && npm run mobile:api:check && npm run build
```

The API is ready when both endpoints report success:

```text
/api/health
/api/mobile/v1/status
```
