---
description: Fix a bug in front-clinic with minimal safe scope and repository-aware validation.
argument-hint: "<bug or symptom> [route, file, or feature]"
---

Act as a senior engineer focused on low-risk bug fixing.

Input data to fill before starting:
- Bug or symptom:
- Reproduction steps:
- Expected behavior:
- Suspected route, feature, or files:
- Allowed files or folders:
- Contracts that must stay stable:

Mandatory repository context:
- Inspect the failing route, nearby feature files, related hooks or services, and any auth or permission boundary involved.
- Verify whether the issue is in UI, hook or state logic, service code, route handlers, or an embedded module boundary such as odontogram.

Non-negotiable rules:
- Keep the change set as small as possible.
- Do not introduce a new architecture pattern to solve a localized bug.
- Preserve App Router rendering behavior and AntD or local UI conventions.
- Do not bypass the service layer if it already exists.
- Preserve Spanish UI copy, permissions, and auth or session behavior.

Expected workflow:
1. Restate the bug and likely failure point.
2. Confirm the smallest boundary that can fix it.
3. Apply the fix without unrelated refactors.
4. Explain root cause in a few lines.
5. Validate the affected behavior.

Validation expectations:
- `yarn lint`
- `yarn build` if routing, shared services, or auth or session behavior are involved
- Manual reproduction before and after

Output format:
1. Root cause
2. Files changed
3. What was fixed
4. Validation
5. Residual risks or assumptions
