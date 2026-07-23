# Project guide routing

Load guides from `docs/development/` according to the task:

| Topic | Guide |
|---|---|
| authority and project snapshot | `docs/development/README.md` |
| dependencies and supported tooling | `docs/development/technology-stack.md` |
| layers, providers, domains, odontogram | `docs/development/architecture.md` |
| TypeScript, React, UI, forms, state | `docs/development/coding-standards.md` |
| endpoints, responses, errors, queries | `docs/development/api-contracts.md` |
| persistence, local storage, backend DB boundary | `docs/development/data-and-database.md` |
| auth, cookies, privacy, headers | `docs/development/security.md` |
| build, variables, release, rollback | `docs/development/deployment.md` |
| typecheck, lint, build and manual checks | `docs/development/quality-and-testing.md` |
| task lifecycle and skill selection | `docs/development/development-workflow.md` |
| compatibility exceptions and debt | `docs/development/known-constraints.md` |

Read `docs/technical/form-validation-standard.md` for form work.

Use code and the closest `AGENTS.md` when a guide conflicts with current
implementation. Update the guide in the same change when the code intentionally
changes a durable rule.
