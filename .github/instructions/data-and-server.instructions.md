---
applyTo: "lib/services/**/*.ts,lib/services/**/*.tsx,app/api/**/*.ts,app/api/**/*.tsx,lib/auth/server/**/*.ts,lib/auth/server/**/*.tsx,lib/odontogram/adapters/**/*.ts,lib/odontogram/adapters/**/*.tsx"
---

You are editing data, API, server, or adapter code in `front-clinic`.

Observed repository signals:
- Frontend HTTP access is centered on `lib/services/apiConfig.ts` and `lib/services/baseService.ts`.
- App Router route handlers exist under `app/api/auth/*`.
- OTP plus JWT auth refresh flows through `/api/auth/refresh`.
- Odontogram persistence is intentionally adapter-first.

Rules:
- Reuse the existing Axios stack in `lib/services/apiConfig.ts` and the service helpers in `lib/services/baseService.ts` when working on frontend HTTP access.
- Keep route handlers under `app/api/*`.
- Do not introduce server actions as a default pattern; they are not part of the current verified architecture.
- Preserve OTP plus JWT session behavior, including refresh through `/api/auth/refresh`, cookie handling, and token helpers.
- Extend contracts in `lib/entity/*` before falling back to weak typing.
- Preserve status-code handling and notification behavior expected by the current interceptor and services.
- Do not move remote access directly into UI code when a service layer, adapter, or route handler already exists.
- In `lib/odontogram/adapters/*`, keep the adapter responsible for persistence translation only. Do not leak host UI, auth context, or page shell concerns into the module boundary.
- Keep changes small and compatibility-first, especially for auth and odontogram flows.

Validation:
- Run `yarn lint`.
- Run `yarn build` for changes that affect routing, auth or session behavior, shared services, or exported contracts.
- Describe any manual verification needed for auth refresh, permissions, or persistence flows.
