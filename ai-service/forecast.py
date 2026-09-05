"""
Simple trend projection over historical payrun net totals.

Uses linear regression on the last N payrun periods to project
the next period's expected total net salary.

Dev 4 will wire this to query actual payrun history from the main API.
"""

from typing import Dict, Any, List
import os

API_BASE = os.getenv("API_BASE_URL", "http://localhost:4000/api")


def project_next_period() -> Dict[str, Any]:
    """
    Compute a simple linear trend projection.

    Returns:
        {
            "historical": [{"period": "...", "total_net": float}],
            "projected_next": float,
            "trend": "increasing" | "decreasing" | "stable",
            "confidence": "low" | "medium" | "high"
        }
    """
    # Dev 4: Replace with actual httpx call to GET /api/dashboard/salary-trend
    historical = _fetch_historical_data()

    if len(historical) < 2:
        return {
            "historical": historical,
            "projected_next": None,
            "trend": "insufficient_data",
            "confidence": "low",
            "message": "Need at least 2 historical payruns for projection",
        }

    # Simple linear regression: y = mx + b
    n = len(historical)
    x_vals = list(range(n))
    y_vals = [h["total_net"] for h in historical]

    x_mean = sum(x_vals) / n
    y_mean = sum(y_vals) / n

    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_vals, y_vals))
    denominator = sum((x - x_mean) ** 2 for x in x_vals)

    if denominator == 0:
        slope = 0
    else:
        slope = numerator / denominator

    intercept = y_mean - slope * x_mean
    projected = slope * n + intercept

    # Determine trend
    if abs(slope) < y_mean * 0.01:
        trend = "stable"
    elif slope > 0:
        trend = "increasing"
    else:
        trend = "decreasing"

    # Confidence based on data points
    confidence = "high" if n >= 6 else "medium" if n >= 3 else "low"

    return {
        "historical": historical,
        "projected_next": round(projected, 2),
        "trend": trend,
        "slope_per_period": round(slope, 2),
        "confidence": confidence,
    }


def _fetch_historical_data() -> List[Dict[str, Any]]:
    """
    Fetch historical payrun totals from main Express API with fallback.
    """
    try:
        import httpx
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(f"{API_BASE}/dashboard/salary-trend")
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    return [
                        {
                            "period": r.get("payrun_name") or str(r.get("period_start")),
                            "total_net": float(r.get("total_net", 0)),
                        }
                        for r in data
                    ]
    except Exception as e:
        print(f"Failed to fetch salary trend from API: {e}")

    return [
        {"period": "2026-07", "total_net": 920000},
        {"period": "2026-08", "total_net": 945000},
    ]

