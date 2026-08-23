import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
document.querySelector('#status').textContent='3D 엔진 시작…';

const host=document.querySelector('#canvas'), statusEl=document.querySelector('#status'), timerEl=document.querySelector('#timer');
const startBtn=document.querySelector('#start'), againBtn=document.querySelector('#again'), countdown=document.querySelector('#countdown');
const resultEl=document.querySelector('#results'), winnerEl=document.querySelector('#winner'), standingEl=document.querySelector('#standing'), eventEl=document.querySelector('#events');
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x8fd9ff); scene.fog=new THREE.Fog(0x8fd9ff,34,105);
const camera=new THREE.PerspectiveCamera(54,1,.1,180); camera.position.set(0,8,14);
const renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,1.7)); renderer.shadowMap.enabled=true; host.append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xeafaff,0x597445,2.5)); const sun=new THREE.DirectionalLight(0xfff1cf,3); sun.position.set(-12,25,10); sun.castShadow=true; scene.add(sun);

const laneX=[-4.5,-1.5,1.5,4.5], finishZ=-92, clock=new THREE.Clock(), loader=new GLTFLoader();
const specs=[['토끼','models/bunny.glb',0xff8faa],['몽구스','models/monkroose.glb',0x3ac8a4],['고양이','models/cat.glb',0xffa52e],['닭','models/chicken.glb',0x9471ff]];
let racers=[], obstacles=[], effects=[], running=false, startedAt=0, finishOrder=[];

function mesh(g,m,x,y,z){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.receiveShadow=o.castShadow=true;scene.add(o);return o}
const grass=new THREE.MeshStandardMaterial({color:0x55ad5b,roughness:1}), road=new THREE.MeshStandardMaterial({color:0xd7c29b,roughness:1});
mesh(new THREE.PlaneGeometry(80,190),grass,0,-.08,-45).rotation.x=-Math.PI/2;
mesh(new THREE.BoxGeometry(13,0.18,110),road,0,0,-42);
for(let x=-6;x<=6;x+=3){const line=mesh(new THREE.BoxGeometry(.055,.03,110),new THREE.MeshStandardMaterial({color:0xffffff}),x,.12,-42);line.receiveShadow=false}
for(let i=0;i<36;i++){const x=(i%2?-1:1)*(9+Math.random()*18), z=8-i*3.5; const trunk=mesh(new THREE.CylinderGeometry(.18,.25,2),new THREE.MeshStandardMaterial({color:0x76502e}),x,1,z); const crown=mesh(new THREE.ConeGeometry(1.3,3,7),new THREE.MeshStandardMaterial({color:0x257d47}),x,3,z); trunk.castShadow=crown.castShadow=true}
const gateMat=new THREE.MeshStandardMaterial({color:0xffffff}); mesh(new THREE.BoxGeometry(.5,5,.5),gateMat,-6.3,2.5,finishZ);mesh(new THREE.BoxGeometry(.5,5,.5),gateMat,6.3,2.5,finishZ);mesh(new THREE.BoxGeometry(13,.6,.5),new THREE.MeshStandardMaterial({color:0x172a43}),0,5,finishZ);

function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()} addEventListener('resize',resize);resize();
function clip(r,words){const found=r.clips.find(c=>words.some(w=>c.name.toLowerCase().includes(w)));if(found)return found;const safe=words.includes('hit')||words.includes('jump');return r.clips.find(c=>c.name.toLowerCase().includes(safe?'walk':'idle'))||r.clips.find(c=>c.name.toLowerCase().includes('run'))||r.clips[0]}
function play(r,words,once=false){const c=clip(r,words);if(!c)return;if(r.action?.getClip()===c)return;const next=r.mixer.clipAction(c);next.reset();next.enabled=true;next.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat);next.clampWhenFinished=once;next.fadeIn(.12).play();r.action?.fadeOut(.12);r.action=next}
function normalize(model,height=1.65){const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());model.position.sub(center);model.position.y+=size.y/2;model.scale.setScalar(height/Math.max(size.y,.01));model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}})}
async function loadRacers(){statusEl.textContent='3D 동물을 불러오는 중…'; racers=await Promise.all(specs.map(async(s,i)=>{const g=await loader.loadAsync(s[1]);normalize(g.scene);g.scene.position.set(laneX[i],0,5);g.scene.rotation.y=Math.PI;scene.add(g.scene);const r={name:s[0],root:g.scene,clips:g.animations,mixer:new THREE.AnimationMixer(g.scene),action:null,z:5,speed:0,base:7.0+Math.random()*.6,boost:0,stun:0,jump:0,vy:0,attackCd:2+Math.random()*3,particleCd:0,animLock:0,finished:false,time:0,lane:i,color:s[2]};play(r,['idle']);return r}));statusEl.textContent='준비 완료';}
function announce(text){const s=document.createElement('span');s.textContent=text;eventEl.prepend(s);setTimeout(()=>s.remove(),2200)}
function burst(pos,color=0xffe852){for(let i=0;i<9;i++){const p=mesh(new THREE.SphereGeometry(.05,5,5),new THREE.MeshBasicMaterial({color}),pos.x,1,pos.z);effects.push({o:p,v:new THREE.Vector3((Math.random()-.5)*5,Math.random()*4,(Math.random()-.5)*4),life:.65})}}
function throwBall(a,t){const ball=mesh(new THREE.SphereGeometry(.16,10,8),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.45}),a.root.position.x,1.25,a.z);ball.castShadow=true;effects.push({kind:'ball',o:ball,from:new THREE.Vector3(a.root.position.x,1.25,a.z),target:t,life:.48,max:.48})}
function spawnObstacle(z,lane,moving=false){const mat=new THREE.MeshStandardMaterial({color:moving?0xf2674a:0x8f6339});const o=mesh(moving?new THREE.BoxGeometry(1.05,1.35,.8):new THREE.BoxGeometry(1.55,.72,.6),mat,laneX[lane],moving?.68:.36,z);o.scale.set(.01,.01,.01);obstacles.push({o,z,lane,moving,age:0,hit:new Set()})}
function resetRace(){finishOrder=[];obstacles.forEach(x=>scene.remove(x.o));obstacles=[];effects.forEach(x=>scene.remove(x.o));effects=[];resultEl.hidden=true;againBtn.hidden=true;eventEl.innerHTML='';racers.forEach((r,i)=>{r.root.position.set(laneX[i],0,5);r.root.rotation.set(0,Math.PI,0);r.z=5;r.speed=0;r.base=6.7+Math.random()*1.0;r.boost=r.stun=r.jump=r.vy=0;r.animLock=0;r.attackCd=1.5+Math.random()*3;r.finished=false;r.time=0;play(r,['idle'])});for(let z=-12;z>-86;z-=10+Math.random()*7)spawnObstacle(z,Math.floor(Math.random()*4),Math.random()<.38)}
async function start(){if(!racers.length)return;resetRace();startBtn.disabled=true;for(const v of ['3','2','1','GO!']){countdown.textContent=v;await new Promise(r=>setTimeout(r,v==='GO!'?650:720))}countdown.textContent='';running=true;startedAt=performance.now();statusEl.textContent='경주 중';racers.forEach(r=>play(r,['run','walk']))}

function attack(r,dt){r.attackCd-=dt;if(r.attackCd>0||r.stun>0||r.finished)return;const targets=racers.filter(t=>!t.finished&&Math.abs(t.lane-r.lane)===1&&Math.abs(t.z-r.z)<1.65);if(!targets.length){r.attackCd=.2;return}if(Math.random()>.48){r.attackCd=.4;return}const t=targets[Math.floor(Math.random()*targets.length)];r.attackCd=4+Math.random()*3;r.animLock=.48;t.stun=.9;t.speed*=.3;play(r,['punch','attack','headbutt'],true);play(t,['hit'],false);r.root.rotation.z=(t.lane-r.lane)*-.2;throwBall(r,t);setTimeout(()=>burst(t.root.position,0xffffff),360);announce(`${r.name} → ${t.name} 야구공 공격!`)}
function updateRace(dt){const elapsed=(performance.now()-startedAt)/1000;timerEl.textContent=elapsed.toFixed(1);let leaderZ=8;
 racers.forEach(r=>{if(r.finished)return;attack(r,dt);r.stun=Math.max(0,r.stun-dt);r.animLock=Math.max(0,r.animLock-dt);r.boost=Math.max(0,r.boost-dt);if(!r.boost&&Math.random()<dt*.035){r.boost=1.7;announce(`${r.name} 부스터!`)}const target=r.stun?.55:r.base*(r.boost?1.65:1);r.speed=THREE.MathUtils.lerp(r.speed,target,dt*(r.stun?7:3.2));r.z-=r.speed*dt;r.root.position.z=r.z;if(r.stun){play(r,['walk','run']);r.root.rotation.z=Math.sin(performance.now()*.025)*.18}else if(!r.jump&&r.animLock<=0)play(r,['run','walk']);
   r.particleCd-=dt;if(r.boost&&r.particleCd<=0){r.particleCd=.13;burst(new THREE.Vector3(laneX[r.lane],.3,r.z+.8),r.color)}
   if(r.jump>0||r.root.position.y>0){r.vy-=12*dt;r.root.position.y+=r.vy*dt;if(r.root.position.y<=0){r.root.position.y=0;r.jump=0;play(r,['run','walk'])}}
   r.root.rotation.z=THREE.MathUtils.lerp(r.root.rotation.z,0,dt*5);leaderZ=Math.min(leaderZ,r.z);
   for(const ob of obstacles){if(ob.lane!==r.lane||ob.hit.has(r)||Math.abs(ob.z-r.z)>1.05)continue;ob.hit.add(r);if(Math.random()<.7){r.jump=1;r.vy=5.2;play(r,['jump'],true);announce(`${r.name} 장애물 점프!`)}else{r.stun=1;r.speed*=.25;play(r,['hit'],true);announce(`${r.name} 장애물 충돌!`)}}
   if(r.z<=finishZ){r.finished=true;r.time=elapsed;finishOrder.push(r);play(r,['idle']);announce(`${finishOrder.length}위 ${r.name} 결승 통과!`)}}
 );
 obstacles.forEach(ob=>{if(leaderZ-ob.z<28){ob.age+=dt;const s=Math.min(1,ob.age*3);ob.o.scale.setScalar(s);if(ob.moving)ob.o.position.x=laneX[ob.lane]+Math.sin(ob.age*2.1)*.65}});
 camera.position.z=THREE.MathUtils.lerp(camera.position.z,leaderZ+15,dt*2);camera.lookAt(0,1.5,camera.position.z-15);
 if(finishOrder.length===racers.length){running=false;statusEl.textContent='경주 완료';winnerEl.textContent=`🏆 ${finishOrder[0].name} 우승`;standingEl.innerHTML=finishOrder.map((r,i)=>`<li><b>${i+1}위 ${r.name}</b> — ${r.time.toFixed(2)}초</li>`).join('');resultEl.hidden=false;againBtn.hidden=false;startBtn.disabled=false}}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);racers.forEach(r=>r.mixer.update(dt));for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;if(e.kind==='ball'){const p=1-e.life/e.max;e.o.position.lerpVectors(e.from,new THREE.Vector3(e.target.root.position.x,1.05,e.target.z),p);e.o.position.y+=Math.sin(p*Math.PI)*1.25;e.o.rotation.x+=dt*18}else{e.o.position.addScaledVector(e.v,dt);e.v.y-=7*dt;e.o.scale.setScalar(Math.max(0,e.life))}if(e.life<=0){scene.remove(e.o);effects.splice(i,1)}}if(running)updateRace(dt);renderer.render(scene,camera)}
startBtn.onclick=start;againBtn.onclick=start;document.querySelectorAll('.names input').forEach((input,i)=>input.oninput=()=>{if(racers[i])racers[i].name=input.value||specs[i][0]});
loadRacers().then(()=>{resetRace();animate()}).catch(e=>{statusEl.textContent='3D 모델 로딩 실패';console.error(e)});
