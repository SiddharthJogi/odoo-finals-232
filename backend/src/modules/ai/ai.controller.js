const http = require('http');
const config = require('../../config');
const dashboardService = require('../dashboard/dashboard.service');
const { asyncHandler } = require('../../shared/asyncHandler');

const AI_SERVICE_URL = config.aiServiceUrl || 'http://localhost:8001';

/**
 * Helper to call python FastAPI microservice
 */
function callAiService(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(AI_SERVICE_URL + path);
      const postData = body ? JSON.stringify(body) : null;

      const req = http.request(
        {
          hostname: url.hostname,
          port: url.port || 8001,
          path: url.pathname + url.search,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          },
          timeout: 4000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch (err) {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }
      );

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('AI service timeout'));
      });

      if (postData) req.write(postData);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Local intent classifier fallback if FastAPI is offline
 */
function localClassifyIntent(question) {
  const q = question.lower ? question.lower() : question.toLowerCase();
  if (q.includes('salary') || q.includes('cost') || q.includes('payroll') || q.includes('net') || q.includes('gross')) {
    return { intent: 'salary_summary', params: {} };
  }
  if (q.includes('dept') || q.includes('department') || q.includes('breakdown')) {
    return { intent: 'department_breakdown', params: {} };
  }
  if (q.includes('warning') || q.includes('anomaly') || q.includes('flag') || q.includes('issue')) {
    return { intent: 'anomaly_report', params: {} };
  }
  if (q.includes('trend') || q.includes('forecast') || q.includes('predict') || q.includes('next')) {
    return { intent: 'trend', params: {} };
  }
  if (q.includes('attendance') || q.includes('check-in') || q.includes('present')) {
    return { intent: 'attendance_overview', params: {} };
  }
  if (q.includes('leave') || q.includes('time off') || q.includes('vacation') || q.includes('pto')) {
    return { intent: 'time_off_summary', params: {} };
  }
  return { intent: 'general_query', params: {} };
}

const queryAi = asyncHandler(async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question parameter is required' });
  }

  let aiRes;
  try {
    const response = await callAiService('/ai/query', 'POST', { question });
    aiRes = response.body;
  } catch (err) {
    console.warn('FastAPI microservice call failed, using fallback intent parser:', err.message);
    const fallback = localClassifyIntent(question);
    aiRes = { intent: fallback.intent, params: fallback.params, question };
  }

  const { intent, params } = aiRes;
  let answer = '';
  let data = null;

  // Synthesize natural language answer based on live DB data
  switch (intent) {
    case 'salary_summary': {
      const summary = await dashboardService.getSummary({});
      answer = `The total net salary disbursed across active payruns is ₹${summary.total_net_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Gross: ₹${summary.total_gross_paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) spanning ${summary.total_payslips} generated payslips.`;
      data = summary;
      break;
    }
    case 'department_breakdown': {
      const deptData = await dashboardService.getSalaryByDepartment({});
      const deptLines = deptData.map(d => `${d.department}: ₹${d.total_net.toLocaleString('en-IN')} (${d.employee_count} employees)`).join(', ');
      answer = `Here is the breakdown by department: ${deptLines || 'No salary data recorded yet.'}`;
      data = deptData;
      break;
    }
    case 'anomaly_report': {
      const warnings = await dashboardService.getWarnings();
      const count = warnings.payslip_warnings.length + warnings.ai_warnings.length;
      answer = count > 0
        ? `Attention: Detected ${count} active compliance flags (${warnings.payslip_warnings.length} missing bank info / payslip issues, ${warnings.ai_warnings.length} AI anomaly logs).`
        : 'All clear! No salary anomalies or compliance warnings were detected.';
      data = warnings;
      break;
    }
    case 'trend': {
      const trend = await dashboardService.getSalaryTrend();
      answer = trend.length > 0
        ? `Across the last ${trend.length} payrun periods, monthly net payroll expenditure maintains a standard trend averaging ₹${(trend.reduce((a, b) => a + b.total_net, 0) / trend.length).toLocaleString('en-IN', { minimumFractionDigits: 2 })} per run.`
        : 'Salary trend projection requires at least one paid payrun.';
      data = trend;
      break;
    }
    case 'attendance_overview': {
      const att = await dashboardService.getAttendanceOverview();
      const summary = await dashboardService.getSummary({});
      answer = `Today, ${summary.checked_in_today} employees are checked in. Over the past 30 days, average daily shift duration is ${att[0]?.avg_hours || 8} hours.`;
      data = att;
      break;
    }
    case 'time_off_summary': {
      const timeOff = await dashboardService.getTimeOffOverview();
      const summary = await dashboardService.getSummary({});
      answer = `There are currently ${summary.pending_time_off_requests} pending leave requests requiring manager review.`;
      data = timeOff;
      break;
    }
    default: {
      const summary = await dashboardService.getSummary({});
      answer = `PeoplePay360 Copilot active: Currently tracking ${summary.total_employees} active employees with total net disbursements of ₹${summary.total_net_paid.toLocaleString('en-IN')}. How can I assist you with HR or Payroll today?`;
      data = summary;
      break;
    }
  }

  res.json({
    question,
    intent,
    params,
    answer,
    data,
  });
});

const anomalyScan = asyncHandler(async (req, res) => {
  const { payrun_id } = req.body;
  if (!payrun_id) return res.status(400).json({ error: 'payrun_id is required' });

  try {
    const response = await callAiService('/ai/anomaly-scan', 'POST', { payrun_id });
    res.json(response.body);
  } catch (err) {
    res.status(500).json({ error: 'AI microservice unreachable', details: err.message });
  }
});

const forecast = asyncHandler(async (_req, res) => {
  try {
    const response = await callAiService('/ai/forecast', 'GET');
    res.json(response.body);
  } catch (err) {
    const trend = await dashboardService.getSalaryTrend();
    res.json({
      historical: trend,
      projected_next: trend.length > 0 ? trend[trend.length - 1].total_net * 1.05 : 0,
      trend: 'stable',
      confidence: 'medium',
      message: 'Projection generated via fallback engine.',
    });
  }
});

module.exports = {
  queryAi,
  anomalyScan,
  forecast,
};
