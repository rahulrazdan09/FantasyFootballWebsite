import {mkdir, copyFile, writeFile} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
await writeFile('dist/server/index.js',`const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const schema=\`CREATE TABLE IF NOT EXISTS trades (id TEXT PRIMARY KEY, title TEXT NOT NULL, season INTEGER NOT NULL, side_a TEXT NOT NULL, side_b TEXT NOT NULL, submitted_by TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS trade_votes (trade_id TEXT NOT NULL, voter TEXT NOT NULL, value INTEGER NOT NULL CHECK(value BETWEEN 1 AND 5), updated_at TEXT NOT NULL, PRIMARY KEY(trade_id,voter));
CREATE TABLE IF NOT EXISTS trade_vote_history (id TEXT PRIMARY KEY, trade_id TEXT NOT NULL, voter TEXT NOT NULL, value INTEGER NOT NULL CHECK(value BETWEEN 1 AND 5), created_at TEXT NOT NULL);\`;
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
 return json({error:'Not found'},404);
}
export default {async fetch(request,env){const u=new URL(request.url);if(u.pathname.startsWith('/api/')){try{return await api(request,env)}catch(e){return json({error:'Request failed'},500)}}return env.ASSETS.fetch(request)}};\n`);

