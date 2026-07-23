// Réinitialisation du mot de passe d'un client par l'ADMIN (Kimora Store)
// Zéro dépendance npm : signature JWT via crypto natif + API REST Google.
// Variables d'environnement Netlify requises :
//   FIREBASE_SERVICE_ACCOUNT : contenu JSON de la clé de compte de service Firebase
//   ADMIN_UID                : UID du compte admin autorisé
const crypto = require('crypto');

function b64url(input){
  return Buffer.from(input).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

async function getAccessToken(sa){
  const now = Math.floor(Date.now()/1000);
  const header = b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/identitytoolkit',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now+3600
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(header+'.'+claims);
  const signature = signer.sign(sa.private_key).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const jwt = header+'.'+claims+'.'+signature;
  const r = await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion='+jwt
  });
  const d = await r.json();
  if(!d.access_token) throw new Error('Token OAuth impossible: '+JSON.stringify(d));
  return d.access_token;
}

exports.handler = async (event) => {
  const headers = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json'};
  if(event.httpMethod==='OPTIONS') return {statusCode:200,headers,body:'{}'};
  if(event.httpMethod!=='POST') return {statusCode:405,headers,body:JSON.stringify({error:'POST uniquement'})};
  try{
    const {idToken, apiKey, phone, newPass} = JSON.parse(event.body||'{}');
    if(!idToken||!apiKey||!phone||!newPass) return {statusCode:400,headers,body:JSON.stringify({error:'Paramètres manquants'})};
    if(String(newPass).length<6) return {statusCode:400,headers,body:JSON.stringify({error:'Mot de passe trop court (min 6)'})};

    const SA_RAW = process.env.FIREBASE_SERVICE_ACCOUNT;
    const ADMIN_UID = process.env.ADMIN_UID;
    if(!SA_RAW||!ADMIN_UID) return {statusCode:500,headers,body:JSON.stringify({error:'Configuration serveur manquante (FIREBASE_SERVICE_ACCOUNT / ADMIN_UID dans Netlify)'})};
    const sa = JSON.parse(SA_RAW);

    // 1) Vérifier que l'appelant est bien l'ADMIN (via son idToken Firebase)
    const vr = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+apiKey,{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken})
    });
    const vd = await vr.json();
    const caller = vd.users&&vd.users[0];
    if(!caller||caller.localId!==ADMIN_UID) return {statusCode:403,headers,body:JSON.stringify({error:'Accès refusé : admin uniquement'})};

    // 2) Jeton d'administration Google
    const token = await getAccessToken(sa);

    // 3) Trouver le client par son "email téléphone"
    const email = String(phone).replace(/\D/g,'')+'@kimora.client';
    const lr = await fetch('https://identitytoolkit.googleapis.com/v1/projects/'+sa.project_id+'/accounts:lookup',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({email:[email]})
    });
    const ld = await lr.json();
    const user = ld.users&&ld.users[0];
    if(!user) return {statusCode:404,headers,body:JSON.stringify({error:'Aucun compte client avec ce numéro'})};

    // 4) Réinitialiser le mot de passe
    const ur = await fetch('https://identitytoolkit.googleapis.com/v1/projects/'+sa.project_id+'/accounts:update',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({localId:user.localId,password:String(newPass)})
    });
    const ud = await ur.json();
    if(ud.error) return {statusCode:500,headers,body:JSON.stringify({error:'Échec de la réinitialisation: '+ud.error.message})};

    return {statusCode:200,headers,body:JSON.stringify({ok:true,phone:String(phone)})};
  }catch(e){
    return {statusCode:500,headers,body:JSON.stringify({error:e.message})};
  }
};
