const { log } = require('./_utils/logger');
const { sanitize } = require('./_utils/validation');
const LANG_NAMES = { fr: 'francais', en: 'English', ar: 'العربية', es: 'espanol' };
const rateLimit = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const requests = rateLimit.get(ip) || [];
  const recent = requests.filter(t => now - t < 60000);
  if (recent.length >= 10) return false;
  recent.push(now);
  rateLimit.set(ip, recent);
  return true;
}
exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '{}' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST uniquement' }) };
  const clientIP = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  if (!checkRateLimit(clientIP)) return { statusCode: 429, headers, body: JSON.stringify({ error: 'Trop de requetes' }) };
  try {
    const KEY = process.env.GEMINI_API_KEY;
    if (!KEY) return { statusCode: 500, headers, body: JSON.stringify({ error: 'GEMINI_API_KEY manquante' }) };
    const { message, history, store, products, lang } = JSON.parse(event.body || '{}');
    if (!message || String(message).length > 1000) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Message invalide' }) };
    const langName = LANG_NAMES[lang] || 'francais';
    const s = store || {};
    const cat = (Array.isArray(products) ? products : []).slice(0,60).map(p => `- ${p.n} | ${p.p} FCFA`).join('\n');
    const prompt = `Tu es Kimora AI, assistante de ${s.name || 'Kimora Store'}. REPONDS EN ${langName.toUpperCase()}. REPONSES COURTES 2-5 phrases. Livraison: ${s.delai || '2-3 jours'}, frais ${s.livraison || 1500} FCFA, gratuit des ${s.freeDel || 20000} FCFA. Paiement: MTN MoMo, Orange Money, livraison. Catalogue: ${cat || 'indisponible'}. Si tu ne sais pas, termine par [WHATSAPP].`;
    const contents = [{ role: 'user', parts: [{ text: String(message) }] }];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ system_instruction: { parts: [{ text: prompt }] }, contents, generationConfig: { temperature: 0.6, maxOutputTokens: 300 } })
    });
    clearTimeout(timer);
    const d = await r.json();
    let reply = d.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim() || 'Je suis la. 💬 Contactez-nous sur WhatsApp !';
    let wa = reply.includes('[WHATSAPP]');
    reply = reply.replace(/\[WHATSAPP\]/g, '').trim().slice(0, 900);
    return { statusCode: 200, headers, body: JSON.stringify({ reply, wa }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ reply: 'Contactez-nous sur WhatsApp !', wa: true }) };
  }
};
