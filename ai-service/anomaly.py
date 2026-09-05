"""
Anomaly detection for payrun validation.

Checks for:
  1. Duplicate payslips (same employee in same payrun)
  2. Salary outliers (net > 2 std-dev from employee's trailing average)
  3. Missing required fields (bank account, contract)

Dev 4 will wire this to actually query the main API and write results
to audit_logs.
"""

from typing import Dict, Any, List
import os

# Main API base URL — Dev 4 will use httpx to call these
API_BASE = os.getenv("API_BASE_URL", "http://localhost:4000/api")


def scan_payrun(payrun_id: int) -> Dict[str, Any]:
    """
    Run anomaly detection on a completed payrun.

    Returns:
        {
            "payrun_id": int,
            "anomalies": [
                {"type": "...", "employee_id": int, "message": "..."}
            ],
            "summary": "..."
        }
    """
    anomalies: List[Dict[str, Any]] = []

    # ──── Check 1: Duplicate payslips ────
    anomalies.extend(_check_duplicates(payrun_id))

    # ──── Check 2: Salary outliers ────
    anomalies.extend(_check_salary_outliers(payrun_id))

    # ──── Check 3: Missing fields ────
    anomalies.extend(_check_missing_fields(payrun_id))

    summary = f"Scan complete for payrun {payrun_id}: {len(anomalies)} anomalie(s) found."

    return {
        "payrun_id": payrun_id,
        "anomalies": anomalies,
        "total_anomalies": len(anomalies),
        "summary": summary,
    }


def _check_duplicates(payrun_id: int) -> List[Dict[str, Any]]:
    """
    Check for duplicate employee entries in the same payrun.
    Dev 4: Replace with actual DB query via httpx.
    """
    # Placeholder — will query: SELECT employee_id, COUNT(*) FROM payslips WHERE payrun_id=... GROUP BY employee_id HAVING COUNT(*) > 1
    return []


def _check_salary_outliers(payrun_id: int) -> List[Dict[str, Any]]:
    """
    Flag employees whose net salary deviates > 2 standard deviations
    from their own trailing 3-month average.
    Dev 4: Replace with actual statistical query.
    """
    # Placeholder — will query historical payslips per employee and compute z-scores
    return []


def _check_missing_fields(payrun_id: int) -> List[Dict[str, Any]]:
    """
    Flag employees missing bank account or other required payroll fields.
    Dev 4: Replace with actual query.
    """
    # Placeholder — will query: SELECT ... FROM payslips JOIN employees WHERE bank_account IS NULL
    return []
