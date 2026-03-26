# AGENTS.md for `app/*`

Use this guidance when editing routes, layouts, loading states, or route-level composition under `app/*`.

## Route and Layout Rules
- This repo uses App Router. Do not introduce Pages Router files or patterns.
- Preserve the current rendering model of the touched file. Many pages are client components, while layouts such as `app/layout.tsx` and `app/(authenticated)/layout.tsx` remain server components.
- Keep route handlers in `app/api/*`; do not replace them with server actions by default.
- Preserve metadata, loading UI, route grouping, and current navigation behavior unless a change is explicitly required.
- `app/layout.tsx` delegates provider and shell composition to `components/layout/root-client.tsx`; avoid duplicating global providers elsewhere.
- `app/(authenticated)/layout.tsx` is intentionally light. Do not move shell logic back into it unless the architecture changes first.

## Composition Rules
- Reuse feature components under `components/features/*` instead of building large route pages inline.
- Keep remote access out of route JSX when the feature already has services, adapters, or hook boundaries.
- Respect permission checks before surfacing protected actions.
- Keep visible copy in Spanish.

## Validation
- Run `yarn lint` when practical.
- Manually smoke-test the affected route, loading state, empty state, and permission state.
