---
name: odontogram-module
description: Use when a task touches the embedded odontogram module in front-clinic, including `components/features/odontogram/*`, `lib/odontogram/*`, the patient host wrapper, odontogram persistence, or clinical documentation. This skill preserves the module boundary, keeps persistence adapter-first, and prevents host-only concerns from leaking into the module.
---

# Odontogram Module

## Use this skill when

- You are fixing, extending, or refactoring the odontogram module.
- You are changing odontogram UI, store, adapters, persistence, visual states, or exports.
- You are integrating the odontogram into patient pages or wrappers.
- You are documenting odontogram API contracts, schema decisions, or unresolved clinical rules.

## Do not use this skill when

- The task is a generic auth, appointments, or patients change with no odontogram impact.
- The change belongs entirely to a standard feature flow under `page -> component -> hook -> service -> entity`.

## Read first

1. `.github/copilot-context.md`
2. `.github/prompts/odontograma-modulo.prompt.md`
3. `lib/odontogram/index.ts`
4. `lib/odontogram/store.tsx`
5. `components/features/odontogram/*`
6. `components/features/patients/detail/PatientOdontogramPanel.tsx`

Read these docs when relevant:

- `docs/ODONTOGRAM_API.md`
- `docs/odontogram-database-schema.md`
- `docs/odontograma-cuestionario-especialista.md`

## Working rules

1. Classify the change before editing:
   - `module-ui`
   - `module-state`
   - `module-adapter`
   - `host-wrapper`
   - `clinical-docs`
2. Keep the module boundary intact:
   - Specialized UI in `components/features/odontogram/*`
   - Public API, store, and adapters in `lib/odontogram/*`
   - Host-specific permissions, toasts, auth, and patient context in wrappers
3. Inside `lib/odontogram/*`, do not introduce imports from:
   - `lib/services/*`
   - `lib/contexts/*`
   - app routing or page shell components
4. If the task needs backend sync, add or update an adapter instead of wiring the module directly to host services.
5. Never reintroduce hardcoded metadata such as `current-user` or `current-visit`.
6. Keep user-facing copy in Spanish.
7. If a clinical rule is ambiguous, document the assumption or add the gap to `docs/odontograma-cuestionario-especialista.md`.

## Validation checklist

- No host-only imports leaked into `lib/odontogram/*`
- Public exports still work through `lib/odontogram/index.ts`
- Patient wrapper still injects patient and clinic context correctly
- Adapter metadata stays explicit and typed
- Module-specific changes are described separately from unrelated repo lint debt

## Response checklist

- Scope of the odontogram change
- Files touched
- Boundary or compatibility risks
- Recommended validation steps
