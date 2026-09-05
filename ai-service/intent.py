"""
Intent classification for natural-language HR/Payroll queries.

Maps user questions to structured {intent, params} that can be used
to call the appropriate dashboard/API endpoints.
"""

from typing import Tuple, Dict, Any

# Keyword-based intent mapping — Dev 4 will replace with LLM-based classification
INTENT_KEYWORDS = {
    "salary_summary": ["salary", "cost", "payroll", "total", "net", "gross", "paid"],
    "department_breakdown": ["department", "dept", "by department", "breakdown"],
    "employee_count": ["how many", "employee count", "headcount", "total employees"],
    "attendance_overview": ["attendance", "check-in", "check in", "present", "absent"],
    "time_off_summary": ["leave", "time off", "vacation", "sick", "pto", "absence"],
    "anomaly_report": ["anomaly", "warning", "flag", "issue", "problem", "suspicious"],
    "trend": ["trend", "forecast", "projection", "predict", "next month"],
}


def classify_intent(question: str) -> Tuple[str, Dict[str, Any]]:
    """
    Classify a natural-language question into an intent and extract parameters.

    Returns:
        (intent_name, params_dict)
    """
    q_lower = question.lower().strip()
    params: Dict[str, Any] = {}

    # Check each intent's keywords
    best_intent = "general_query"
    best_score = 0

    for intent, keywords in INTENT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in q_lower)
        if score > best_score:
            best_score = score
            best_intent = intent

    # Extract department name if mentioned
    dept_keywords = ["engineering", "finance", "human resources", "hr", "sales", "marketing"]
    for dept in dept_keywords:
        if dept in q_lower:
            params["department"] = dept.title()
            break

    # Extract time period if mentioned
    month_keywords = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december",
    ]
    for month in month_keywords:
        if month in q_lower:
            params["month"] = month.title()
            break

    if "this month" in q_lower:
        params["period"] = "current_month"
    elif "last month" in q_lower:
        params["period"] = "previous_month"

    return best_intent, params
