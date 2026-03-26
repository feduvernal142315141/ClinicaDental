---
name: fix-bug
description: Use when fixing a bug in front-clinic with minimal scope, compatibility-first changes, and repository-aware validation.
---

# Fix Bug

## When to use this skill
- You have a reproducible bug, regression, or broken route or feature behavior.
- The goal is a focused fix, not a redesign.

## Requirements
- Read `AGENTS.md` plus any nested `AGENTS.md` files that apply to the failing area.
- Inspect the failing route or component and the nearest hook, service, or route handler involved.

## References
- `app/*`
- `components/features/*`
- `lib/hooks/*`
- `lib/services/*`
- `app/api/auth/*`

## Workflow
1. Restate the bug and likely failure point.
2. Limit the scope to the smallest safe boundary.
3. Patch the root cause without opportunistic refactors.
4. Preserve rendering model, service boundaries, and Spanish UI copy.
5. Validate the exact behavior that failed.

## Validation
- `yarn lint`
- `yarn build` when shared services, routing, or auth or session flows are affected
- Manual reproduction before and after

## Good example
- Fix a broken patient detail action by adjusting the page, hook, or service that owns it, without replacing the feature's service or permission pattern.

## What to avoid
- Refactoring the whole feature during a bugfix
- Bypassing existing services or permission checks
- Changing route behavior unless the bug requires it
