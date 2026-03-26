# AGENTS.md for `components/features/odontogram/*`

Use this guidance when editing specialized odontogram UI.

## Module UI Boundary
- This folder owns specialized odontogram presentation, not host app orchestration.
- Keep persistence, host auth, route decisions, and patient wrapper concerns out of this UI layer.
- If a change needs new persistence behavior, push it into `lib/odontogram/adapters/*` or the host wrapper instead of wiring remote calls into the UI.
- Keep module-facing copy in Spanish.

## State and Contract Rules
- Reuse the public module API and store contracts exposed from `lib/odontogram/*`.
- Preserve public props and the current integration surface expected by `lib/odontogram/OdontogramModule.tsx`.
- Do not introduce host-only dependencies such as app shell components, auth contexts, or page routing into this folder.
- If a clinical rule is ambiguous, document the assumption near the change or in existing odontogram docs when appropriate.

## Validation
- Confirm the UI still works through the public module entrypoint, not only when rendered directly.
- Separate odontogram-specific validation notes from unrelated global repo debt.
