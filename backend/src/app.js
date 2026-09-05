const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { errorHandler } = require('./middleware/errorHandler');

// Module routes
const hrCoreRoutes = require('./modules/hr-core/hrCore.routes');
const timeOpsRoutes = require('./modules/time-ops/timeOps.routes');
const payrollRoutes = require('./modules/payroll/payroll.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const aiRoutes = require('./modules/ai/ai.routes');

const app = express();

// --------------- Global middleware ---------------
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// --------------- Health check ---------------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --------------- Module mounts ---------------
app.use('/api', hrCoreRoutes);
app.use('/api', timeOpsRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);

// --------------- 404 catch-all ---------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// --------------- Centralized error handler ---------------
app.use(errorHandler);

module.exports = app;
