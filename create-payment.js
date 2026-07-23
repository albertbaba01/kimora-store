const { log } = require('./_utils/logger');
const { validatePhone, validatePrice } = require('./_utils/validation');
exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '{}' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST uniquement' }) };
  const origin = (event.headers.origin || event.headers.referer || '');
  const siteHost = (process.env.URL || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (origin && siteHost && !origin.includes(siteHost)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Origine non autorisee' }) };
  }
  try {
    const USER = process.env.FAPSHI_API_USER, KEY = process.env.FAPSHI_API_KEY;
    const BASE = (process.env.FAPSHI_BASE || 'https://live.fapshi.com').replace(/\/$/, '');
    if (!USER || !KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Cles Fapshi manquantes' }) };
    const body = JSON.parse(event.body || '{}');
    const amount = Math.round(Number(body.amount) || 0);
    if (!validatePrice(amount) || amount < 100) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Montant invalide (min 100 FCFA)' }) };
    let phone = String(body.phone || '').replace(/\D/g, '');
    if (phone.startsWith('237')) phone = phone.slice(3);
    if (!validatePhone(phone) || phone.length !== 9) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Numero invalide' }) };
    const payload = { amount, phone, medium: body.medium === 'orange' ? 'orange money' : (body.medium === 'mtn' ? 'mobile money' : undefined), name: String(body.name || 'Client').slice(0,60), externalId: String(body.orderId || '').slice(0,60) };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const r = await fetch(BASE + '/direct-pay', { method: 'POST', headers: { 'Content-Type': 'application/json', apiuser: USER, apikey: KEY }, signal: controller.signal, body: JSON.stringify(payload) });
    clearTimeout(timer);
    const d = await r.json();
    if (!r.ok || !d.transId) return { statusCode: 502, headers, body: JSON.stringify({ error: (d && d.message) || 'Echec Fapshi' }) };
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, transId: d.transId }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
