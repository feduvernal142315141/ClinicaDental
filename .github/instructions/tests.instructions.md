---
applyTo: "**/*.{test,spec}.{ts,tsx}"
---

This repository currently has no verified automated test setup in `package.json`, no detected test runner config, and no existing `*.test.*` or `*.spec.*` files.

Rules:
- If you are editing an existing test file, keep the style and toolchain already present in that file set.
- If you are asked to add the first tests for an area, do not silently invent a test runner inside unrelated product work. Call out the missing tooling or add it only when explicitly requested.
- Prefer regression-oriented coverage over broad rewrites.
- Mock at stable boundaries such as:
  - service functions
  - route handlers
  - permission helpers
  - odontogram adapters or store APIs
- Keep test scope small and tied to the touched behavior.
- When no automated tests are added, say so clearly and provide manual validation steps instead.

Validation:
- Only mention automated test commands that actually exist in the repo.
- Otherwise fall back to `yarn lint`, `yarn build`, and route-level manual checks.
