# AGENTS.md for `lib/odontogram/*`

Use this guidance when editing the embedded odontogram module core.

## Module Boundary
- `lib/odontogram/*` is the embedded module boundary for public API, state, domain logic, and adapters.
- Keep host-only UI, patient wrappers, app routing, page-shell code, and auth-context concerns out of the module core.
- Host integration belongs in wrappers such as patient detail panels, not inside module internals.
- Preserve public exports from `lib/odontogram/index.ts` when contracts change.

## Persistence Rules
- Keep persistence adapter-first.
- Adapter files may bridge to the existing odontogram service layer when needed, but that dependency must stay inside the adapter boundary.
- Do not wire module UI directly to host screens or page routes for persistence.
- Do not reintroduce hardcoded metadata such as `current-user` or `current-visit`.

## Compatibility Rules
- Preserve store contracts, snapshot semantics, and adapter metadata expectations unless a change is explicitly required.
- Keep user-facing copy in Spanish.
- If a clinical rule is ambiguous, document the assumption instead of silently guessing.

## Validation
- Confirm host-only concerns did not leak into module core files.
- Confirm public exports still work through `lib/odontogram/index.ts`.
- Separate module-specific issues from unrelated global repo debt.
