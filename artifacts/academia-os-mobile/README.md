# AcademiaOS Mobile 1.0

A real Expo and React Native application for Android, iOS, and a responsive companion web build. It connects to the existing Replit-hosted AcademiaOS web system through the secure `/api/mobile/v1` API. It never connects directly to PostgreSQL and does not use Replit Auth.

## Included

- Existing AcademiaOS username and password login
- Forced temporary-password replacement
- Rotating access and refresh tokens
- Native secure token storage
- School logo and branding
- Role-aware dashboard
- Linked learner list and photographs
- Attendance history and authorised attendance recording
- Fee balances, charges, payments, and receipt references
- Proprietor-approved results
- Published terminal reports
- Announcements and personal notifications
- Push-notification registration
- Signed-in device management
- Android, iOS, and web targets from one codebase

## Connect it to Replit

```bash
cp .env.example .env
```

Edit `.env`:

```text
EXPO_PUBLIC_ACADEMIAOS_API_URL=https://YOUR-APP.replit.app/api/mobile/v1
```

Verify the backend first:

```bash
curl https://YOUR-APP.replit.app/api/mobile/v1/status
```

## Install and run

```bash
npm install
npx expo start
```

Then press `a` for Android, `i` for iOS simulator on macOS, or `w` for the companion web app.

For push notifications and store-ready native testing, use an Expo development build instead of Expo Go:

```bash
npm install -g eas-cli
eas login
eas init
# Put the returned project ID in .env as EXPO_PUBLIC_EAS_PROJECT_ID
eas build --profile development --platform all
```

## Production builds

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

Android produces an AAB for Play Console. iOS produces a signed archive delivered through EAS and App Store Connect. Store signing requires your own Google Play and Apple Developer accounts.

## Security boundaries

Only the public API URL is bundled into the app. Never add `DATABASE_URL`, database passwords, Replit Secrets, Supabase secret keys, SMS keys, WhatsApp tokens, password hashes, or service-role keys to this project.

Native tokens are held in SecureStore. The web companion uses session storage so signing out or closing the browser session clears authentication. All school, role, learner, result, fee, and attendance permissions remain enforced by the Replit backend.
