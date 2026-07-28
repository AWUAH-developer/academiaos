AcademiaOS Demo Requests Runtime Fix

Purpose:
Fixes the Super Admin /demo-requests page runtime crash caused by a browser onClick/confirm handler being rendered directly inside a Next.js Server Component.

This patch:
- Adds a small client component for the Delete confirmation.
- Keeps the Demo Requests page server-rendered.
- Does not change the database, permissions, records, branding, homework, or dates.
- Runs typecheck and production build after applying.
