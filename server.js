// Neon Runner - server publik tanpa dependensi (Node.js 18+)
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000;
const DATA_DIR=process.env.DATA_DIR||path.join(__dirname,'data');
const DB_FILE=path.join(DATA_DIR,'db.json');
const PUBLIC=path.join(__dirname,'public');
const SKINS=['neon','pink','lime','gold','violet','crystal','fire'];
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.ico':'image/x-icon'};

fs.mkdirSync(DATA_DIR,{recursive:true});
let db={users:{},sessions:{}};
try{db=JSON.parse(fs.readFileSync(DB_FILE,'utf8'))}catch(e){}
let dirty=false;
const flush=()=>{if(!dirty)return;dirty=false;fs.writeFileSync(DB_FILE+'.tmp',JSON.stringify(db));fs.renameSync(DB_FILE+'.tmp',DB_FILE)};
setInterval(flush,2000);
for(const s of['SIGTERM','SIGINT'])process.on(s,()=>{flush();process.exit(0)});

const hashPw=(p,salt)=>crypto.scryptSync(p,salt,32).toString('hex');
const hits={};
function limited(ip){const now=Date.now(),a=(hits[ip]||[]).filter(t=>now-t<600000);a.push(now);hits[ip]=a;return a.length>30}
function clean(d){
  d=d||{};
  const owned=[...new Set((Array.isArray(d.owned)?d.owned:[]).filter(x=>SKINS.includes(x)))];
  if(!owned.includes('neon'))owned.unshift('neon');
  const n=v=>Math.max(0,Math.min(1e9,Math.floor(+v||0)));
  return{best:n(d.best),wallet:n(d.wallet),owned,skin:owned.includes(d.skin)?d.skin:'neon'};
}
function body(req){return new Promise((ok,no)=>{let s='';req.on('data',c=>{s+=c;if(s.length>10000){no(new Error('too big'));req.destroy()}});req.on('end',()=>{try{ok(JSON.parse(s||'{}'))}catch(e){no(new Error('bad json'))}})})}
function send(res,code,obj){res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
function authUser(req){
  const t=(req.headers.authorization||'').replace('Bearer ','');
  const s=db.sessions[t];
  if(!s||Date.now()-s.t>30*864e5)return null;
  return db.users[s.u]?s.u:null;
}
function newSession(u){const t=crypto.randomBytes(32).toString('hex');db.sessions[t]={u,t:Date.now()};dirty=true;return t}

async function api(req,res,p){
  if(p==='/api/ping')return send(res,200,{ok:true});
  if(p==='/api/data'){
    const u=authUser(req);if(!u)return send(res,401,{error:'Sesi habis, silakan masuk lagi.'});
    if(req.method==='GET')return send(res,200,{data:db.users[u].data});
    if(req.method==='PUT'){db.users[u].data=clean(await body(req));dirty=true;return send(res,200,{ok:true})}
  }
  if((p==='/api/register'||p==='/api/login')&&req.method==='POST'){
    if(limited(req.socket.remoteAddress))return send(res,429,{error:'Terlalu banyak percobaan, coba lagi nanti.'});
    const b=await body(req),u=String(b.username||'').toLowerCase(),pw=String(b.password||'');
    if(!/^[a-z0-9_]{3,16}$/.test(u)||pw.length<4||pw.length>64)return send(res,400,{error:'Nama: 3-16 huruf/angka/_ , sandi: 4-64 karakter.'});
    if(p==='/api/register'){
      if(db.users[u])return send(res,409,{error:'Nama sudah dipakai.'});
      const salt=crypto.randomBytes(16).toString('hex');
      db.users[u]={salt,hash:hashPw(pw,salt),data:clean({})};dirty=true;
    }else{
      const x=db.users[u];
      const ok=x&&crypto.timingSafeEqual(Buffer.from(x.hash,'hex'),Buffer.from(hashPw(pw,x.salt),'hex'));
      if(!ok)return send(res,401,{error:'Nama atau sandi salah.'});
    }
    return send(res,200,{token:newSession(u),data:db.users[u].data});
  }
  send(res,404,{error:'Tidak ditemukan.'});
}

http.createServer(async(req,res)=>{
  try{
    const p=decodeURIComponent(req.url.split('?')[0]);
    if(p.startsWith('/api/'))return await api(req,res,p);
    const f=path.join(PUBLIC,p==='/'?'index.html':p);
    if(!f.startsWith(PUBLIC))return send(res,403,{error:'Dilarang.'});
    fs.readFile(f,(e,d)=>{
      if(e){res.writeHead(404);return res.end('Not found')}
      res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(d);
    });
  }catch(e){send(res,400,{error:e.message})}
}).listen(PORT,()=>console.log('Neon Runner jalan di http://localhost:'+PORT));
