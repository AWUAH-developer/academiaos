---
name: user.school shape
description: What fields are available on the session user's school object vs. what requires a DB fetch
---

**Rule:** `user.school` (from `requireUser()`) only exposes: `id`, `name`, `code`, `currency`, `logoUrl`, `proprietorApprovalRequired`. It does NOT include `phone`, `email`, `address`, `timezone`, `smsSenderName`, or `isActive`.

**Why:** The session token is deliberately lean. Adding all school columns would bloat every authenticated request.

**How to apply:** If you need `schools.phone` or any other column not in the list above, fetch it directly:
```typescript
const schoolRow = await db.select({ phone: schools.phone }).from(schools).where(eq(schools.id, user.school.id)).limit(1).then(r => r[0]);
```
