// Fapshi — initiation d'un paiement direct (MTN MoMo / Orange Money)
// Variables d'environnement Netlify requises :
//   FAPSHI_API_USER : votre "apiuser" Fapshi
//   FAPSHI_API_KEY  : votre "apikey" Fapshi
//   FAPSHI_BASE     : (facultatif) https://live.fapshi.com en production,
//                     https://sandbox.fapshi.com pour les tests. Défaut = live.

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '{}' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ success: false, error: 'POST uniquement' }) };

  const origin = (event.headers && (event.headers.origin || event.headers.referer)) || '';
  const siteHost = (process.env.URL || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (origin && siteHost && !origin.includes(siteHost)) {
    return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Origine non autorisée' }) };
  }

  try {
    const USER = process.env.FAPSHI_API_USER;
    const KEY = process.env.FAPSHI_API_KEY;
    const BASE = (process.env.FAPSHI_BASE || 'https://live.fapshi.com').replace(/\/$/, '');
    if (!USER || !KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'Clés Fapshi manquantes dans Netlify' }) };
    }

    const b = JSON.parse(event.body || '{}');
    const amount = Math.round(Number(b.amount) || 0);
    if (amount < 100) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Montant invalide (min 100 FCFA)' }) };
    }
    let phone = String(b.phone || '').replace(/\D/g, '');
    if (phone.startsWith('237')) phone = phone.slice(3);
    if (phone.length !== 9) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Numéro de téléphone invalide' }) };
    }

    // "direct-pay" déclenche la demande de paiement sur le téléphone du client
    const payload = {
      amount,
      phone,
      medium: b.medium === 'orange' ? 'orange money' : (b.medium === 'mtn' ? 'mobile money' : undefined),
      name: String(b.name || 'Client').slice(0, 60),
      email: String(b.email || '').slice(0, 80) || undefined,
      externalId: String(b.orderId || '').slice(0, 60),
      message: 'Kimora Store - Commande ' + String(b.orderId || '')
    };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(BASE + '/direct-pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apiuser: USER, apikey: KEY },
      signal: ctrl.signal,
      body: JSON.stringify(payload)
    });
    clearTimeout(timer);
    const d = await r.json();

    if (!r.ok || !d.transId) {
      return { statusCode: 502, headers, body: JSON.stringify({ success: false, error: (d && d.message) || 'Échec Fapshi' }) };
    }
    return { statusCode: 200, headers, body: JSON.stringify({ success: true, transId: d.transId }) };
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'Délai Fapshi dépassé' : e.message;
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: msg }) };
  }
};
