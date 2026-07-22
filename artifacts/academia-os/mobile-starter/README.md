# Expo connection starter

Copy `academiaos-api.ts` into the Expo application, install `expo-secure-store`, and provide a stable device identifier generated once per installation.

Set this public Expo environment value:

```text
EXPO_PUBLIC_ACADEMIAOS_API_URL=https://YOUR-DOMAIN.replit.app/api/mobile/v1
```

This URL is public and may be included in the mobile build. Database credentials, Replit Secrets, Supabase service keys, and messaging-provider secrets must never be added to Expo environment variables.
