const $=selector=>document.querySelector(selector);
const screens=['countScreen','configScreen','playScreen'].map(id=>$('#'+id));
const countValue=$('#countValue'),loadPanel=$('#loadPanel'),presetSelect=$('#presetSelect');
const nameInputs=$('#nameInputs'),resultInputs=$('#resultInputs'),straightLines=$('#straightLines');
const starters=$('#starters'),outcomes=$('#outcomes'),canvas=$('#ladderCanvas'),ctx=canvas.getContext('2d');
const playStatus=$('#playStatus'),seedLabel=$('#seedLabel'),allResults=$('#allResults'),resultList=$('#resultList');
const presetName=$('#presetName'),saveMessage=$('#saveMessage'),loadMessage=$('#loadMessage');
const STORAGE_KEY='sgra88-ladder-presets-v2';
const colors=['#ff3f55','#13bdb6','#835cff','#ff8a2a','#1688e3','#e741aa','#3ca75b','#c29700','#7349c5','#e25834','#2f9ec8','#cb4d76'];
let count=4,names=[],results=[],ladder=[],mapping=[],seed=0,activeStart=-1,activeEnd=-1,animating=false;

const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const values=container=>[...container.querySelectorAll('input')].map(input=>input.value.trim());
const showScreen=id=>screens.forEach(screen=>screen.hidden=screen.id!==id);

function setCount(next){
  count=Math.max(2,Math.min(12,next));
  countValue.textContent=count;
}

function buildConfig(initialNames=[],initialResults=[]){
  names=Array.from({length:count},(_,index)=>initialNames[index]||`참가자 ${index+1}`);
  results=Array.from({length:count},(_,index)=>initialResults[index]||`결과 ${index+1}`);
  const columns=`repeat(${count},minmax(0,1fr))`;
  [nameInputs,resultInputs,straightLines].forEach(element=>element.style.gridTemplateColumns=columns);
  nameInputs.innerHTML=names.map((name,index)=>`<input maxlength="18" value="${escapeHtml(name)}" aria-label="${index+1}번 이름">`).join('');
  resultInputs.innerHTML=results.map((result,index)=>`<input maxlength="18" value="${escapeHtml(result)}" aria-label="${index+1}번 결과">`).join('');
  straightLines.innerHTML=Array.from({length:count},()=>'<span></span>').join('');
  $('#configCount').textContent=`${count} PLAYERS`;
  showScreen('configScreen');
}

function captureConfig(){
  names=values(nameInputs).map((value,index)=>value||`참가자 ${index+1}`);
  results=values(resultInputs).map((value,index)=>value||`결과 ${index+1}`);
}

function createLadder(){
  const rows=Math.max(8,count*3);
  ladder=Array.from({length:rows},()=>[]);
  for(let row=0;row<rows;row++){
    for(let col=0;col<count-1;col++){
      if(ladder[row].includes(col-1)||Math.random()>.34)continue;
      ladder[row].push(col);
    }
  }
  for(let col=0;col<count-1;col++){
    if(!ladder.some(row=>row.includes(col)))ladder[Math.floor(Math.random()*rows)].push(col);
  }
  mapping=Array.from({length:count},(_,start)=>trace(start).end);
  seed+=1;activeStart=-1;activeEnd=-1;
  seedLabel.textContent=`LADDER ${String(seed).padStart(2,'0')}`;
  playStatus.textContent='이름이나 결과를 선택하세요';
  renderPlayLabels();requestAnimationFrame(resizeCanvas);
}

function boardMetrics(){
  const width=parseFloat(canvas.style.width)||canvas.parentElement.clientWidth,height=500;
  return{width,height,left:38,right:width-38,top:18,bottom:height-18};
}

function trace(start){
  const m=boardMetrics(),xAt=col=>m.left+(m.right-m.left)*col/(count-1),yAt=row=>m.top+(m.bottom-m.top)*(row+1)/(ladder.length+1);
  let col=start,points=[{x:xAt(col),y:m.top}];
  ladder.forEach((rungs,row)=>{
    const y=yAt(row);points.push({x:xAt(col),y});
    if(rungs.includes(col)){col++;points.push({x:xAt(col),y})}
    else if(rungs.includes(col-1)){col--;points.push({x:xAt(col),y})}
  });
  points.push({x:xAt(col),y:m.bottom});
  return{end:col,points};
}

function resizeCanvas(){
  if($('#playScreen').hidden)return;
  const width=Math.max(664,canvas.parentElement.clientWidth-16),height=500,dpr=Math.min(devicePixelRatio||1,1.5);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;
  ctx.setTransform(dpr,0,0,dpr,0,0);draw();
}

function draw(progress=0,path=null){
  const m=boardMetrics(),xAt=col=>m.left+(m.right-m.left)*col/(count-1),yAt=row=>m.top+(m.bottom-m.top)*(row+1)/(ladder.length+1);
  ctx.clearRect(0,0,m.width,m.height);
  const paper=ctx.createLinearGradient(0,0,0,m.height);paper.addColorStop(0,'#f7faf4');paper.addColorStop(1,'#dfe9e1');
  ctx.fillStyle=paper;ctx.fillRect(0,0,m.width,m.height);
  ctx.lineCap='round';ctx.strokeStyle='#243945';ctx.lineWidth=4;
  for(let col=0;col<count;col++){ctx.beginPath();ctx.moveTo(xAt(col),m.top);ctx.lineTo(xAt(col),m.bottom);ctx.stroke()}
  ctx.strokeStyle='#60727c';ctx.lineWidth=3;
  ladder.forEach((rungs,row)=>rungs.forEach(col=>{const y=yAt(row);ctx.beginPath();ctx.moveTo(xAt(col),y);ctx.lineTo(xAt(col+1),y);ctx.stroke()}));
  if(!path||progress<=0)return;
  const lengths=[],total=path.slice(1).reduce((sum,point,index)=>{const previous=path[index],length=Math.hypot(point.x-previous.x,point.y-previous.y);lengths.push(length);return sum+length},0);
  let remaining=total*Math.min(1,progress),current=path[0];
  ctx.strokeStyle=colors[activeStart%colors.length];ctx.lineWidth=9;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(current.x,current.y);
  for(let index=1;index<path.length&&remaining>0;index++){
    const next=path[index],segment=lengths[index-1];
    if(remaining>=segment){ctx.lineTo(next.x,next.y);remaining-=segment;current=next}
    else{const ratio=remaining/segment;ctx.lineTo(current.x+(next.x-current.x)*ratio,current.y+(next.y-current.y)*ratio);remaining=0}
  }
  ctx.stroke();ctx.shadowBlur=0;
}

function renderPlayLabels(){
  const columns=`repeat(${count},minmax(0,1fr))`;
  starters.style.gridTemplateColumns=columns;outcomes.style.gridTemplateColumns=columns;
  starters.innerHTML=names.map((name,index)=>`<button type="button" data-start="${index}">${escapeHtml(name)}</button>`).join('');
  outcomes.innerHTML=results.map((result,index)=>`<button type="button" data-end="${index}">${escapeHtml(result)}</button>`).join('');
  starters.querySelectorAll('button').forEach(button=>button.onclick=()=>run(Number(button.dataset.start)));
  outcomes.querySelectorAll('button').forEach(button=>button.onclick=()=>run(mapping.indexOf(Number(button.dataset.end))));
  if(activeStart>=0)starters.children[activeStart]?.classList.add('active');
  if(activeEnd>=0)outcomes.children[activeEnd]?.classList.add('active');
}

async function run(start){
  if(animating||start<0)return;
  animating=true;activeStart=start;activeEnd=-1;renderPlayLabels();
  const route=trace(start),duration=1500,startTime=performance.now();
  playStatus.textContent=`${names[start]} 경로 확인 중`;
  await new Promise(resolve=>{
    const frame=now=>{const progress=Math.min(1,(now-startTime)/duration);draw(progress,route.points);if(progress<1)requestAnimationFrame(frame);else resolve()};
    requestAnimationFrame(frame);
  });
  activeEnd=route.end;renderPlayLabels();draw(1,route.points);
  playStatus.textContent=`${names[start]} → ${results[route.end]}`;
  animating=false;
}

function startGame(){
  captureConfig();createLadder();showScreen('playScreen');allResults.hidden=true;requestAnimationFrame(resizeCanvas);
}

function showAll(){
  resultList.innerHTML=mapping.map((end,start)=>`<li><b>${escapeHtml(names[start])}</b> → ${escapeHtml(results[end])}</li>`).join('');
  allResults.hidden=false;
}

function readPresets(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{}}catch{return{}}}
function writePresets(presets){localStorage.setItem(STORAGE_KEY,JSON.stringify(presets))}
function refreshPresets(selected=''){
  const presets=readPresets();
  presetSelect.innerHTML='<option value="">설정을 선택하세요</option>'+Object.keys(presets).map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  presetSelect.value=selected;
}
function savePreset(){
  captureConfig();
  const key=presetName.value.trim()||'기본 설정',presets=readPresets();
  presets[key]={count,names,results};writePresets(presets);refreshPresets(key);
  saveMessage.textContent=`‘${key}’ 저장 완료`;setTimeout(()=>saveMessage.textContent='',1800);
}
function loadSelected(){
  const key=presetSelect.value,data=readPresets()[key];
  if(!key||!data){loadMessage.textContent='불러올 설정을 선택하세요.';return}
  setCount(data.count);presetName.value=key;buildConfig(data.names,data.results);loadPanel.hidden=true;
}
function deleteSelected(){
  const key=presetSelect.value;if(!key){loadMessage.textContent='삭제할 설정을 선택하세요.';return}
  const presets=readPresets();delete presets[key];writePresets(presets);refreshPresets();loadMessage.textContent=`‘${key}’ 삭제 완료`;
}

$('#minusCount').onclick=()=>setCount(count-1);
$('#plusCount').onclick=()=>setCount(count+1);
$('#goConfig').onclick=()=>buildConfig();
$('#openLoad').onclick=()=>{refreshPresets();loadPanel.hidden=!loadPanel.hidden};
$('#backToCount').onclick=()=>{captureConfig();showScreen('countScreen')};
$('#startLadder').onclick=startGame;
$('#editSettings').onclick=()=>{allResults.hidden=true;buildConfig(names,results)};
$('#newLadder').onclick=()=>{createLadder();allResults.hidden=true};
$('#showAll').onclick=showAll;
$('#closeResults').onclick=()=>allResults.hidden=true;
$('#savePreset').onclick=savePreset;
$('#loadPreset').onclick=loadSelected;
$('#deletePreset').onclick=deleteSelected;
addEventListener('resize',resizeCanvas);
setCount(4);refreshPresets();showScreen('countScreen');
