"""
PeoplePay360 AI Service — FastAPI microservice.

Endpoints:
  POST /ai/query         — NL question → intent + params → natural-language answer
  POST /ai/anomaly-scan  — async payrun anomaly detection
  GET  /ai/forecast      — simple trend projection over payrun history

Run: uvicorn main:app --reload --port 8001
"""

from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from intent import classify_intent
from anomaly import scan_payrun
from forecast import project_next_period

app = FastAPI(
    title="PeoplePay360 AI Service",
    description="AI Copilot for HR & Payroll — intent classification, anomaly detection, forecasting",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryIn(BaseModel):
    question: str


class AnomalyScanIn(BaseModel):
    payrun_id: int


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}


@app.post("/ai/query")
def ai_query(payload: QueryIn):
    """
    Natural language question → intent classification → parameters.
    Dev 4 will expand this to call the main API's dashboard endpoints
    and compose a natural-language answer.
    """
    intent, params = classify_intent(payload.question)
    return {"intent": intent, "params": params, "question": payload.question}


@app.post("/ai/anomaly-scan")
def anomaly_scan(payload: AnomalyScanIn, authorization: str = Header(default="")):
    """
    Called async after payrun validation.
    Checks for: duplicate payslips, salary outliers, missing required fields.
    Writes findings to audit_logs via the main API.
    """
    return scan_payrun(payload.payrun_id, authorization)


@app.get("/ai/forecast")
def forecast_endpoint():
    """
    Simple trend projection over historical payrun net totals.
    """
    return project_next_period()
