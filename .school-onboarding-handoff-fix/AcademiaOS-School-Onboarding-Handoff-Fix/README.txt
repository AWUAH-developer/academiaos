ACADEMIAOS SCHOOL ONBOARDING HANDOFF FIX

What this fixes
- Stops the Demo Requests -> Create school action from opening the generic system-error page.
- Replaces the fragile JSON prefill URL with separate, safely encoded query fields.
- Adds a dedicated /schools/enrol production onboarding page.
- Prefills school name, school email, administrator name, phone and email.
- Preserves live school initials and automatic short code.
- Keeps school logo and administrator photo optional.
- Repairs old /schools?prefill=... links by redirecting them before school-list database queries run.
- Adds a clear Enroll school action to the Schools page.

Important
- This fixes paid production school onboarding and conversion from a demo request to a paid school.
- It does not create the separate 7-day demo-login system. That requires its own isolated demo tenant, expiry fields and login enforcement.

No database migration is included.
