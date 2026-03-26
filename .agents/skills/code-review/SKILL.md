---
name: code-review
description: Use when reviewing changes in front-clinic for regressions, boundary violations, auth or permission issues, and missing validation.
---

# Code Review

## When to use this skill
- You are reviewing a diff, pull request, staged changes, or a focused file set.
- The goal is to find risk, not to rewrite the feature.

## Requirements
- Read `AGENTS.md` plus any nested `AGENTS.md` files that apply to the touched paths.
- Inspect surrounding files, not just the changed lines.

## References
- `app/*`
- `components/features/*`
- `lib/services/*`
- `app/api/auth/*`
- `lib/odontogram/*`

## Workflow
1. Understand the intended change.
2. Inspect nearby implementation for compatibility.
3. Report findings ordered by severity.
4. Call out missing validation when it increases risk.
5. Keep the summary secondary.

## Validation
- Cite file and line references when possible.
- Do not assume automated tests exist.
- Mention manual checks or missing coverage honestly.

## Good example
- Review a diff touching `app/api/auth/refresh/route.ts` and `lib/services/apiConfig.ts` for token-refresh regressions, retry-loop risks, and compatibility with the existing interceptor flow.

## What to avoid
- Long architecture debates with no concrete findings
- Treating style nits as the primary output
- Ignoring module-boundary violations in odontogram code
