# PeoplePay360 — Directory Skeleton & Starter Boilerplate

> Copy this layout on Hour 0. Every dev creates their module folder immediately so there are zero empty-folder merge surprises later.

## 1. Repo Layout

```
peoplepay360/
├── .env.example
├── .gitignore
├── docker-compose.yml            # postgres only
├── README.md / ARCHITECTURE.md / DATA_MODEL_AND_API.md / ... (this kit)
│
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js                 # express app, middleware wiring
│   │   ├── db.js                  # pg pool
│   │   ├── config.js              # reads .env, fails fast if missing vars
│   │   ├── middleware/
│   │   │   ├── auth.js            # verifies JWT
│   │   │   └── rbac.js            # requireRole('hr_manager', ...) factory
│   │   └── modules/
│   │       ├── hr-core/           # Dev 1
│   │       │   ├── hrCore.routes.js
│   │       │   ├── hrCore.controller.js
│   │       │   ├── hrCore.service.js
│   │       │   ├── hrCore.repository.js
│   │       │   └── hrCore.validation.js
│   │       ├── time-ops/          # Dev 2
│   │       ├── payroll/           # Dev 3
│   │       │   ├── payroll.routes.js
│   │       │   ├── payroll.controller.js
│   │       │   ├── payroll.service.js
│   │       │   ├── payroll.repository.js
│   │       │   ├── ruleEngine.js  # the salary calc engine — Dev 3 owns this file, guard it
│   │       │   └── pdf.js         # payslip PDF generation
│   │       └── dashboard/         # Dev 4
│   │           ├── dashboard.routes.js
│   │           ├── dashboard.controller.js
│   │           └── dashboard.service.js
│   ├── migrations/
│   │   ├── 001_init_schema.sql
│   │   └── 00N_....sql            # one file per change, numbered, never edited retroactively
│   └── scripts/
│       └── seed.js                # calls service-layer functions, see DATA_MODEL_AND_API.md §4
│
├── frontend/
│   ├── package.json
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                 # top nav + router
│   │   ├── api/client.js           # axios instance, attaches JWT
│   │   ├── auth/                   # login page, AuthContext
│   │   ├── components/ui/          # shadcn components
│   │   ├── modules/
│   │   │   ├── employees/          # Dev 1: Kanban.jsx, List.jsx, Form.jsx
│   │   │   ├── attendance/         # Dev 2: CheckInWidget.jsx, List.jsx
│   │   │   ├── time-off/           # Dev 2: Requests.jsx, Allocations.jsx, Types.jsx
│   │   │   ├── payroll/            # Dev 3: PayrunWizard.jsx, PayslipView.jsx, Structures.jsx
│   │   │   └── dashboard/          # Dev 4: Dashboard.jsx, charts/
│   │   └── styles/tailwind.css
│
└── ai-service/                     # Dev 4, separate deployable
    ├── requirements.txt
    ├── main.py                     # FastAPI app: /ai/query, /ai/anomaly-scan, /ai/forecast
    ├── intent.py                   # NL question -> {intent, params}
    ├── anomaly.py                  # stats-based outlier + duplicate/missing-field checks
    └── forecast.py                 # simple linear trend on payrun history
```

## 2. Starter Snippets (adapt, don't paste blindly — see `AI_CODING_ASSISTANT_RULES.md`)

### `backend/src/config.js`
```javascript
const required = ['DATABASE_URL', 'JWT_SECRET', 'PORT'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
}
module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  port: process.env.PORT,
};
```

### `backend/src/middleware/rbac.js`
```javascript
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthenticated' });
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}
module.exports = { requireRole };
```

### `backend/src/modules/payroll/ruleEngine.js` (the piece judges will ask about)
```javascript
const { evaluateFormula } = require('./safeFormula'); // whitelisted-var sandbox, no raw eval

async function computePayslip({ contract, structure, rules, workedDays }) {
  const context = { contract_wage: Number(contract.wage), worked_days: workedDays };
  const lines = [];

  for (const rule of rules.sort((a, b) => a.sequence - b.sequence)) {
    let value;
    switch (rule.calc_method) {
      case 'fixed':
        value = Number(rule.amount);
        break;
      case 'percentage':
        value = (context[rule.base_code.toLowerCase()] ?? 0) * (Number(rule.amount) / 100);
        break;
      case 'formula':
        value = evaluateFormula(rule.formula_text, context); // sandboxed
        break;
      default:
        throw new Error(`Unknown calc_method: ${rule.calc_method}`);
    }
    context[rule.code.toLowerCase()] = value;
    lines.push({ rule_id: rule.id, label: rule.name, category: rule.category, sequence: rule.sequence, value });
  }

  const gross = lines.filter(l => ['basic', 'allowance'].includes(l.category))
                      .reduce((sum, l) => sum + l.value, 0);
  const deductions = lines.filter(l => l.category === 'deduction')
                           .reduce((sum, l) => sum + l.value, 0);

  return { lines, gross_total: gross, net_total: gross - deductions };
}

module.exports = { computePayslip };
```

### `backend/src/modules/payroll/safeFormula.js` (sandboxing — do not skip this)
```javascript
// Whitelist-only evaluator: no access to global scope, require(), process, fs, etc.
// Only arithmetic on known context keys is allowed.
function evaluateFormula(formulaText, context) {
  const allowedPattern = /^[a-z0-9_ +\-*/().]+$/i;
  if (!allowedPattern.test(formulaText)) {
    throw new Error('Formula contains disallowed characters');
  }
  const fn = new Function(...Object.keys(context), `"use strict"; return (${formulaText});`);
  return fn(...Object.values(context));
}
module.exports = { evaluateFormula };
```

### `ai-service/main.py` skeleton
```python
from fastapi import FastAPI
from pydantic import BaseModel
from intent import classify_intent
from anomaly import scan_payrun
from forecast import project_next_period

app = FastAPI(title="PeoplePay360 AI Service")

class QueryIn(BaseModel):
    question: str

@app.post("/ai/query")
def ai_query(payload: QueryIn):
    intent, params = classify_intent(payload.question)
    return {"intent": intent, "params": params}

@app.post("/ai/anomaly-scan")
def anomaly_scan(payload: dict):
    return scan_payrun(payload["payrun_id"])

@app.get("/ai/forecast")
def forecast():
    return project_next_period()
```

## 3. `.env.example`
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/peoplepay360
JWT_SECRET=change_me_before_demo
PORT=4000
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=
SMTP_PASS=
AI_SERVICE_URL=http://localhost:8001
```

## 4. Git Workflow

- `main` is always demo-able. Never push broken code directly to `main` after Hour 4.
- Branch naming: `dev1/hr-core-contracts`, `dev3/payroll-rule-engine`, etc.
- PR into `main` at every checkpoint (see `SPRINT_PLAYBOOK_24H.md`), small PRs, not one 2000-line dump at hour 23.
- `backend/migrations/` conflicts are resolved by whoever's change came second rebasing their file to the next number — never edit someone else's migration file.
