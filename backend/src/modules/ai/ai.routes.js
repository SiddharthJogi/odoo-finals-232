const { Router } = require('express');
const { authenticate } = require('../../middleware/auth');
const ctrl = require('./ai.controller');

const router = Router();

router.post('/query', authenticate, ctrl.queryAi);
router.post('/anomaly-scan', authenticate, ctrl.anomalyScan);
router.get('/forecast', authenticate, ctrl.forecast);

module.exports = router;
