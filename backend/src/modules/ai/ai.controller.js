const http = require('http');
const config = require('../../config');
const dashboardService = require('../dashboard/dashboard.service');
const { asyncHandler } = require('../../shared/asyncHandler');
const { rateLimiter, cache, usageLogger } = require('./aiProtections');
const { generateAnswerWithGemini } = require('./geminiClient');

const AI_SERVICE_URL = config.aiServiceUrl || 'http://localhost:8001';

/**
 * Helper to call python FastAPI microservice if available
 */
function callAiService(path, method = 'GET', body = null, headers = {}) {
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
            ...headers,
            ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          },
          timeout: 3000,
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
 * Enhanced local intent classifier with stemmed keyword matching
 */
function localClassifyIntent(question) {
  const q = question.toLowerCase();

  // 1. Salary Structure Queries (e.g. "how many active salary structures do we have currently")
  if (q.includes('structure') || q.includes('salary rule')) {
    return { intent: 'salary_structure_info', params: {} };
  }

  // 2. Highest salary in department (e.g. "give highest salary of each department", "top paid in engineering")
  if (
    (q.includes('highest') || q.includes('maximum') || q.includes('top salary') || q.includes('most paid')) &&
    (q.includes('dept') || q.includes('department') || q.includes('each') || q.includes('in'))
  ) {
    return { intent: 'highest_salary_by_dept', params: {} };
  }

  // 3. Anomaly & Compliance (using stem 'anomal' to match anomaly & anomalies)
  if (
    q.includes('anomal') ||
    q.includes('warning') ||
    q.includes('flag') ||
    q.includes('issue') ||
    q.includes('compliance') ||
    q.includes('audit')
  ) {
    return { intent: 'anomaly_report', params: {} };
  }

  // 4. Department Breakdown
  if (
    q.includes('dept') ||
    q.includes('department') ||
    q.includes('breakdown') ||
    (q.includes('salary') && q.includes('department'))
  ) {
    return { intent: 'department_breakdown', params: {} };
  }

  // 5. Trend & Forecast
  if (q.includes('trend') || q.includes('forecast') || q.includes('predict') || q.includes('next')) {
    return { intent: 'trend', params: {} };
  }

  // 6. Attendance
  if (q.includes('attendance') || q.includes('check-in') || q.includes('present') || q.includes('absent')) {
    return { intent: 'attendance_overview', params: {} };
  }

  // 7. Leave & Time Off
  if (q.includes('leave') || q.includes('time off') || q.includes('vacation') || q.includes('pto') || q.includes('allocation')) {
    return { intent: 'time_off_summary', params: {} };
  }

  // 8. Salary Summary (General salary / cost query)
  if (q.includes('salary') || q.includes('cost') || q.includes('payroll') || q.includes('net') || q.includes('gross') || q.includes('disbursed')) {
    return { intent: 'salary_summary', params: {} };
  }

  return { intent: 'general_query', params: {} };
}

/**
 * Fallback synthesizer using verified DB data when Gemini API is unavailable/unconfigured
 */
function synthesizeFallbackAnswer(intent, dbData) {
  switch (intent) {
    case 'salary_structure_info': {
      if (!Array.isArray(dbData) || dbData.length === 0) return 'No salary structures configured in the database.';
      const active = dbData.filter((s) => s.status === 'active');
      const names = active.map((s) => s.name).join(', ');
      return `We currently have ${active.length} active salary structure(s) configured: ${names}.`;
    }

    case 'highest_salary_by_dept': {
      if (!Array.isArray(dbData) || dbData.length === 0) return 'No salary records available per department.';
      const lines = dbData
        .map((d) => `${d.department}: ${d.employee_name} (${d.job_position || 'Staff'}) at ₹${Number(d.highest_net).toLocaleString('en-IN')}`)
        .join('; ');
      return `Highest net salary per department: ${lines}`;
    }
    case 'salary_summary': {
      return `Total net payroll disbursed across active runs is ₹${Number(dbData.total_net_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Gross: ₹${Number(dbData.total_gross_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}) across ${dbData.total_payslips || 0} payslips.`;
    }
    case 'department_breakdown': {
      if (!Array.isArray(dbData) || dbData.length === 0) return 'No department salary data recorded yet.';
      const deptLines = dbData.map((d) => `${d.department}: ₹${Number(d.total_net || 0).toLocaleString('en-IN')} (${d.employee_count} staff)`).join(', ');
      return `Department breakdown: ${deptLines}`;
    }
    case 'anomaly_report': {
      const pCount = dbData.payslip_warnings?.length || 0;
      const aCount = dbData.ai_warnings?.length || 0;
      const count = pCount + aCount;
      if (count > 0) {
        let details = [];
        if (pCount > 0) {
          const sample = dbData.payslip_warnings[0];
          details.push(`${pCount} payslips with missing bank/tax info (e.g. ${sample.employee_name}: ${sample.message})`);
        }
        if (aCount > 0) {
          details.push(`${aCount} AI audit flags`);
        }
        return `Compliance Warning: Detected ${count} total flags. Details: ${details.join('; ')}.`;
      }
      return 'All clear! No salary anomalies or compliance warnings were detected in active payruns.';
    }
    case 'trend': {
      if (!Array.isArray(dbData) || dbData.length === 0) return 'Salary trend projection requires at least one paid payrun.';
      if (dbData.length < 2) {
        const latest = Number(dbData[0].total_net || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        return `A reliable next-period projection requires at least two paid payruns. The latest recorded net payroll is ₹${latest}.`;
      }
      const avg = dbData.reduce((a, b) => a + Number(b.total_net || 0), 0) / dbData.length;
      return `Over the last ${dbData.length} payrun periods, monthly net expenditure averages ₹${avg.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`;
    }
    case 'attendance_overview': {
      return `Today, ${dbData.summary?.checked_in_today || 0} employees are checked in. Average daily shift duration is ${dbData.attendance?.[0]?.avg_hours || 8} hours.`;
    }
    case 'time_off_summary': {
      return `There are currently ${dbData.summary?.pending_time_off_requests || 0} pending leave requests requiring manager review.`;
    }
    default: {
      return `PeoplePay360 Copilot active: Tracking ${dbData.total_employees || 0} active employees with net disbursements of ₹${Number(dbData.total_net_paid || 0).toLocaleString('en-IN')}. How can I assist you with HR or Payroll today?`;
    }
  }
}

/**
 * Main AI Query Handler with full protection pipeline
 */
const queryAi = asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { question } = req.body;
  const userKey = req.user?.id?.toString() || req.ip || 'anonymous';

  // 1. Input Validation
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Question parameter is required and cannot be empty.' });
  }

  const trimmedQuestion = question.trim();
  if (trimmedQuestion.length < 2) {
    return res.status(400).json({ error: 'Question is too short (minimum 2 characters required).' });
  }
  if (trimmedQuestion.length > 300) {
    return res.status(400).json({ error: 'Question exceeds maximum length of 300 characters.' });
  }

  // 2. Rate Limiting Protection (10 req / min)
  const rateLimitResult = rateLimiter.check(userKey);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      error: `Rate limit exceeded. Please wait ${rateLimitResult.resetSeconds}s before asking another question.`,
      resetSeconds: rateLimitResult.resetSeconds,
    });
  }

  // 3. Cache Check
  const cachedResult = cache.get(trimmedQuestion);
  if (cachedResult) {
    const latencyMs = Date.now() - startTime;
    usageLogger.logQuery({
      userId: userKey,
      question: trimmedQuestion,
      intent: cachedResult.intent,
      source: 'cache',
      cacheHit: true,
      latencyMs,
    });

    return res.json({
      question: trimmedQuestion,
      intent: cachedResult.intent,
      answer: cachedResult.answer,
      data: cachedResult.data,
      cached: true,
      source: 'cache',
      modelUsed: cachedResult.modelUsed,
    });
  }

  // 4. Intent Classification
  let intentObj;
  try {
    const response = await callAiService('/ai/query', 'POST', { question: trimmedQuestion });
    intentObj = response.body;
  } catch (err) {
    intentObj = localClassifyIntent(trimmedQuestion);
  }

  const intent = intentObj.intent || 'general_query';
  let dbData = null;

  // 5. Validated DB Service Queries
  switch (intent) {
    case 'salary_structure_info':
      dbData = await dashboardService.getSalaryStructures();
      break;
    case 'highest_salary_by_dept':
      dbData = await dashboardService.getHighestSalaryByDepartment();
      break;
    case 'salary_summary':
      dbData = await dashboardService.getSummary({});
      break;
    case 'department_breakdown':
      dbData = await dashboardService.getSalaryByDepartment({});
      break;
    case 'anomaly_report':
      dbData = await dashboardService.getWarnings();
      break;
    case 'trend':
      dbData = await dashboardService.getSalaryTrend();
      break;
    case 'attendance_overview': {
      const att = await dashboardService.getAttendanceOverview();
      const sum = await dashboardService.getSummary({});
      dbData = { attendance: att, summary: sum };
      break;
    }
    case 'time_off_summary': {
      const timeOff = await dashboardService.getTimeOffOverview();
      const sum = await dashboardService.getSummary({});
      dbData = { timeOff, summary: sum };
      break;
    }
    default:
      dbData = await dashboardService.getSummary({});
      break;
  }

  // 6. Gemini Generation with Exponential Backoff & Fallback
  let answer = '';
  let source = 'gemini';
  let tokensIn = 0;
  let tokensOut = 0;
  let queryError = null;
  let modelUsed = null;

  try {
    const geminiRes = await generateAnswerWithGemini(trimmedQuestion, dbData, intent);
    answer = geminiRes.answer;
    tokensIn = geminiRes.tokensIn;
    tokensOut = geminiRes.tokensOut;
    modelUsed = geminiRes.modelUsed;
    source = 'gemini';
  } catch (err) {
    console.warn(`[AI Controller] Gemini generation failed (${err.message}). Falling back to template synthesis.`);
    answer = synthesizeFallbackAnswer(intent, dbData);
    source = 'fallback';
    queryError = err.message;
  }

  // 7. Store in Cache (10-min TTL)
  cache.set(trimmedQuestion, {
    answer,
    data: dbData,
    intent,
    modelUsed,
  });

  const latencyMs = Date.now() - startTime;

  // 8. Log Usage Telemetry
  usageLogger.logQuery({
    userId: userKey,
    question: trimmedQuestion,
    intent,
    answer,
    source,
    modelUsed,
    cacheHit: false,
    tokensIn,
    tokensOut,
    latencyMs,
    error: queryError,
  });

  res.json({
    question: trimmedQuestion,
    intent,
    answer,
    data: dbData,
    cached: false,
    source,
    modelUsed,
  });
});

/**
 * AI Anomaly Scan Handler
 */
const anomalyScan = asyncHandler(async (req, res) => {
  const { payrun_id } = req.body;
  if (!payrun_id) return res.status(400).json({ error: 'payrun_id is required' });

  try {
    const response = await callAiService('/ai/anomaly-scan', 'POST', { payrun_id }, {
      Authorization: req.headers.authorization || '',
    });
    res.json(response.body);
  } catch (err) {
    res.status(500).json({ error: 'AI microservice unreachable', details: err.message });
  }
});

/**
 * AI Forecast Handler
 */
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

/**
 * AI Telemetry & Usage Stats Handler
 */
const getUsageStats = asyncHandler(async (_req, res) => {
  const stats = usageLogger.getStats();
  res.json(stats);
});

module.exports = {
  queryAi,
  anomalyScan,
  forecast,
  getUsageStats,
};
