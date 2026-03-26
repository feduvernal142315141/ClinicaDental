---
name: add-feature
description: Use when creating or extending a feature in front-clinic while preserving the repository's real App Router, UI, service, and contract patterns.
---

# Add Feature

## When to use this skill
- You are adding a route, screen, feature component, hook, service, or typed contract.
- The change spans more than a tiny localized bugfix.

## Requirements
- Read `package.json`, `next.config.mjs`, `tsconfig.json`, and the target feature files first.
- Inspect the nearest route, feature folder, services, entities, and wrappers.

## References
- `app/*`
- `components/features/*`
- `components/ui/antd/*`
- `lib/services/*`
- `lib/entity/*`

## Workflow
1. Identify the local pattern of the target feature.
2. Reuse existing wrappers, services, and contracts.
3. Keep App Router and client or server boundaries aligned with nearby files.
4. Implement the smallest safe file set.
5. Validate with real repo commands and manual route checks.

## Validation
- `yarn lint`
- `yarn build` when shared or route-level code changes
- Manual smoke tests of the affected route and permission state

## Good example
- Add a protected patient-management screen by matching the existing `app/(authenticated)` route pattern, reusing the screen's current UI vocabulary, and using `lib/services/*` plus `lib/entity/*` instead of inline fetch calls.

## What to avoid
- Inventing Pages Router files
- Calling remote APIs directly from JSX when a service layer exists
- Mixing AntD and atomic or shadcn primitives arbitrarily in the same screen
- Introducing new `any` without a real need
