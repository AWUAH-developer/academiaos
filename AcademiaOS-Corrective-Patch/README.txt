AcademiaOS corrective patch

Fixes:
1. Restores the permanent AcademiaOS brand icon. The icon never disappears. Only the word "AcademiaOS" is consumed and rebuilt.
2. The complete AcademiaOS wordmark stays visible for about 4.3 seconds before the next eating cycle.
3. Restores an always-visible homework PDF/image upload control. Upload remains optional for typed/book homework and required when an upload source is selected.
4. Removes the curriculum-topics setup UI and removes the topic prerequisite from homework publishing.
5. Replaces native MM/DD/YYYY date fields with visible Ghana DD/MM/YYYY inputs across current web forms. Server values remain safe ISO dates where existing actions expect them.
6. Formats published homework due dates in Ghana DD/MM/YYYY style.
7. Includes corrected mobile and desktop animation source packages with a permanent mark and word-only animation.

No database tables are deleted. Existing curriculum-topic tables/data remain untouched but are no longer required by the UI.
