---
applyTo: "app/**/*.tsx,components/**/*.tsx"
---

You are editing presentation code in `front-clinic`.

Observed repository signals:
- App Router is active under `app/*`.
- `app/layout.tsx` delegates global providers and the app shell to `components/layout/root-client.tsx`.
- Ant Design wrappers live under `components/ui/antd/*`.
- Other areas also use `components/ui/atomic/*` and `components/ui/primitives/shadcn/*`.

Rules:
- Respect App Router boundaries. Do not introduce Pages Router patterns.
- Preserve the current rendering model of the touched file. Many route pages are client components, while some layouts stay server-rendered.
- Reuse the local UI vocabulary of the touched feature:
  - use `components/ui/antd/*` in AntD-based areas
  - keep atomic or shadcn primitives in areas that already use them
- Avoid mixing unrelated design vocabularies inside the same screen unless the surrounding code already does so.
- Keep remote calls out of pure UI components when the feature already has hooks, services, adapters, or route handlers handling that work.
- Preserve `AppShellAntd`, root providers, and route shell behavior.
- Keep visible copy in Spanish.
- Check permissions before exposing actions. Prefer `usePermission` and `PermissionAction`.
- Preserve date and time input or output formats already used by the feature.
- If a UI change touches odontogram host integration, keep the module boundary in `lib/odontogram/*` intact.

Validation:
- Run `yarn lint` when practical.
- Manually smoke-test the affected route, loading states, empty states, and permission states.
