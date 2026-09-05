# PeoplePay360 — Judges Defense & Pitch Guide

## 1. Likely Rubric

| Pillar | What they're really checking |
|---|---|
| Technical depth | Is there a real calc engine, or hardcoded numbers? Is RBAC real or cosmetic? |
| Completeness | Does the full flow (employee → contract → attendance/leave → payrun → payslip → dashboard) run live, end to end, without a "this part is mocked" caveat? |
| Data realism | Is the dashboard reading real DB aggregates, or a static chart image? |
| Innovation / fit | Does the X-factor actually solve something in this domain, or is it bolted on? |
| Presentation | Can the team explain *why* they made each architectural choice, not just *what* they built? |

## 2. Checkpoint Talking Points (tie to `SPRINT_PLAYBOOK_24H.md` checkpoints)

**Checkpoint 1 (Hour 6):** "We locked our schema and API contract in the first hour, so all four of us have been building against real endpoints in parallel — not waiting on each other, not mocking data we'd have to rip out later."

**Checkpoint 2 (Hour 13):** "Watch this: I'll approve this leave request — see the balance drop in real time — then open a Payrun and this same employee's eligibility and contract data feeds directly into it. Nothing here is siloed screens; it's one data model."

**Checkpoint 3 (Hour 19):** "Here's the part that's not just CRUD: our Salary Rules are database rows, not if/else code. Watch me open Salary Rules, and the sequencing and computation methods — Fixed, Percentage, Formula — actually drive this payslip you're looking at. Add a new allowance rule right now and it appears on the next computed payslip with zero code changes."

## 3. The Core Technical Defense (rehearse this exact framing)

> "Most hackathon HR/payroll clones store attendance, leave, and salary as disconnected tables with UI on top. We built the two pieces of real business logic the spec actually demands: **period-aware contract resolution** — payroll always resolves the one contract valid for the selected period, even with contract history — and a **sequenced, config-driven salary rule engine** that supports fixed amounts, percentages of any other rule's output, and sandboxed formulas for things like attendance-based deductions. Salary Structures are containers of ordered rules, and Payslips are the *output* of running that engine, never manually typed numbers."

## 4. X-Factor Defense: AI Copilot + Anomaly Detection

**Why this and not blockchain/generic AI chatbot:**
> "We looked at Odoo's own published Odoo 20 roadmap. Two of their headline AI directions are an 'Intelligent Business Assistant' for natural-language operational queries, and 'Smarter Business Analytics' — predictive, not just reactive, dashboards. We built toward that exact direction instead of inventing an unrelated gimmick: our AI service answers natural-language questions like 'what's our total salary cost for Engineering this month' by classifying intent and calling our own real dashboard aggregation endpoints — no hallucinated numbers, because the LLM never invents the answer, it only routes the question. It also runs anomaly detection on every validated Payrun: duplicate payslips, salary values that deviate significantly from an employee's own trailing average, and missing required data like bank details — all surfaced in the dashboard warnings feed the spec explicitly asks for, just made intelligent instead of a static rule check."

**If asked "isn't that just a wrapper around your own API?"**
> "Yes, intentionally — that's the safe way to do NL-to-data in a system handling real money. We never let the LLM write or execute a raw SQL query. It classifies intent and extracts parameters; those bind to pre-built, parameterized aggregate queries we already validated. That's a deliberate security and correctness choice, not a limitation."

## 5. Anticipated Hard Questions

| Question | Answer |
|---|---|
| "What happens with overlapping contracts?" | App-level check + service-layer transaction blocks creating a second active contract with an overlapping date range for the same employee; period resolution query always picks the one valid contract for the payroll period. |
| "How do you stop a user from giving themselves the Admin role?" | Role field is only writable through the Admin-only `/users/:id/role` endpoint, checked server-side by RBAC middleware — never exposed on a user's own profile-update route. |
| "What if the formula rule references a rule that hasn't been computed yet?" | Rules execute strictly in `sequence` order; a formula can only reference `code`s of already-computed rules in that pass — this is enforced by validation when a structure is saved, not caught at payslip time. |
| "Why Postgres and not Mongo/NoSQL?" | Payroll is inherently relational — contracts, employees, structures, payslips are all FK-linked, and money data needs transactional integrity (leave-balance deduction, payslip creation) that a document store makes harder, not easier. |
| "How does this scale to 10,000 employees?" | Payslip/attendance tables are already period+employee indexed; Payrun processing can be moved to a background job queue without changing the rule engine; modules are already logically separated for a future microservices split (see `ARCHITECTURE.md` §7). |
| "What's still missing / would you add with more time?" | SSO, password reset flows, shift/flexible-schedule variants beyond the basic weekly pattern, deeper AI: automated leave-conflict detection across a team, predictive attrition risk. Be honest here — judges respect a clear-eyed roadmap over false completeness claims. |

## 6. 3-Minute Pitch Structure

```
[0:00-0:25] Hook: "HR teams manage employees, attendance, leave, and payroll as
            disconnected tools. We built one connected system where a leave
            approval, a contract, and a payslip are the same data, not three copies."
[0:25-1:45] Live demo: Employee → Contract → approve a Time Off request (balance
            drops live) → open Payrun wizard → show Salary Rules driving computed
            Payslip → Mark Paid → generate PDF.
[1:45-2:20] Dashboard + AI: filter dashboard by department, ask the AI Copilot a
            real question, show an anomaly flag surfacing automatically.
[2:20-2:45] Architecture in one breath: layered modules, config-driven rule
            engine, RBAC enforced server-side, AI isolated as its own service
            so it can never take payroll down.
[2:45-3:00] Close: "Built toward where Odoo's own roadmap is headed — AI-assisted,
            predictive, not just CRUD." Thank you, open for questions.
```

## 7. Do / Don't During Q&A

- **Do** open real code (rule engine, RBAC middleware) if asked "show me" — never just describe it.
- **Do** admit scope cuts plainly (see roadmap answer above) rather than pretend everything is finished.
- **Don't** claim the AI "understands payroll" — be precise: it classifies intent and calls validated endpoints.
- **Don't** let one person answer everything — each dev should be ready to defend their own module live.
