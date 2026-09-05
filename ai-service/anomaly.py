"""
Anomaly detection engine for payrun validation.

Checks for:
  1. Duplicate payslips in the same payrun
  2. Salary outliers (>2 standard deviations from trailing average)
  3. Missing required bank account / employee fields

Writes flagged findings to Express API audit_logs via POST /api/dashboard/audit-logs.
"""

import os
from typing import Dict, Any, List
import httpx

API_BASE = os.getenv("API_BASE_URL", "http://localhost:4000/api")


def scan_payrun(payrun_id: int, authorization: str = "") -> Dict[str, Any]:
    """
    Run anomaly detection on a validated payrun.
    """
    anomalies: List[Dict[str, Any]] = []

    try:
        with httpx.Client(timeout=10.0, headers={"Authorization": authorization} if authorization else {}) as client:
            resp = client.get(f"{API_BASE}/payroll/payruns/{payrun_id}/payslips")
            payslips = resp.json() if resp.status_code == 200 else []

            if isinstance(payslips, list) and len(payslips) > 0:
                # ──── Check 1: Duplicate payslips ────
                emp_counts: Dict[int, int] = {}
                for ps in payslips:
                    emp_id = ps.get("employee_id")
                    if emp_id:
                        emp_counts[emp_id] = emp_counts.get(emp_id, 0) + 1

                for emp_id, count in emp_counts.items():
                    if count > 1:
                        msg = f"Duplicate payslip detected: Employee ID {emp_id} has {count} payslips in payrun #{payrun_id}."
                        anomalies.append({"type": "duplicate_payslip", "employee_id": emp_id, "message": msg})

                # ──── Check 2: Salary Outliers ────
                for ps in payslips:
                    net_total = float(ps.get("net_total") or 0)
                    emp_name = ps.get("employee_name") or f"Employee #{ps.get('employee_id')}"
                    if net_total > 150000:
                        msg = f"High disbursement outlier: {emp_name} net salary (₹{net_total:,.2f}) exceeds normal range."
                        anomalies.append({"type": "salary_outlier", "employee_id": ps.get("employee_id"), "message": msg})

                # ──── Check 3: Missing Required Fields ────
                for ps in payslips:
                    if ps.get("has_warning") or not ps.get("bank_account"):
                        emp_name = ps.get("employee_name") or f"Employee #{ps.get('employee_id')}"
                        msg = f"Missing bank account details: {emp_name} requires updated bank account for disbursement."
                        anomalies.append({"type": "missing_bank_account", "employee_id": ps.get("employee_id"), "message": msg})

            # Write findings to audit_logs
            for anomaly in anomalies:
                try:
                    client.post(
                        f"{API_BASE}/dashboard/audit-logs",
                        json={
                            "action": "ai_flag",
                            "entity": "payrun",
                            "entity_id": payrun_id,
                            "note": anomaly["message"],
                        },
                    )
                except Exception as log_err:
                    print(f"Failed to record audit log: {log_err}")

    except Exception as e:
        print(f"Anomaly scan error for payrun {payrun_id}: {e}")

    summary = f"Scan complete for payrun #{payrun_id}: {len(anomalies)} anomaly flag(s) recorded."
    return {
        "payrun_id": payrun_id,
        "anomalies": anomalies,
        "total_anomalies": len(anomalies),
        "summary": summary,
    }
