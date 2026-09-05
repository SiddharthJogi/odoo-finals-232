# AI_CODING_ASSISTANT_RULES.md

> Paste this into Claude Code, Cursor, Copilot Chat, or Gemini CLI at the start of any session on this repo, so AI-generated code matches our conventions instead of generic scaffolding.

## 1. Project Context (always assume this)

You are working on **PeoplePay360**, an HR & Payroll platform: Node.js/Express + PostgreSQL backend, React/Vite/Tailwind frontend, a separate FastAPI `ai-service`. Full schema and API contract are in `DATA_MODEL_AND_API.md` — treat it as ground truth, do not invent new tables or endpoints without checking it first.

## 2. Code Completeness

- Never output `// TODO: implement`, `// rest of code`, or stub functions that return fake success.
- Every function must be complete, runnable, and include input validation and error handling.
- If a request is genuinely ambiguous (e.g. exact leave-accrual policy), implement a clearly-labeled reasonable default and say so — don't silently guess.

## 3. Layering Discipline (see `ARCHITECTURE.md`)

- `*.routes.js` → attaches middleware, maps to controller. No logic here.
- `*.controller.js` → parses request, calls service, shapes HTTP response. No SQL, no business rules here.
- `*.service.js` → **all** business logic (contract period resolution, salary rule sequencing, leave balance math) lives here.
- `*.repository.js` → the only place allowed to contain SQL / query-builder calls for that module.
- A module's repository must never be imported by another module's service. Cross-module data access goes through the other module's exported service function.

## 4. Payroll-Specific Rules (non-negotiable)

1. **Salary Rules are config, not code.** Never hardcode a payslip's Net Salary or any rule's value in application code. All computation must read `salary_rules` rows and run through `ruleEngine.js`.
2. **Formula evaluation must be sandboxed.** Never use raw `eval()` on user-supplied formula text. Use the whitelist-pattern + `new Function(...knownContextKeys)` approach in `safeFormula.js`, or an equivalent restricted evaluator. No filesystem, network, or `process` access from inside a formula.
3. **No silent fallback on payroll errors.** If a contract can't be resolved for a period, or a required salary rule base is missing, throw a typed error (`PayrollError`) — never return a payslip with a guessed or zeroed value without setting `has_warning = true` and a `warning_reason`.
4. **Money fields are `NUMERIC`, not floating point**, and rounded consistently (2 decimal places) only at the final display/storage step, not mid-calculation.

## 5. Security Rules

1. RBAC is enforced in `middleware/rbac.js` on every protected route — never rely on hiding a button in the frontend as the only protection.
2. A user can never modify their own `role_id` — that endpoint is admin-only and must reject self-targeting unless the actor is a different admin, per spec ("users must not be able to assign or elevate their own roles").
3. Validate every write endpoint's body with a `*.validation.js` schema (zod/joi) before it reaches the service layer. Reject unknown fields.
4. Passwords: bcrypt hash only, never log or return `password_hash` in any API response.
5. All secrets (`JWT_SECRET`, DB URL, SMTP creds) come from `.env` via `config.js`, which must throw at startup if any required var is missing — never fall back to a hardcoded default secret.

## 6. Data Realism Rule

Never write a seed or demo script that inserts a payslip, dashboard number, or chart data point directly — insert employees/contracts/attendance/time-off/payrun *inputs* and let the app's own service-layer functions (the rule engine, the leave-balance transaction) produce the resulting numbers. If a suggested piece of code would let the dashboard show a number nothing in the DB actually produced, don't write it.

## 7. Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Files, variables, functions | `camelCase.js` for files inside a module, `camelCase` for vars/fns | `hrCore.service.js`, `getApplicableContract()` |
| Classes / typed errors | `PascalCase` | `PayrollError`, `ValidationError` |
| DB tables/columns | `snake_case` | `salary_rules`, `base_code` |
| REST paths | `/api/<module-kebab>/<resource>` | `/api/time-off/requests` |
| React components | `PascalCase.jsx` | `PayrunWizard.jsx` |

## 8. Before Suggesting Any AI-Generated Snippet

Ask yourself, and state briefly if non-obvious:
1. Does this belong in the layer I'm putting it in?
2. Does it touch payroll money math — if so, does it go through the rule engine, and is it sandboxed if it evals a formula?
3. Does it bypass RBAC or validation "just for now"? (Never acceptable, even temporarily — it gets forgotten.)
4. Would a judge reading this file conclude the number displayed came from real logic, or would they suspect it's hardcoded?

The person using you should understand every line well enough to explain it to a judge live — don't paste anything you can't also explain in one sentence.
