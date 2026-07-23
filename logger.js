// Logger centralise
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const levels = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };
function log(level, message, data) {
  data = data || {};
  if (levels[level] <= levels[LOG_LEVEL]) {
    const entry = { timestamp: new Date().toISOString(), level, message, ...data };
    console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
  }
}
module.exports = { log };
