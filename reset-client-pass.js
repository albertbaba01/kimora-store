const crypto = require('crypto');
const { log } = require('./_utils/logger');
const { validatePhone } = require('./_utils/validation');
function b64url(input) { return Buffer.from(input).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
async function getAccessToken(sa) {
  const now = Math.floor(Date.now()/1000);
  const header = b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const claims = b64url(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/identitytoolkit',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header+'.'+claims);
  const signature = signer.sign(sa.private_key).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const jwt = header+'.'+claims+'.'+signature;
  const r = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion='+jwt});
  const d = await r.json();
  if(!d.access_token) throw new Error('Token OAuth impossible');
  return d.access_token;
}
exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '{}' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'POST uniquement' }) };
  try {
    const { idToken, apiKey, phone, newPass } = JSON.parse(event.body || '{}');
    if (!idToken || !apiKey || !phone || !newPass) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Parametres manquants' }) };
    if (String(newPass).length < 6) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Mot de passe trop court' }) };
    if (!validatePhone(phone)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Numero invalide' }) };
    const SA_RAW = process.env.FIREBASE_SERVICE_ACCOUNT;
    const ADMIN_UID = process.env.ADMIN_UID;
    if (!SA_RAW || !ADMIN_UID) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Configuration serveur manquante' }) };
    const sa = JSON.parse(SA_RAW);
    const vr = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+apiKey,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken})});
    const vd = await vr.json();
    const caller = vd.users?.[0];
    if (!caller || caller.localId !== ADMIN_UID) return { statusCode: 403, headers, body: JSON.stringify({ error: 'Acces refuse' }) };
    const token = await getAccessToken(sa);
    const email = String(phone).replace(/\D/g,'')+'@kimora.client';
    const lr = await fetch('https://identitytoolkit.googleapis.com/v1/projects/'+sa.project_id+'/accounts:lookup',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({email:[email]})});
    const ld = await lr.json();
    const user = ld.users?.[0];
    if (!user) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Client non trouve' }) };
    const ur = await fetch('https://identitytoolkit.googleapis.com/v1/projects/'+sa.project_id+'/accounts:update',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({localId:user.localId,password:String(newPass)})});
    const ud = await ur.json();
    if (ud.error) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Echec reinitialisation' }) };
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, phone }) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
