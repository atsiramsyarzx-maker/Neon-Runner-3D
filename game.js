(function(){
if(typeof THREE==='undefined'){var mm=document.getElementById('msg');if(mm)mm.textContent='Gagal memuat Three.js. Periksa koneksi internet lalu muat ulang halaman.';return}
const LANES=[-3,0,3];
const scoreEl=document.getElementById('score'),coinsEl=document.getElementById('coins'),bestEl=document.getElementById('best'),menu=document.getElementById('menu'),finalEl=document.getElementById('final');
let best=0;

const SKINS=[
{id:'neon',n:'Neon Biru',p:0,c:0x00f0ff,e:0x006c78},
{id:'pink',n:'Pink Pulsa',p:30,c:0xff2d95,e:0x6a0a3a},
{id:'lime',n:'Hijau Toksik',p:60,c:0x9dff2a,e:0x2f5000},
{id:'gold',n:'Kotak Emas',p:120,c:0xffd400,e:0x7a6000},
{id:'violet',n:'Ungu Galaksi',p:200,c:0x9a4cff,e:0x30106a},
{id:'crystal',n:'Kristal',p:300,c:0xe8f6ff,e:0x4a6a8a,g:'oct'},
{id:'fire',n:'Meteor Api',p:450,c:0xff6a00,e:0x8a2200,g:'ico'}];
let wallet=0,owned=['neon'],cur='neon',user=null,online=false,token=null;
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
document.body.prepend(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0a0620);
scene.fog=new THREE.Fog(0x0a0620,25,85);
const camera=new THREE.PerspectiveCamera(70,1,0.1,200);
camera.position.set(0,5,9);camera.lookAt(0,1,-8);

scene.add(new THREE.AmbientLight(0x6655aa,0.9));
const sun=new THREE.DirectionalLight(0xffffff,0.9);sun.position.set(5,12,6);scene.add(sun);

// lantai
const floor=new THREE.Mesh(new THREE.PlaneGeometry(14,200),new THREE.MeshStandardMaterial({color:0x14093a}));
floor.rotation.x=-Math.PI/2;floor.position.z=-80;scene.add(floor);

// garis pembatas jalur (didaur ulang)
const dashes=[];
const dashGeo=new THREE.BoxGeometry(0.15,0.02,2),dashMat=new THREE.MeshBasicMaterial({color:0x00f0ff});
[-1.5,1.5].forEach(x=>{for(let i=0;i<16;i++){const d=new THREE.Mesh(dashGeo,dashMat);d.position.set(x,0.02,-i*6);scene.add(d);dashes.push(d)}});

// gedung samping
const bldgs=[];
for(let i=0;i<24;i++){
  const h=4+Math.random()*14;
  const m=new THREE.Mesh(new THREE.BoxGeometry(3,h,3),new THREE.MeshStandardMaterial({color:i%2?0xff2d95:0x7a3cff,emissive:i%2?0x40082a:0x1c0a40}));
  m.position.set((i%2?1:-1)*(9+Math.random()*4),h/2,-Math.floor(i/2)*12);
  scene.add(m);bldgs.push(m);
}

// peta (ganti tiap 1000 skor)
const MAPS=[
{n:'Neon Night',bg:0x0a0620,floor:0x14093a,line:0x00f0ff,b1:0xff2d95,e1:0x40082a,b2:0x7a3cff,e2:0x1c0a40},
{n:'Gurun Senja',bg:0x2a0f12,floor:0x4a2210,line:0xffb347,b1:0xff6a3d,e1:0x4a1608,b2:0xc9803a,e2:0x40240a},
{n:'Samudra Es',bg:0x04162a,floor:0x0b2e4d,line:0x7df9ff,b1:0x3aa0ff,e1:0x0a2a4a,b2:0xbfeaff,e2:0x1a3a52},
{n:'Hutan Matrix',bg:0x021a0c,floor:0x06301a,line:0x7dff3a,b1:0x1fd86a,e1:0x053a1a,b2:0x9dff2a,e2:0x1f4a05}];
let mapIdx=0,lastMapTxt='';
const mapEl=document.getElementById('mapinfo');
const SH=[new THREE.BoxGeometry(1,1,1),new THREE.ConeGeometry(0.5,1,4),new THREE.ConeGeometry(0.4,1,6),new THREE.ConeGeometry(0.5,1,8)];
const SC=[[3,1,3],[5,0.9,5],[3,1.6,3],[4.5,0.8,4.5]];
function swapScenery(i){bldgs.forEach(b=>{
  b.userData.h=b.userData.h||b.position.y*2;
  if(!SH.includes(b.geometry))b.geometry.dispose();
  const h=b.userData.h*SC[i][1];b.geometry=SH[i];b.scale.set(SC[i][0],h,SC[i][2]);b.position.y=h/2;
})}
const mapCols={},mapTgt={};
for(const k in MAPS[0])if(k!=='n'){mapCols[k]=new THREE.Color(MAPS[0][k]);mapTgt[k]=new THREE.Color(MAPS[0][k])}
function setMap(i,instant){mapIdx=i;swapScenery(i);for(const k in mapTgt)mapTgt[k].setHex(MAPS[i][k]);if(instant)for(const k in mapCols)mapCols[k].copy(mapTgt[k])}
function updateMap(dt){
  const q=Math.min(1,dt*2.5);
  for(const k in mapCols)mapCols[k].lerp(mapTgt[k],q);
  scene.background.copy(mapCols.bg);scene.fog.color.copy(mapCols.bg);
  floor.material.color.copy(mapCols.floor);dashMat.color.copy(mapCols.line);
  bldgs.forEach((b,i)=>{const a=i%2;b.material.color.copy(a?mapCols.b1:mapCols.b2);b.material.emissive.copy(a?mapCols.e1:mapCols.e2)});
}
const bannerEl=document.getElementById('banner');let bannerT;
function banner(txt){bannerEl.textContent='🗺️ '+txt;bannerEl.classList.add('show');clearTimeout(bannerT);bannerT=setTimeout(()=>bannerEl.classList.remove('show'),2200)}

// pemain
const player=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.1,1.1),new THREE.MeshStandardMaterial({color:0x00f0ff,emissive:0x006c78}));
player.position.set(0,0.55,0);scene.add(player);
const glow=new THREE.PointLight(0x00f0ff,1.2,12);player.add(glow);

const obGeo=new THREE.BoxGeometry(2,1.7,2),obMat=new THREE.MeshStandardMaterial({color:0xff2040,emissive:0x6a0818});
const coinGeo=new THREE.CylinderGeometry(0.5,0.5,0.15,20),coinMat=new THREE.MeshStandardMaterial({color:0xffd400,emissive:0x7a6000});

let obstacles=[],coinsArr=[],items=[],lastFx='';
const fxEl=document.getElementById('fx');
const fx={shield:0,magnet:0,x2:0};
const ITEMS={
  shield:{g:new THREE.IcosahedronGeometry(0.6),c:0x44d6ff,l:'🛡️ Perisai'},
  magnet:{g:new THREE.TorusGeometry(0.45,0.18,10,18),c:0xff2d95,l:'🧲 Magnet'},
  x2:{g:new THREE.OctahedronGeometry(0.65),c:0x7dff3a,l:'✖️2 Koin'}
};
for(const k in ITEMS)ITEMS[k].m=new THREE.MeshStandardMaterial({color:ITEMS[k].c,emissive:ITEMS[k].c,emissiveIntensity:.7});
const bubble=new THREE.Mesh(new THREE.SphereGeometry(1.3,16,12),new THREE.MeshBasicMaterial({color:0x66e0ff,transparent:true,opacity:0.28}));
bubble.visible=false;player.add(bubble);
const aura=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:0x00f0ff,transparent:true,opacity:0.18,depthWrite:false}));scene.add(aura);
const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,0.04,8,32),new THREE.MeshBasicMaterial({color:0x00f0ff,transparent:true,opacity:0.8}));ring.visible=false;scene.add(ring);
function spawnItem(){
  const ks=Object.keys(ITEMS),k=ks[Math.floor(Math.random()*ks.length)],m=new THREE.Mesh(ITEMS[k].g,ITEMS[k].m);
  m.userData.type=k;m.position.set(LANES[Math.floor(Math.random()*3)],1.3,-97);scene.add(m);items.push(m);
}
const walletN=document.getElementById('walletN'),lobbyEl=document.getElementById('lobby'),shopEl=document.getElementById('shop'),gridEl=document.getElementById('grid');
function save(){if(!user)return;const d={best,wallet,owned,skin:cur};LS.set('neon-data:'+user,JSON.stringify(d));if(online&&token)fetch('/api/data',{method:'PUT',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(d)}).catch(()=>{})}
function geoFor(s){return s.g==='oct'?new THREE.OctahedronGeometry(0.85):s.g==='ico'?new THREE.IcosahedronGeometry(0.8):new THREE.BoxGeometry(1.1,1.1,1.1)}
function applySkin(){const s=SKINS.find(x=>x.id===cur);player.geometry.dispose();player.geometry=geoFor(s);player.material.color.setHex(s.c);player.material.emissive.setHex(s.e);glow.color.setHex(s.c);aura.material.color.setHex(s.c);ring.material.color.setHex(s.c);ring.visible=s.p>=120}
function renderShop(){
  walletN.textContent=wallet;gridEl.innerHTML='';
  SKINS.forEach(s=>{
    const has=owned.includes(s.id),card=document.createElement('div');
    card.className='card'+(cur===s.id?' on':'');
    const hx=s.c.toString(16).padStart(6,'0');card.innerHTML='<div class="sw'+(s.p>=120?' ring':'')+'" style="--ac:#'+hx+';background:#'+s.c.toString(16).padStart(6,'0')+';box-shadow:0 0 14px #'+s.c.toString(16).padStart(6,'0')+'"></div><b>'+s.n+'</b><small>'+(has?'Dimiliki':'🪙 '+s.p)+'</small>';
    const b=document.createElement('button');
    b.textContent=cur===s.id?'Dipakai':has?'Pakai':'Beli';
    if(cur===s.id)b.disabled=true;
    b.onclick=()=>{
      if(has){cur=s.id}
      else if(wallet>=s.p){wallet-=s.p;owned.push(s.id);cur=s.id}
      else{b.textContent='Koin kurang';return}
      applySkin();save();renderShop();
    };
    card.appendChild(b);gridEl.appendChild(card);
  });
}
function showLobby(){lobbyEl.style.display='block';shopEl.style.display='none';walletN.textContent=wallet}
document.getElementById('shopBtn').onclick=()=>{lobbyEl.style.display='none';shopEl.style.display='block';renderShop()};
document.getElementById('back').onclick=showLobby;
let state='menu',speed,dist,score,coinCount,lane,vy,spawnAcc;

function reset(){
  obstacles.forEach(o=>scene.remove(o));coinsArr.forEach(c=>scene.remove(c));
  obstacles=[];coinsArr=[];items.forEach(i=>scene.remove(i));items=[];setMap(0,true);fx.shield=fx.magnet=fx.x2=0;bubble.visible=false;fxEl.innerHTML='';lastFx='';
  speed=16;dist=0;score=0;coinCount=0;lane=1;vy=0;spawnAcc=0;
  player.position.set(0,0.55,0);player.rotation.set(0,0,0);
}
function spawnRow(){
  if(Math.random()<0.35)spawnItem();
  const free=Math.floor(Math.random()*3);
  for(let l=0;l<3;l++){
    if(l===free)continue;
    if(Math.random()<0.75){const o=new THREE.Mesh(obGeo,obMat);o.position.set(LANES[l],0.85,-90);scene.add(o);obstacles.push(o)}
  }
  for(let k=0;k<3;k++){
    const c=new THREE.Mesh(coinGeo,coinMat);c.rotation.x=Math.PI/2;
    c.position.set(LANES[free],1,-90-k*3);c.userData.spin=true;scene.add(c);coinsArr.push(c);
  }
}
function start(){reset();state='play';menu.style.display='none'}
function gameOver(){
  state='over';
  if(score>best){best=score;bestEl.textContent=best}
  finalEl.textContent='Skor: '+score+' · Koin: '+coinCount;
  wallet+=coinCount;save();showLobby();
  fx.shield=fx.magnet=fx.x2=0;bubble.visible=false;fxEl.innerHTML='';lastFx='';
  document.getElementById('play').textContent='MAIN LAGI';
  menu.style.display='flex';
}

function move(d){if(state==='play')lane=Math.max(0,Math.min(2,lane+d))}
function jump(){if(state==='play'&&player.position.y<=0.56)vy=11}
addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  const k=e.key;
  if(k==='ArrowLeft'||k==='a'||k==='A')move(-1);
  else if(k==='ArrowRight'||k==='d'||k==='D')move(1);
  else if(k==='ArrowUp'||k==='w'||k==='W'||k===' '){jump();e.preventDefault()}
});
let tx=0,ty=0;
addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY},{passive:true});
addEventListener('touchend',e=>{
  if(e.target.id==='play')return;
  const dx=e.changedTouches[0].clientX-tx,dy=e.changedTouches[0].clientY-ty;
  if(Math.abs(dx)>30&&Math.abs(dx)>Math.abs(dy))move(dx>0?1:-1);
  else if(dy<-30)jump();
  else if(Math.abs(dx)<10&&Math.abs(dy)<10)jump();
},{passive:true});
document.getElementById('play').addEventListener('click',start);

function resize(){
  const w=innerWidth,h=innerHeight;
  renderer.setSize(w,h);camera.aspect=w/h;
  camera.fov=w/h<0.8?85:70;camera.updateProjectionMatrix();
}
addEventListener('resize',resize);resize();

const clock=new THREE.Clock();
function loop(){
  requestAnimationFrame(loop);
  const dt=Math.min(clock.getDelta(),0.05),t=clock.elapsedTime;
  const v=state==='play'?speed:6;
  const dz=v*dt;

  updateMap(dt);
  dashes.forEach(d=>{d.position.z+=dz;if(d.position.z>8)d.position.z-=96});
  bldgs.forEach(b=>{b.position.z+=dz;if(b.position.z>10)b.position.z-=144});

  if(state==='play'){
    speed+=dt*(0.45+speed*0.008);dist+=dz;
    score=Math.floor(dist/2)+coinCount*10;
    scoreEl.textContent=score;
    const lv=Math.floor(score/1000)%MAPS.length;
    if(lv!==mapIdx){setMap(lv);banner(MAPS[lv].n)}
    const mt='MAP: '+MAPS[mapIdx].n+' · berikutnya di skor '+((Math.floor(score/1000)+1)*1000);
    if(mt!==lastMapTxt){mapEl.textContent=mt;lastMapTxt=mt}
    // gerak jalur halus
    player.position.x+=(LANES[lane]-player.position.x)*Math.min(1,dt*14);
    player.rotation.z=(player.position.x-LANES[lane])*0.2;
    // lompat
    vy-=30*dt;player.position.y+=vy*dt;
    if(player.position.y<0.55){player.position.y=0.55;vy=0}
    player.rotation.x-=dz*0.15*(player.position.y>0.6?0.5:0);
    // spawn
    spawnAcc+=dz;
    if(spawnAcc>Math.max(16,speed*0.75)){spawnAcc=0;spawnRow()}
    let fxt='';
    for(const k in fx){if(fx[k]>0){fx[k]=Math.max(0,fx[k]-dt);if(fx[k]>0)fxt+='<span>'+ITEMS[k].l+' '+Math.ceil(fx[k])+'s</span>'}}
    if(fxt!==lastFx){fxEl.innerHTML=fxt;lastFx=fxt}
    bubble.visible=fx.shield>0;bubble.rotation.y+=dt;
    // rintangan
    const px=player.position.x,py=player.position.y;
    for(let i=obstacles.length-1;i>=0;i--){
      const o=obstacles[i];o.position.z+=dz;
      if(Math.abs(o.position.z)<1.5+dz&&Math.abs(o.position.x-px)<1.4&&py-0.55<1.7){if(fx.shield>0){fx.shield=0;scene.remove(o);obstacles.splice(i,1);continue}gameOver();break}
      if(o.position.z>10){scene.remove(o);obstacles.splice(i,1)}
    }
    // item drop
    for(let i=items.length-1;i>=0;i--){
      const it=items[i];it.position.z+=dz;it.rotation.y+=dt*3;it.rotation.x+=dt*1.5;it.position.y=1.3+Math.sin(t*4+i)*0.15;
      if(Math.abs(it.position.z)<1.4+dz&&Math.abs(it.position.x-px)<1.4&&Math.abs(it.position.y-py)<1.6){
        const ty=it.userData.type,dur=ty==='shield'?15:ty==='magnet'?9:10;fx[ty]=Math.min(fx[ty]+dur,dur*3);scene.remove(it);items.splice(i,1);continue;
      }
      if(it.position.z>10){scene.remove(it);items.splice(i,1)}
    }
    // koin
    for(let i=coinsArr.length-1;i>=0;i--){
      const c=coinsArr[i];c.position.z+=dz;c.rotation.z+=dt*5;
      if(fx.magnet>0&&c.position.z>-35){const k=Math.min(1,dt*7);c.position.x+=(px-c.position.x)*k;c.position.y+=(py-c.position.y)*k}
      if(Math.abs(c.position.z)<1.3+dz&&Math.abs(c.position.x-px)<1.3&&Math.abs(c.position.y-py)<1.4){
        scene.remove(c);coinsArr.splice(i,1);coinCount+=fx.x2>0?2:1;coinsEl.textContent=coinCount;continue;
      }
      if(c.position.z>10){scene.remove(c);coinsArr.splice(i,1)}
    }
  } else {
    // animasi menu
    player.rotation.y+=dt;player.position.y=0.55+Math.sin(t*2)*0.15;
  }
  aura.position.copy(player.position);aura.scale.setScalar(1.25+Math.sin(t*4)*0.12);
  ring.position.copy(player.position);ring.rotation.x=t*2;ring.rotation.y=t*1.3;
  camera.position.x+=(player.position.x*0.4-camera.position.x)*0.08;
  renderer.render(scene,camera);
}
reset();coinsEl.textContent=0;scoreEl.textContent=0;

// ===== login & penyimpanan akun (online jika server ada, jika tidak lokal) =====
const $=id=>document.getElementById(id);
const loginEl=$('login'),uEl=$('user'),pEl=$('pass'),msgEl=$('msg'),whoEl=$('who');
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const accounts=()=>{try{return JSON.parse(LS.get('neon-accounts')||'{}')}catch(e){return{}}};
async function hashPw(u,p){
  const str=u+':'+p;
  if(window.crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')}
  let h=5381;for(const ch of str)h=((h<<5)+h+ch.charCodeAt(0))|0;return 'f'+h;
}
function applyData(d){
  best=+d.best||0;wallet=+d.wallet||0;
  owned=Array.isArray(d.owned)&&d.owned.length?d.owned:['neon'];
  cur=owned.includes(d.skin)?d.skin:'neon';
  bestEl.textContent=best;applySkin();showLobby();
}
function loadUser(name,data){
  user=name;let d=data;
  if(!d){d={};try{d=JSON.parse(LS.get('neon-data:'+name)||'{}')}catch(e){}}
  applyData(d);whoEl.textContent='\u{1F464} '+name;
  LS.set('neon-session',name);loginEl.style.display='none';
}
async function api(path,opt){
  const r=await fetch(path,opt),j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||'Gagal ('+r.status+')');
  return j;
}
async function doAuth(register){
  msgEl.textContent='Memproses...';
  try{await doAuth2(register)}catch(e){msgEl.textContent=e.message}
}
async function doAuth2(register){
  try{localStorage.setItem('neon-test','1');localStorage.removeItem('neon-test')}catch(e){msgEl.textContent='Penyimpanan browser diblokir, data tidak bisa disimpan. Buka di browser biasa (bukan mode privat).';return}
  const u=uEl.value.trim().toLowerCase(),p=pEl.value;
  if(u.length<3||p.length<4){msgEl.textContent='Nama min. 3 karakter, sandi min. 4 karakter.';return}
  if(online){
    const j=await api('/api/'+(register?'register':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
    token=j.token;LS.set('neon-token',token);
    pEl.value='';msgEl.textContent='';loadUser(u,j.data);return;
  }
  const acc=accounts(),h=await hashPw(u,p);
  if(register){
    if(acc[u]){msgEl.textContent='Nama sudah dipakai.';return}
    acc[u]=h;LS.set('neon-accounts',JSON.stringify(acc));
    try{if(Object.keys(acc).length===1&&LS.get('neon-wallet')!==null)LS.set('neon-data:'+u,JSON.stringify({best:+LS.get('neon-best')||0,wallet:+LS.get('neon-wallet')||0,owned:JSON.parse(LS.get('neon-owned')||'["neon"]'),skin:LS.get('neon-skin')||'neon'}))}catch(e){}
  }else if(acc[u]!==h){msgEl.textContent='Nama atau sandi salah.';return}
  pEl.value='';msgEl.textContent='';loadUser(u);
}
$('loginBtn').onclick=()=>doAuth(false);
$('regBtn').onclick=()=>doAuth(true);
[uEl,pEl].forEach(el=>el.addEventListener('keydown',e=>{if(e.key==='Enter')doAuth(false)}));
$('logout').onclick=()=>{LS.del('neon-session');LS.del('neon-token');token=null;user=null;uEl.value='';loginEl.style.display='flex'};
$('exportBtn').onclick=()=>prompt('Salin kode cadangan ini dan simpan:',btoa(JSON.stringify({best,wallet,owned,skin:cur})));
$('importBtn').onclick=()=>{
  const c=prompt('Tempel kode cadangan (akan menimpa data akun ini):');if(!c)return;
  try{applyData(JSON.parse(atob(c.trim())));save()}catch(e){alert('Kode tidak valid.')}
};
applySkin();showLobby();
(async()=>{
  try{const r=await fetch('/api/ping');online=r.ok&&(await r.json()).ok===true}catch(e){online=false}
  if(online){
    const tk=LS.get('neon-token'),nm=LS.get('neon-session');
    if(tk&&nm){try{const j=await api('/api/data',{headers:{Authorization:'Bearer '+tk}});token=tk;loadUser(nm,j.data);return}catch(e){}}
    loginEl.style.display='flex';
  }else{
    const sess=LS.get('neon-session');
    if(sess&&accounts()[sess])loadUser(sess);else loginEl.style.display='flex';
  }
})();
loop();
})();
