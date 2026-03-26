---
name: odontogram-module
description: Use when a task touches the embedded odontogram module in front-clinic, including `components/features/odontogram/*`, `lib/odontogram/*`, patient host wrappers, odontogram persistence, or clinical documentation.
---

# Odontogram Module

## When to use this skill
- You are fixing, extending, or refactoring the odontogram module.
- You are changing odontogram UI, store, adapters, persistence, visual states, exports, or patient wrapper integration.
- You are documenting odontogram API contracts, schema decisions, or unresolved clinical rules.

## Requirements
- Read `AGENTS.md`, `components/features/odontogram/AGENTS.md`, and `lib/odontogram/AGENTS.md` when they apply.
- Inspect `lib/odontogram/index.ts`, `lib/odontogram/store.tsx`, `components/features/odontogram/*`, and the patient host wrapper before editing.

## References
- `lib/odontogram/*`
- `components/features/odontogram/*`
- `components/features/patients/detail/PatientOdontogramPanel.tsx`
- `docs/ODONTOGRAM_API.md`
- `docs/odontogram-database-schema.md`
- `docs/odontograma-cuestionario-especialista.md`

## Workflow
1. Classify the change as module UI, module state, module adapter, host wrapper, or clinical docs.
2. Keep the module boundary intact:
   - specialized UI in `components/features/odontogram/*`
   - public API, state, domain logic, and adapters in `lib/odontogram/*`
   - host-specific permissions, toasts, and patient context in wrappers
3. Keep host-only UI, contexts, and routing out of the module core.
4. If the task needs backend sync, solve it through adapters. Adapter files may call the existing odontogram service bridge when needed.
5. Never reintroduce hardcoded metadata such as `current-user` or `current-visit`.
6. Keep user-facing copy in Spanish.
7. If a clinical rule is ambiguous, document the assumption or add the gap to existing odontogram docs.

## Validation
- No host-only concerns leaked into module core files
- Public exports still work through `lib/odontogram/index.ts`
- Patient wrapper still injects patient and clinic context correctly
- Adapter metadata stays explicit and typed
- Module-specific notes are separated from unrelated repo debt

## Good example
- Add a new odontogram persistence behavior by updating an adapter and preserving the existing `OdontogramModule` public surface consumed by patient wrappers.

## What to avoid
- Wiring odontogram UI directly to host pages or route navigation
- Moving patient-specific logic into module core files
- Breaking the public module entrypoints without updating exports and integration callers
