---
name: Homework permission model
description: Who may create/publish homework vs. monitor it; teacherMayEnter bypass rules
---

**Rule:** SCHOOL_ADMIN has read-only homework monitoring rights — they cannot create, publish, or manage curriculum topics.

**Why:** The spec explicitly separates academic publishing (assigned teachers) from administrative oversight. Giving SCHOOL_ADMIN write access was the original bug.

**Also:** HEADTEACHER has NO school-wide oversight — `canReviewAcademics`/`canReviewHomework` are ACADEMIC_ADMIN-only; Headteacher homework/academics views (web + mobile) are filtered through `teachingScope`/`teachingScopeCondition` in lib/access.ts (class+subject pairs, plus class-teacher classes for all subjects); out-of-scope mobile requests return 403 + `HOMEWORK_SCHOOLWIDE_ACCESS_DENIED` audit.

**How to apply:**
- `canCreateHomework(role)` → SUPER_ADMIN, HEADTEACHER, ACADEMIC_ADMIN, TEACHER only
- `teacherMayEnter()` in academics.ts: only SUPER_ADMIN bypasses the assignment check; HEADTEACHER and ACADEMIC_ADMIN must also have a `teacher_assignments` row (or be the `classTeacherId`) for the specific class+subject
- `createCurriculumTopicAction` in setup.ts: topicManagers = SUPER_ADMIN, HEADTEACHER, ACADEMIC_ADMIN (not SCHOOL_ADMIN)
- Homework page: `isMonitorOnly` flag set for SCHOOL_ADMIN and PROPRIETOR — shows monitoring header, no create form
- Homework-topics page: `canManageTopics` flag hides the create form for SCHOOL_ADMIN
- Mobile API GET route: unchanged (SCHOOL_ADMIN is still in HOMEWORK_ROLES for viewing)
