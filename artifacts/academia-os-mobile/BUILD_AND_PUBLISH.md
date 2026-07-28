# Build and Publish AcademiaOS

## 1. Prepare the Replit web system

Publish `AcademiaOS-Replit-v1.3.1-Web-Mobile-API.zip` first. Confirm:

```text
https://YOUR-APP.replit.app/api/mobile/v1/status
```

returns `database: connected`.

## 2. Configure the app

```bash
cp .env.example .env
```

Set:

```text
EXPO_PUBLIC_ACADEMIAOS_API_URL=https://YOUR-APP.replit.app/api/mobile/v1
```

Change these identifiers in `app.config.ts` before the first store build if you own another domain:

```text
Android: com.academiaos.mobile
iOS:     com.academiaos.mobile
```

Once an app is published, do not casually change its package or bundle identifier.

## 3. Local test

```bash
npm install
npm run typecheck
npx expo start
```

Test parent, guardian, teacher, accounts, proprietor, and administrator accounts. Confirm each account sees only permitted school and learner records.

## 4. Expo/EAS setup

```bash
npm install -g eas-cli
eas login
eas init
eas build:configure
```

Copy the EAS project ID to `.env`:

```text
EXPO_PUBLIC_EAS_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## 5. Internal test builds

```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

Use the Android APK for trusted testers. Use TestFlight or an internal iOS build for Apple devices.

## 6. Production builds

```bash
eas build --platform all --profile production
```

## 7. Store submission

```bash
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

The first Google Play upload may require a manual Play Console upload. App Store submission still requires completing privacy, screenshots, age rating, support URL, review notes, and review-account fields in App Store Connect.

## 8. Reviewer account

Create a dedicated demonstration school and reviewer account with realistic but fictional records. Keep that backend and account active throughout store review. Do not give reviewers a real child’s information.
