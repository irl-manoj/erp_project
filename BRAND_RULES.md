# Product Language and Visual Standards

Use these guidelines for future interface and documentation changes.

## Writing

- Write all user-facing text in clear, professional English.
- Prefer concise labels that describe the action or result.
- Use consistent capitalization and punctuation. Avoid slang, mixed-language copy, filler text, and exaggerated claims.
- Clearly identify the application as an educational demonstration, not an official university service.
- Do not describe seeded sample records as live institutional data.
- State file count and size limits next to upload controls.
- Keep legal and privacy copy aligned with the actual backend, cookie, database, and upload behavior.

## Visual design

- Keep the crimson, slate, and white palette consistent.
- Use Font Awesome icons consistently; do not add decorative emoji to interface controls.
- Prioritize readable contrast, accessible labels, keyboard operation, responsive layouts, and clear error states.
- Use subtle borders and restrained shadows. Avoid excessive gradients, motion, or decorative effects.
- Ensure displayed metrics are calculated from application data and are not decorative counters.

## Technical accuracy

- Academic records are stored server-side in SQLite for the local demonstration.
- Authentication and role checks are enforced by the Express API, not by hidden frontend controls.
- Assignment and submission files are stored in separate private upload folders and are available through authenticated routes.
- The included sample accounts are for local demonstration only. Never publish their shared demo password.
- The current system is not approved for official academic records or public institutional use without additional review and production deployment work.

## Before a release

- Run `npm test`, JavaScript syntax checks, and the preview smoke checks.
- Verify student and teacher login, permission boundaries, CRUD operations, and uploads/downloads.
- Confirm setup, privacy, terms, and deployment documentation matches the current behavior.
- Keep database files, uploaded documents, environment secrets, and local credentials out of version control.
