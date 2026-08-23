(()=>{"use strict";
const animals=["🐰","🦊","🐯","🐼","🐸","🐵","🐶","🐱"];
const defaults=["토끼","여우","호랑이","판다","개구리","원숭이"];
const countEl=document.querySelector("#playerCount"),inputsEl=document.querySelector("#nameInputs"),tracksEl=document.querySelector("#tracks"),startButton=document.querySelector("#startButton"),shuffleButton=document.querySelector("#shuffleButton"),againButton=document.querySelector("#againButton"),statusEl=document.querySelector("#status"),timerEl=document.querySelector("#timer"),resultEl=document.querySelector("#result"),winnerAnimalEl=document.querySelector("#winnerAnimal"),winnerNameEl=document.querySelector("#winnerName");
let racers=[],timerId=null,startTime=0,running=false,animalOrder=[];
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char])}

function shuffle(values){
  const copy=[...values];
  for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]]}
  return copy;
}

function selectedNames(){
  return [...inputsEl.querySelectorAll("input")].map((input,index)=>input.value.trim()||`참가자 ${index+1}`);
}

function renderInputs(){
  const count=Number(countEl.value),old=selectedNames();
  if(animalOrder.length<count)animalOrder=shuffle(animals);
  inputsEl.innerHTML="";
  for(let i=0;i<count;i++){
    const label=document.createElement("label");label.className="name-input";
    label.innerHTML=`<span>${animalOrder[i]}</span><input maxlength="10" value="${escapeHtml(old[i]||defaults[i])}" aria-label="${i+1}번 참가자 이름">`;
    inputsEl.append(label);
  }
  buildTracks();
}

function buildTracks(){
  const names=selectedNames();
  racers=names.map((name,index)=>({name,animal:animalOrder[index],progress:0}));
  tracksEl.innerHTML=racers.map((racer,index)=>`<div class="track"><span class="lane-name">${index+1} · ${escapeHtml(racer.name)}</span><span class="racer" data-racer="${index}">${racer.animal}</span></div>`).join("");
}

function setLocked(value){
  countEl.disabled=value;shuffleButton.disabled=value;startButton.disabled=value;
  inputsEl.querySelectorAll("input").forEach(input=>input.disabled=value);
}

function frame(){
  if(!running)return;
  const order=shuffle(racers.map((_,index)=>index));
  for(const index of order){
    const racer=racers[index];
    const burst=Math.random()<.08?Math.random()*1.7:0;
    racer.progress+=.25+Math.random()*1.05+burst;
    const element=tracksEl.querySelector(`[data-racer="${index}"]`);
    const distance=Math.max(0,element.parentElement.clientWidth-element.offsetWidth-58);
    element.style.transform=`translateX(${Math.min(100,racer.progress)/100*distance}px)`;
    if(racer.progress>=100){finish(racer);return}
  }
  timerEl.textContent=((performance.now()-startTime)/1000).toFixed(1);
  timerId=setTimeout(frame,90);
}

function start(){
  if(running)return;
  resultEl.hidden=true;buildTracks();running=true;setLocked(true);startTime=performance.now();timerEl.textContent="0.0";statusEl.textContent="결승선을 향해 달리는 중!";
  tracksEl.querySelectorAll(".racer").forEach(element=>element.classList.add("running"));
  setTimeout(frame,700);
}

function finish(winner){
  running=false;clearTimeout(timerId);setLocked(false);
  tracksEl.querySelectorAll(".racer").forEach(element=>element.classList.remove("running"));
  statusEl.textContent=`${winner.name} 우승!`;winnerAnimalEl.textContent=winner.animal;winnerNameEl.textContent=`${winner.name} 우승!`;resultEl.hidden=false;
}

function resetRace(){resultEl.hidden=true;statusEl.textContent="참가자를 설정하고 경주를 시작하세요.";timerEl.textContent="0.0";buildTracks()}

countEl.addEventListener("change",renderInputs);
shuffleButton.addEventListener("click",()=>{animalOrder=shuffle(animals);renderInputs()});
startButton.addEventListener("click",start);againButton.addEventListener("click",resetRace);
animalOrder=shuffle(animals);renderInputs();
})();
