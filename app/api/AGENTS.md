# AGENTS.md for `app/api/*`

Use this guidance when editing Next.js route handlers.

## Handler Boundaries
- Keep route handlers under `app/api/*`.
- Route handlers are server-side integration boundaries. Do not import UI components, Ant Design APIs, browser-only helpers, or route shell code here.
- Prefer existing auth helpers under `lib/auth/server/*` when a handler touches cookies, tokens, or backend auth flows.
- Preserve current JSON response contracts, status codes, and defensive error handling unless a change is explicitly required.
- Do not introduce server actions as a replacement for an existing route-handler workflow unless the architecture changes first.

## Auth and Session Rules
- Preserve OTP plus JWT session behavior and refresh through `/api/auth/refresh`.
- Keep cookie reads and writes aligned with the existing helpers instead of inlining new cookie behavior.
- Do not leak frontend notification concerns into handlers.

## Validation
- Run `yarn lint`.
- Run `yarn build` for changes that affect auth, cookies, routing, or shared server helpers.
- Describe manual verification for refresh, unauthorized, and expired-session scenarios when relevant.
