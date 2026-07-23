// Fapshi — vérification du statut d'un paiement
// Appelé par le frontend : /api/payment-status/{transId}
// Variables Netlify : FAPSHI_API_USER, FAPSHI_API_KEY, FAPSHI_BASE (facultatif)

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '{}' };

  try {
    const USER = process.env.FAPSHI_API_USER;
    const KEY = process.env.FAPSHI_API_KEY;
    const BASE = (process.env.FAPSHI_BASE || 'https://live.fapshi.com').replace(/\/$/, '');
    if (!USER || !KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ status: 'ERROR', error: 'Clés Fapshi manquantes' }) };
    }

    // Le transId est le dernier segment du chemin
    const parts = (event.path || '').split('/').filter(Boolean);
    const transId = (event.queryStringParameters && event.queryStringParameters.transId) || parts[parts.length - 1];
    if (!transId || transId === 'payment-status') {
      return { statusCode: 400, headers, body: JSON.stringify({ status: 'ERROR', error: 'transId manquant' }) };
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(BASE + '/payment-status/' + encodeURIComponent(transId), {
      method: 'GET',
      headers: { apiuser: USER, apikey: KEY },
      signal: ctrl.signal
    });
    clearTimeout(timer);
    const d = await r.json();

    if (!r.ok) {
      return { statusCode: 502, headers, body: JSON.stringify({ status: 'ERROR', error: (d && d.message) || 'Échec Fapshi' }) };
    }
    // Fapshi renvoie status: CREATED | PENDING | SUCCESSFUL | FAILED | EXPIRED
    return { statusCode: 200, headers, body: JSON.stringify({ status: d.status || 'PENDING' }) };
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'Délai dépassé' : e.message;
    return { statusCode: 500, headers, body: JSON.stringify({ status: 'ERROR', error: msg }) };
  }
};
