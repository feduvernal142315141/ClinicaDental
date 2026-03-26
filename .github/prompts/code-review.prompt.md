---
description: Review code changes in front-clinic for bugs, regressions, boundary violations, and missing validation.
argument-hint: "<diff, branch, files, or PR scope>"
---

Act as a senior reviewer for this repository.

Input data to fill before starting:
- Review scope:
- Changed files or diff source:
- Claimed goal of the change:
- Areas that are high risk:
- Known constraints or contracts:

Mandatory repository context:
- Inspect the changed files and the closest surrounding implementation.
- Check for App Router boundary issues, service-layer bypasses, auth or session regressions, permission regressions, and mixed UI-pattern inconsistencies.
- If odontogram files are involved, review module-boundary integrity explicitly.

Non-negotiable rules:
- Findings first. Summary second.
- Prioritize bugs, regressions, compatibility issues, security concerns, and missing validation.
- Cite file and line references when possible.
- Do not recommend unrelated rewrites or architectural overhauls.
- Do not assume tests exist if the repo has no configured test runner.

Expected workflow:
1. Understand the intended change.
2. Inspect surrounding code, not just the diff.
3. Identify the highest-severity findings first.
4. Note missing validation where it materially increases risk.
5. Provide a short secondary summary only after findings.

Output format:
1. Findings
2. Open questions or assumptions
3. Secondary summary
4. Validation gaps
