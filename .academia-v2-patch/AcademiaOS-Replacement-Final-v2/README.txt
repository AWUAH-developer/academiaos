ACADEMIAOS REPLACEMENT FINAL PATCH

Use this patch instead of every earlier AcademiaOS animation/correction patch.

This cumulative patch contains:
- Permanent AcademiaOS logo icon.
- Public website animation repeats continuously.
- Web app animation appears on sign-in only.
- Mobile and desktop animation appears on sign-in only.
- Homework PDF/JPG/PNG/WebP upload restored.
- Homework topics kept for authorised academic administrators.
- Ghana date format DD/MM/YYYY.
- School creation and full School Setup restricted to Super Admin.
- Proprietor receives no School Setup and cannot create learners or staff, but can view both learner and staff records as the school owner.
- Super Admin explicitly enables School Administrator permission to add learners and/or staff.
- Proprietor always retains read-only access to learner and staff records for their own school.
- When School Admin admission is disabled, existing records remain viewable but creation forms and server actions are blocked.

Apply from ~/workspace with:

rm -rf AcademiaOS-Replacement-Final
unzip -q -o AcademiaOS-Replacement-Final.zip
bash AcademiaOS-Replacement-Final/apply.sh

Check Preview before Republish.
