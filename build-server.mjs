Exit code: 0
Wall time: 0.4 seconds
Output:
import {mkdir, copyFile, writeFile} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await writeFile('dist/server/index.js',`const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const bytes=new TextEncoder();
async function sessionToken(secret){const key=await crypto.subtle.importKey('raw',bytes.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,bytes.encode('green-fn-dynasty'));return [...new Uint8Array(sig)].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function authenticated(request,env){if(!env.SESSION_SECRET)return false;const token=(request.headers.get('cookie')||'').match(/(?:^|; )gf_session=([^;]+)/)?.[1];return !!token&&token===await sessionToken(env.SESSION_SECRET)}
const loginPage=(error='')=>new Response('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Green Fn Dynasty Â· Sign In</title><style>*{box-sizing:border-box}body{margin:0;background:#10130f;color:#f4f3eb;font-family:Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{width:min(440px,100%);border:1px solid #3a4034;background:#181c16;padding:38px}.mark{width:58px;height:58px;background:#d8ff52;color:#10130f;display:grid;place-items:center;font-weight:900;margin-bottom:38px}small{color:#d8ff52;font-weight:800;letter-spacing:.16em}h1{font-size:42px;line-height:1;margin:12px 0;text-transform:uppercase}p{color:#9da394;line-height:1.6}label{display:flex;flex-direction:column;gap:8px;margin-top:28px;font-size:11px;font-weight:800;letter-spacing:.1em}input{background:#0e110d;border:1px solid #454b3f;color:white;padding:15px;font-size:16px}button{width:100%;margin-top:14px;padding:15px;background:#d8ff52;color:#10130f;border:0;font-weight:900}.error{color:#ff806e;font-size:12px;min-height:18px}</style></head><body><main class="card"><div class="mark">GF</div><small>PRIVATE LEAGUE ARCHIVE</small><h1>Enter the league</h1><p>Use the access code shared by the commissioner. No ChatGPT account is required.</p><form id="login"><label>LEAGUE ACCESS CODE<input id="code" type="password" required autocomplete="current-password" autofocus></label><button>UNLOCK THE ARCHIVE</button><p class="error" id="error">'+error+'</p></form></main><script>document.getElementById("login").onsubmit=async(e)=>{e.preventDefault();const button=e.target.querySelector("button"),error=document.getElementById("error");button.disabled=true;button.textContent="CHECKINGâ€¦";const r=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:document.getElementById("code").value})});if(r.ok)location.reload();else{error.textContent="That access code is not valid.";button.disabled=false;button.textContent="UNLOCK THE ARCHIVE"}}</script></body></html>',{status:error?401:200,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
const schema=\`CREATE TABLE IF NOT EXISTS trades (id TEXT PRIMARY KEY, title TEXT NOT NULL, season INTEGER NOT NULL, side_a TEXT NOT NULL, side_b TEXT NOT NULL, submitted_by TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS trade_votes (trade_id TEXT NOT NULL, voter TEXT NOT NULL, value INTEGER NOT NULL CHECK(value BETWEEN 1 AND 5), updated_at TEXT NOT NULL, PRIMARY KEY(trade_id,voter));
CREATE TABLE IF NOT EXISTS trade_vote_history (id TEXT PRIMARY KEY, trade_id TEXT NOT NULL, voter TEXT NOT NULL, value INTEGER NOT NULL CHECK(value BETWEEN 1 AND 5), created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS vault_items (id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '', season INTEGER NOT NULL, submitted_by TEXT NOT NULL, object_key TEXT, external_url TEXT, mime_type TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS trade_award_votes (category TEXT NOT NULL, voter TEXT NOT NULL, subject_type TEXT NOT NULL, subject_id TEXT NOT NULL, title TEXT NOT NULL, details TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL, PRIMARY KEY(category,voter));\`;
async function ready(db){await db.exec(schema)}
async function api(request,env){
 if(!env.DB)return json({error:'Database binding unavailable'},503);
 await ready(env.DB); const url=new URL(request.url); const method=request.method;
 if(method==='GET'&&url.pathname==='/api/trades'){
  const q=await env.DB.prepare(\`SELECT t.*, COUNT(v.voter) vote_count, ROUND(AVG(v.value),1) rating FROM trades t LEFT JOIN trade_votes v ON v.trade_id=t.id GROUP BY t.id ORDER BY t.created_at DESC\`).all();
  return json(q.results||[]);
 }
 if(method==='POST'&&url.pathname==='/api/trades'){
  const b=await request.json(); const required=['title','sideA','sideB','submittedBy'];
  if(required.some(k=>!String(b[k]||'').trim()))return json({error:'Complete every field'},400);
  const id=crypto.randomUUID(), now=new Date().toISOString(), season=Math.max(2022,Math.min(2100,Number(b.season)||2026));
  await env.DB.prepare('INSERT INTO trades (id,title,season,side_a,side_b,submitted_by,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,String(b.title).slice(0,100),season,String(b.sideA).slice(0,500),String(b.sideB).slice(0,500),String(b.submittedBy).slice(0,80),now).run();
  return json({id},201);
 }
 const match=url.pathname.match(/^\\/api\\/trades\\/([^/]+)\\/votes$/);
 if(match&&method==='GET'){
  const q=await env.DB.prepare('SELECT voter,value,updated_at FROM trade_votes WHERE trade_id=? ORDER BY updated_at DESC').bind(match[1]).all(); return json(q.results||[]);
 }
 if(match&&method==='POST'){
  const b=await request.json(), voter=String(b.voter||'').trim(), value=Number(b.value);
  if(!voter||!Number.isInteger(value)||value<1||value>5)return json({error:'Choose a manager and rating'},400);
  const now=new Date().toISOString(), historyId=crypto.randomUUID();
  await env.DB.batch([
   env.DB.prepare('INSERT INTO trade_vote_history (id,trade_id,voter,value,created_at) VALUES (?,?,?,?,?)').bind(historyId,match[1],voter.slice(0,80),value,now),
   env.DB.prepare('INSERT INTO trade_votes (trade_id,voter,value,updated_at) VALUES (?,?,?,?) ON CONFLICT(trade_id,voter) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').bind(match[1],voter.slice(0,80),value,now)
  ]); return json({ok:true});
 }
 if(method==='GET'&&url.pathname==='/api/vault'){
  const q=await env.DB.prepare('SELECT id,kind,title,caption,season,submitted_by,external_url,mime_type,created_at FROM vault_items ORDER BY created_at DESC').all();return json(q.results||[]);
 }
 if(method==='POST'&&url.pathname==='/api/vault'){
  const form=await request.formData(),file=form.get('file'),kind=String(form.get('kind')||''),title=String(form.get('title')||'').trim(),caption=String(form.get('caption')||'').trim(),submittedBy=String(form.get('submittedBy')||'').trim(),externalUrl=String(form.get('externalUrl')||'').trim(),season=Math.max(2022,Math.min(2100,Number(form.get('season'))||2026));
  if(!title||!submittedBy||!['image','video'].includes(kind))return json({error:'Complete every required field'},400);
  const id=crypto.randomUUID(),now=new Date().toISOString();let objectKey=null,mimeType=null,safeUrl=null;
  if(kind==='image'){
   if(!env.VAULT)return json({error:'Vault storage unavailable'},503);
   const imageCount=await env.DB.prepare("SELECT COUNT(*) total FROM vault_items WHERE kind='image'").first();if(Number(imageCount?.total||0)>=15)return json({error:'The Vault has reached its 15-photo limit'},409);
   if(!file||typeof file==='string'||!String(file.type).startsWith('image/'))return json({error:'Choose an image file'},400);
   if(file.size>8*1024*1024)return json({error:'Images must be 8 MB or smaller'},413);
   mimeType=file.type;objectKey=id+'-'+String(file.name||'image').replace(/[^a-zA-Z0-9._-]/g,'_').slice(-80);await env.VAULT.put(objectKey,await file.arrayBuffer(),{httpMetadata:{contentType:mimeType}});
  }else{
   try{const parsed=new URL(externalUrl);if(!['https:','http:'].includes(parsed.protocol))throw 0;safeUrl=parsed.toString()}catch{return json({error:'Enter a valid video URL'},400)}
  }
  await env.DB.prepare('INSERT INTO vault_items (id,kind,title,caption,season,submitted_by,object_key,external_url,mime_type,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(id,kind,title.slice(0,100),caption.slice(0,500),season,submittedBy.slice(0,80),objectKey,safeUrl,mimeType,now).run();return json({id},201);
 }
 if(method==='GET'&&url.pathname==='/api/trade-awards'){
  const q=await env.DB.prepare('SELECT category,subject_type,subject_id,title,details,COUNT(*) votes,MAX(updated_at) updated_at FROM trade_award_votes GROUP BY category,subject_type,subject_id,title,details ORDER BY category,votes DESC,updated_at DESC').all();return json(q.results||[]);
 }
 if(method==='POST'&&url.pathname==='/api/trade-awards'){
  const b=await request.json(),category=String(b.category||''),voter=String(b.voter||'').trim(),subjectType=String(b.subjectType||''),subjectId=String(b.subjectId||'').trim(),title=String(b.title||'').trim(),details=String(b.details||'').trim();
  if(!['best','worst'].includes(category)||!['manual','sleeper'].includes(subjectType)||!voter||!subjectId||!title)return json({error:'Choose a manager and trade'},400);
  await env.DB.prepare('INSERT INTO trade_award_votes (category,voter,subject_type,subject_id,title,details,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(category,voter) DO UPDATE SET subject_type=excluded.subject_type,subject_id=excluded.subject_id,title=excluded.title,details=excluded.details,updated_at=excluded.updated_at').bind(category,voter.slice(0,80),subjectType,subjectId.slice(0,100),title.slice(0,140),details.slice(0,800),new Date().toISOString()).run();return json({ok:true});
 }
 const media=url.pathname.match(/^\\/api\\/vault\\/([^/]+)\\/media$/);
 if(media&&method==='GET'){
  if(!env.VAULT)return json({error:'Vault storage unavailable'},503);const row=await env.DB.prepare('SELECT object_key,mime_type FROM vault_items WHERE id=?').bind(media[1]).first();if(!row?.object_key)return json({error:'Not found'},404);const object=await env.VAULT.get(row.object_key);if(!object)return json({error:'Not found'},404);return new Response(object.body,{headers:{'content-type':row.mime_type||'application/octet-stream','cache-control':'public, max-age=86400'}});
 }
 return json({error:'Not found'},404);
}
export default {async fetch(request,env){const u=new URL(request.url);if(u.pathname==='/api/auth/login'&&request.method==='POST'){const body=await request.json().catch(()=>({}));if(!env.LEAGUE_ACCESS_CODE||String(body.code||'')!==env.LEAGUE_ACCESS_CODE)return json({error:'Invalid access code'},401);const token=await sessionToken(env.SESSION_SECRET);return new Response(null,{status:204,headers:{'set-cookie':'gf_session='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000'}})}if(u.pathname==='/api/auth/logout'){return new Response(null,{status:204,headers:{'set-cookie':'gf_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'}})}const isAuthed=await authenticated(request,env);if(u.pathname==='/api/auth/status')return json({authenticated:isAuthed},isAuthed?200:401);if(!isAuthed&&u.pathname.startsWith('/api/'))return json({error:'Authentication required'},401);if(u.pathname.startsWith('/api/')){try{return await api(request,env)}catch(e){return json({error:'Request failed'},500)}}return env.ASSETS.fetch(request)}};\n`);

