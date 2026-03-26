# AGENTS.md for `lib/services/*`

Use this guidance when editing frontend service-layer code.

## Service Layer Rules
- Reuse the existing Axios stack in `lib/services/apiConfig.ts`.
- Reuse `serviceGet`, `servicePost`, `servicePut`, `serviceDelete`, and `servicePatch` from `lib/services/baseService.ts` when the existing pattern fits.
- Extend typed request and response contracts in `lib/entity/*` before falling back to weak typing.
- Preserve interceptor assumptions around notifications, refresh, and status-code handling.
- Keep services free of UI, routing, and component concerns.

## Compatibility Rules
- Preserve endpoint compatibility, response handling, and naming patterns unless a change is explicitly required.
- Keep date and time contracts aligned with the existing repo conventions.
- Do not move service concerns into components or route pages when a service module already exists.

## Validation
- Run `yarn lint`.
- Run `yarn build` for shared service changes or contract changes.
- Describe manual verification for affected request and error flows.
