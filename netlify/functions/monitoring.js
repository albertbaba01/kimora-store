const { log } = require('./_utils/logger');
exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  const checks = { timestamp: new Date().toISOString(), version: process.env.APP_VERSION || '2.0.0' };
  checks.services = {
    fapshi: !!process.env.FAPSHI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    firebase: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    admin: !!process.env.ADMIN_UID
  };
  const healthy = Object.values(checks.services).every(v => v === true);
  if (!healthy) log('warn', 'Health check degrade', checks);
  return { statusCode: healthy ? 200 : 503, headers, body: JSON.stringify({ status: healthy ? 'healthy' : 'degraded', ...checks }) };
};
