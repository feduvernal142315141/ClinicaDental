---
name: clinic-flow-development
description: Use when planning or implementing cross-cutting development in Clinic Flow 360, selecting the correct repository guide or specialized skill, changing architecture or shared contracts, or working across routes, UI, hooks, services, data, security, quality, and deployment while preserving front-clinic patterns.
---

# Clinic Flow Development

## Objective

Implement repository-aligned changes using the current code as authority.
Route each task to the minimum technical guidance and specialized skill needed.

## Required context

1. Read root `AGENTS.md` and every nested `AGENTS.md` governing touched files.
2. Read `package.json`, `next.config.mjs`, `tsconfig.json`, and nearest stable
   implementation files before proposing a structural change.
3. Read `references/project-guides.md` and load only the guides relevant to the
   task.
4. Inspect `git status`; preserve unrelated user changes.

## Workflow

1. Classify the task as feature, bug, refactor, review, odontogram, auth,
   contract/data, security, quality, or deployment.
2. Use the most specific repository skill when one applies. Keep this skill as
   the cross-cutting coordinator.
3. Identify the owning boundary and existing local pattern.
4. Separate frontend work from backend/database work. Never invent database
   schema or backend behavior from frontend types.
5. Design the smallest compatible change, including permissions, error states,
   accessibility, privacy, and migration needs.
6. Implement through typed contracts and established services/adapters; keep
   route and presentation layers thin.
7. Run proportional validation and report commands and unverified areas
   honestly.
8. Update guides and instruction files when a durable rule changes.

## Non-negotiable guardrails

- Use App Router; preserve server/client boundaries.
- Keep remote access in services, adapters, or route handlers.
- Keep DTO and entity contracts typed under `lib/entity/*`.
- Preserve the local UI vocabulary; prefer Bento/Radix primitives for new code
  and wrappers for existing AntD areas.
- Keep visible copy in Spanish.
- Use `usePermission` and `PermissionAction`; backend authorization remains
  mandatory.
- Keep odontogram host concerns outside `lib/odontogram/*`.
- Never put secrets in `NEXT_PUBLIC_*`, logs, docs, fixtures, or client storage.
- Do not claim tests, database guarantees, deployment behavior, or security
  controls that are not present.

## Escalation points

Request a decision before:

- changing an external API contract incompatibly;
- defining a database migration or clinical rule without backend evidence;
- replacing a shared provider, auth flow, persistence format, or UI system;
- introducing test, CI, deployment, i18n, or state-management tooling;
- expanding scope from a focused fix into a migration.

## Validation

Use `yarn typecheck`, `yarn lint`, and `yarn build` according to risk. Add manual
checks for routes, permissions, auth, empty/error states, responsive UI, theme
and accessibility. Do not treat a successful build as TypeScript or lint
success because the build currently ignores both classes of error.
