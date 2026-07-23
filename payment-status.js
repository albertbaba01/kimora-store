const { log } = require('./_utils/logger');
exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '{}' };
  try {
    const USER = process.env.FAPSHI_API_USER, KEY = process.env.FAPSHI_API_KEY;
    const BASE = (process.env.FAPSHI_BASE || 'https://live.fapshi.com').replace(/\/$/, '');
    if (!USER || !KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Cles Fapshi manquantes' }) };
    const parts = (event.path || '').split('/').filter(Boolean);
    const transId = parts[parts.length - 1];
    if (!transId || transId === 'payment-status') return { statusCode: 400, headers, body: JSON.stringify({ error: 'transId manquant' }) };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const r = await fetch(BASE + '/payment-status/' + encodeURIComponent(transId), { method: 'GET', headers: { apiuser: USER, apikey: KEY }, signal: controller.signal });
    clearTimeout(timer);
    const d = await r.json();
    if (!r.ok) return { statusCode: 502, headers, body: JSON.stringify({ error: (d && d.message) || 'Echec Fapshi' }) };
    return { statusCode: 200, headers, body: JSON.stringify({ status: d.status || 'PENDING' }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
