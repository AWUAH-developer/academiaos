# AcademiaOS final public launch checklist

## Status required before launch

Mark every item complete. One failed item means the release stays private.

### Infrastructure

- [ ] Replit Autoscale or Reserved VM deployment is used, not Static.
- [ ] Published App Access is set to Public so Replit does not place its own account sign-in in front of AcademiaOS.
- [ ] The `replit.app` address works before adding a custom domain.
- [ ] The custom domain shows HTTPS with no certificate warning.
- [ ] `DATABASE_URL` exists in both development Secrets and Published App Secrets.
- [ ] `NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS=false`.
- [ ] Replit App Monitoring is enabled.
- [ ] Database backups are enabled and a restoration test has succeeded.

### Accounts and access

- [ ] The first Super Admin was created with `npm run db:bootstrap-admin`.
- [ ] The bootstrap password Secret was deleted afterward.
- [ ] Every demonstration account has been removed or changed.
- [ ] Two-school isolation tests return no cross-school data.
- [ ] Parent accounts can see only linked learners.
- [ ] Teachers cannot approve their own results.
- [ ] Proprietor approval is compulsory before reports are released.
- [ ] Suspended accounts cannot reuse an existing session.

### Data protection

- [ ] Learner, parent, and staff privacy notices are approved.
- [ ] Parent consent for learner photographs is recorded.
- [ ] Staff know who may access learner medical and financial information.
- [ ] Data retention and deletion periods are documented.
- [ ] The school has an incident response contact and procedure.

### Functional test

- [ ] Learner admission, photograph, parent phone, and parent email work.
- [ ] Staff creation, photograph, phone, email, username generation, and password reset work.
- [ ] School logo appears on the correct school records.
- [ ] Attendance and partial attendance work.
- [ ] Absent learners owe daily tuition but not absent-day canteen fees.
- [ ] One absent day plus return calculates GHS 25 for a GHS 10 tuition and GHS 5 canteen plan.
- [ ] Three absent days plus return calculates GHS 45.
- [ ] Payments, partial payments, balances, receipts, and reversals work.
- [ ] Teacher submission, academic review, proprietor approval, locking, and report release work.
- [ ] Camera scanning works on HTTPS using Android and iPhone.

### Security verification

Run:

```bash
npm run release:check
```

Expected result:

```text
TypeScript passed
ESLint passed
16 tests passed
Next.js production build passed
Secret scan passed
0 production dependency vulnerabilities
```

Then use Replit Security Agent to scan the entire project. Do not dismiss findings simply because the application appears to work.

## Soft launch

For the direct AcademiaOS username/password flow, publish with Access set to Public and share the URL only with 10 to 20 trusted users for seven to fourteen days. Keep the existing paper or spreadsheet process running in parallel. Record every defect, owner, severity, fix, and retest result.

Move to Public only when there are no unresolved critical or high-severity defects, no fee calculation mismatch, no cross-school data exposure, and no lost attendance or payment records.
