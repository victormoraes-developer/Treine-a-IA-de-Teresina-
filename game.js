'use strict';
const playTime=()=>(performance.now()-state.t0-state.pausedMs-(state.pauseT?performance.now()-state.pauseT:0))/1000;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const fmt=(v,d=2)=>v.toFixed(d).replace('.',',');
let TIMERS=[];
function later(fn,ms){const id=setTimeout(fn,ms);TIMERS.push(id);return id;}
function clearTimers(){TIMERS.forEach(clearTimeout);TIMERS=[];}

/* MOUSE GLOBAL (para olhos da esfera) */
let mouseX = window.innerWidth/2, mouseY = window.innerHeight/2;
document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
document.addEventListener('touchmove', e => {
  if (e.touches && e.touches[0]) { mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY; }
}, {passive:true});
document.addEventListener('touchstart', e => {
  if (e.touches && e.touches[0]) { mouseX = e.touches[0].clientX; mouseY = e.touches[0].clientY; }
}, {passive:true});

/* AUDIO */
let audioCtx=null,muted=false;
function initAudio(){if(!audioCtx){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}}
function beep(freq,dur=0.09,type='sine',vol=0.05){if(muted||!audioCtx)return;try{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+dur);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);}catch(e){}}
function chord(freqs,dur=0.3){freqs.forEach((f,i)=>setTimeout(()=>beep(f,dur,'sine',0.045),i*70));}
function alarmSound(){beep(180,0.16,'sawtooth',0.05);setTimeout(()=>beep(140,0.2,'sawtooth',0.05),150);}
function coinSound(){beep(1200,0.06,'square',0.03);setTimeout(()=>beep(1600,0.08,'square',0.03),60);}
function levelUpSound(){[523,659,784,1046,1318].forEach((f,i)=>setTimeout(()=>beep(f,0.12,'sine',0.05),i*80));}

/* FX */
const fxCanvas=document.getElementById('fx');
const fxCtx=fxCanvas.getContext('2d');
let particles=[];
function resizeFx(){fxCanvas.width=innerWidth;fxCanvas.height=innerHeight;}
resizeFx();addEventListener('resize',resizeFx);
function burst(x,y,n=46){const colors=['#22d3ee','#4ade80','#facc15','#f472b6','#a78bfa','#fb923c'];for(let i=0;i<n;i++){const ang=Math.random()*Math.PI*2,spd=2.5+Math.random()*8.5;particles.push({x,y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd-3.5,life:1,color:colors[(Math.random()*colors.length)|0],size:3+Math.random()*5,rot:Math.random()*6.28,vr:(Math.random()-0.5)*0.45});}}
function fxTick(){fxCtx.clearRect(0,0,fxCanvas.width,fxCanvas.height);for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.vy+=0.34;p.x+=p.vx;p.y+=p.vy;p.vx*=0.99;p.life-=0.011;p.rot+=p.vr;if(p.life<=0){particles.splice(i,1);continue;}fxCtx.save();fxCtx.globalAlpha=Math.max(0,p.life);fxCtx.translate(p.x,p.y);fxCtx.rotate(p.rot);fxCtx.fillStyle=p.color;fxCtx.fillRect(-p.size/2,-p.size/2,p.size,p.size);fxCtx.restore();}requestAnimationFrame(fxTick);}
fxTick();
function toast(main,sub){const el=document.createElement('div');el.className='toast';el.innerHTML=`<div class="toast-main">${main}</div>${sub?`<div class="toast-sub">${sub}</div>`:''}`;document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),450);},2600);}
function popScore(pts,x,y,color,isBad){const el=document.createElement('div');el.className='pop-score'+(isBad?' bad':'');el.textContent=pts;el.style.left=x+'px';el.style.top=y+'px';el.style.color=color||'#fde68a';document.body.appendChild(el);requestAnimationFrame(()=>{el.style.transform='translate(-50%,-80px) scale(1.6)';el.style.opacity='0';});setTimeout(()=>el.remove(),1100);}
function screenShake(){document.body.classList.remove('shake');void document.body.offsetWidth;document.body.classList.add('shake');setTimeout(()=>document.body.classList.remove('shake'),500);}

/* FALAS DA IA */
let sayT=null;
function aiSay(t,mode,ms=2800){const el=document.getElementById('aiSay');if(!el||!t)return;el.textContent=t;el.className='ai-say show'+(mode?' '+mode:'');clearTimeout(sayT);sayT=setTimeout(()=>el.classList.remove('show'),ms);}
const pick=a=>a[(Math.random()*a.length)|0];
const SAY_OK=['Boa! Aprendi com esse dado. 🧠','Isso! Meu erro caiu. 📉','Calibrada! Obrigada! ✨','Teresina ficou mais clara pra mim. 🌡️','Matemática funcionando! 🔥'];
const SAY_BAD=['Hmm… não foi dessa vez. 🤔','Quase! Olhe os resíduos. 📏','Errar faz parte de aprender! 💡','Tente de novo — eu confio em você. 💪'];
const SAY_STAGE={1:'Me ajude a achar a reta certa!',2:'Onde eu mais errei? Me mostre!',3:'Tem algo estranho nos sensores…',4:'Cinco curvas… só uma é a melhor!',5:'Eu só conheço o centro. Me mostre a periferia!',6:'O que eu aprendi, afinal?',7:'Agora faça a conta sem ajuda! 🔮',8:'Dica: pontos nas pontas puxam mais a reta. 😈'};

/* TRAIN LOG */
const trainLogMessages=[];
function addTrainLog(msg){trainLogMessages.unshift({text:msg,key:Math.random()});if(trainLogMessages.length>3)trainLogMessages.pop();const el=document.getElementById('trainLog');el.innerHTML=trainLogMessages.map((m,i)=>`<div class="${i===0?'new':''}">${m.text}</div>`).join('');}
function clearTrainLog(){trainLogMessages.length=0;document.getElementById('trainLog').innerHTML='';}

/* ACHIEVEMENTS */
const ACHIEVEMENTS={
  calib:{name:'🎯 Primeira Calibração',desc:'Reta calibrada com sucesso'},
  residual:{name:'🔍 Caçador de Erros',desc:'Encontrou o maior resíduo'},
  outlier:{name:'🎯 Detector de Outliers',desc:'Identificou a anomalia'},
  grad:{name:'📉 Mestre do Gradiente',desc:'Escolheu a melhor curva'},
  repr:{name:'🗺️ Cartógrafo de Teresina',desc:'Coletou toda a periferia'},
  interp:{name:'📊 Intérprete de Modelos',desc:'Entendeu o coeficiente'},
  predict:{name:'🔮 Oráculo',desc:'Fez uma previsão precisa'},
  hacker:{name:'💀 Hacker de IA',desc:'Enganou o modelo sem ser detectado'},
  combo3:{name:'🔥 Em Chamas',desc:'3 acertos seguidos'},
  combo5:{name:'⚡ Imparável',desc:'5 acertos seguidos'},
  master:{name:'🏆 Cientista Completo',desc:'Todas as fases'}
};
const unlocked=new Set();
function unlock(key){if(unlocked.has(key))return;unlocked.add(key);const a=ACHIEVEMENTS[key];if(!a)return;const el=document.createElement('div');el.className='achievement';el.innerHTML=`<div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div>`;document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add('show'));setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),500);},2600);coinSound();}

/* CONCEPT CARDS */
const CONCEPTS={
  1:{icon:'✏️',tag:'FASE 1',title:'Calibração',text:'Ajuste a reta até o erro (EQM) ser mínimo. Meta: EQM ≤ 0,22.',formula:'ŷ = a·x + b'},
  2:{icon:'🎯',tag:'FASE 2',title:'Maior resíduo',text:'Toque no ponto com maior erro. Depois calcule o resíduo exato.',formula:'resíduo = y − ŷ'},
  3:{icon:'🚨',tag:'FASE 3',title:'Outlier',text:'Encontre o sensor anômalo no mapa. Ele destrói o modelo.',formula:'resíduo grande = suspeito'},
  4:{icon:'📉',tag:'FASE 4',title:'Qual curva tem menor EQM?',text:'5 curvas mistas (retas + parábolas). Só uma tem erro mínimo. Passe o dedo sobre cada.',formula:'∇EQM = (∂a, ∂b)'},
  5:{icon:'🗺️',tag:'FASE 5',title:'Viés',text:'A IA só viu o centro. Colete dados da periferia.',formula:'mais dados = menos viés'},
  6:{icon:'📊',tag:'FASE 6',title:'Interpretação',text:'O que o coeficiente "a" significa no mundo real?',formula:'a = Δy / Δx'},
  7:{icon:'🔮',tag:'FASE 7',title:'Previsão',text:'Calcule ŷ para x=18% e clique no gráfico. Sem dica!',formula:'ŷ = a·18 + b'},
  8:{icon:'💀',tag:'FASE 8',title:'Engane a IA',text:'Plante até 3 pontos falsos para a IA prever ≥35°C em x=18%. Escape do detector!',formula:'h = 1/n + (x−x̄)²/Σ(x−x̄)²'}
};
let conceptTimer=null;
function showConcept(n){const c=CONCEPTS[n];if(!c)return;document.getElementById('conceptIcon').textContent=c.icon;document.getElementById('conceptTag').textContent=c.tag;document.getElementById('conceptTitle').textContent=c.title;document.getElementById('conceptText').textContent=c.text;document.getElementById('conceptFormula').textContent=c.formula;document.getElementById('conceptCard').classList.add('show');clearTimeout(conceptTimer);conceptTimer=setTimeout(hideConcept,9000);}
function hideConcept(){document.getElementById('conceptCard').classList.remove('show');clearTimeout(conceptTimer);}
document.getElementById('conceptClose').addEventListener('click',hideConcept);

/* EDU CONTENT */
const EDU_CONTENT={
  regression:{icon:'📈',term:'Regressão Linear',
    def:'A IA busca a reta da forma ŷ = a·x + b que melhor explica os dados. "a" é a inclinação (quanto y muda quando x aumenta em 1) e "b" é onde a reta corta o eixo y. É o modelo preditivo mais simples que existe.',
    formula:'ŷ = a·x + b',
    why:'Encontrar a reta de melhor ajuste é a base de quase toda IA preditiva. O resto é generalização disso.',
    preview:'🎯 Sua tarefa: arrastar as pontas da reta até o erro ser mínimo.'},
  residual:{icon:'📏',term:'Resíduo',
    def:'É a diferença entre o valor REAL observado e o valor PREVISTO pela IA. Se o resíduo é +2°C, a IA previu 2°C a menos do que era. Se é −3°C, previu 3°C a mais. Eles mostram exatamente ONDE e QUANTO o modelo erra.',
    formula:'resíduo = y − ŷ',
    why:'A IA "aprende" olhando os resíduos: ela ajusta os parâmetros para que os resíduos fiquem pequenos e equilibrados.',
    preview:'🎯 Sua tarefa: achar o ponto com MAIOR resíduo e calcular seu valor.'},
  outlier:{icon:'🚨',term:'Outlier (Valor Atípico)',
    def:'É um dado muito diferente dos outros. Um único outlier com resíduo gigante pode "puxar" a reta inteira na direção dele, arruinando a previsão para todos os outros pontos. É como uma pessoa muito alta numa foto de família — ela muda a média de altura.',
    formula:'resíduo grande → suspeito de outlier',
    why:'Na prática, outliers são erros de sensor, fraudes, medições defeituosas. Identificá-los evita que a IA aprenda padrões falsos.',
    preview:'🎯 Sua tarefa: encontrar o sensor anômalo no mapa e calcular seu resíduo.'},
  gradient:{icon:'📉',term:'Gradiente Descendente',
    def:'É o algoritmo que faz a IA aprender. Ela calcula em que direção o erro AUMENTA (o gradiente) e dá um passo no sentido OPOSTO, descendo a ladeira do erro. O tamanho do passo é η (eta).',
    formula:'a ← a − η · ∂EQM/∂a',
    why:'Se η é pequeno, o aprendizado é lento. Se η é grande demais, a IA pula o mínimo e diverge. Se η é ideal, ela converge rápido para o melhor modelo.',
    preview:'🎯 Sua tarefa: entre 5 curvas (retas E parábolas), identificar a que produz o MENOR EQM. Passe o dedo/mouse sobre cada.'},
  bias:{icon:'⚖️',term:'Viés de Amostragem',
    def:'Se os dados de treino não representam toda a população, a IA aprende um padrão distorcido. Se só treinamos com bairros centrais e arborizados, a IA nunca "vê" a periferia quente e prevê temperaturas amenas para todos.',
    formula:'amostra enviesada → modelo enviesado',
    why:'Viés não é só um problema técnico — é ético. Uma IA enviesada toma decisões injustas e prejudica grupos sub-representados.',
    preview:'🎯 Sua tarefa: coletar dados de todos os bairros para eliminar o viés.'},
  coefficient:{icon:'🎯',term:'Coeficiente Angular (a)',
    def:'O coeficiente "a" indica a inclinação da reta: quanto y muda quando x aumenta em 1 unidade. Se a = −0,23, cada 1% adicional de área verde reduz a temperatura em 0,23°C. Se a = +0,50, cada 1% AUMENTA 0,50°C (sinal de que o modelo aprendeu algo errado).',
    formula:'a = Δy / Δx',
    why:'Entender "a" é entender o que a IA APRENDEU sobre o mundo. É a ponte entre a matemática e a interpretação real.',
    preview:'🎯 Sua tarefa: interpretar o coeficiente "a" do modelo treinado.'},
  inference:{icon:'🔮',term:'Inferência (Previsão)',
    def:'Depois de treinada, a IA pode prever valores para dados que NUNCA viu. Basta substituir x na equação e calcular ŷ. A qualidade da previsão depende inteiramente de quão bom foi o treino.',
    formula:'ŷ = a · x + b',
    why:'Generalizar é o propósito da IA. Sem inferência, o modelo não tem utilidade prática. Prever bem em novos casos é o objetivo final.',
    preview:'🎯 Sua tarefa: prever a temperatura de um bairro novo (x = 18%) clicando no gráfico.'},
  hacking:{icon:'💀',term:'Alavancagem e Mascaramento',
    def:'Um ponto no EXTREMO do gráfico (x perto de 0 ou 40) tem ALAVANCAGEM alta: puxa a reta muito. Mas se ficar muito longe da reta, o resíduo é grande e o detector pega. A solução? Dois ou três pontos juntos no extremo: eles puxam a reta para si e o resíduo de cada um fica pequeno. O detector olha resíduos individuais e NÃO VÊ a fraude — é o MASCARAMENTO.',
    formula:'h = 1/n + (x−x̄)² / Σ(x−x̄)²',
    why:'É a matemática por trás de "envenenamento de dados" em IA real. Um sistema que só olha resíduos é vulnerável a pontos de alta alavancagem disfarçados. Sistemas robustos (mediana de inclinações, Theil–Sen) resistem — mas não são o padrão.',
    preview:'🎯 Sua tarefa: enganar a IA com pontos de alta alavancagem que escapem do detector de anomalia.'}
};
let eduCallback=null;
function showEdu(key,callback){
  const c=EDU_CONTENT[key];
  if(!c){if(callback)callback();return;}
  document.getElementById('eduIcon').textContent=c.icon;
  document.getElementById('eduTerm').textContent=c.term;
  document.getElementById('eduDef').textContent=c.def;
  document.getElementById('eduFormula').textContent=c.formula;
  document.getElementById('eduWhy').textContent=c.why;
  document.getElementById('eduPreview').textContent=c.preview;
  document.getElementById('eduModal').classList.add('show');
  if(!state.pauseT)state.pauseT=performance.now();
  eduCallback=callback;
}
document.getElementById('btnEduUnderstood').addEventListener('click',()=>{
  document.getElementById('eduModal').classList.remove('show');
  if(state.pauseT){state.pausedMs+=performance.now()-state.pauseT;state.pauseT=0;}
  if(eduCallback){const cb=eduCallback;eduCallback=null;cb();}
});

/* DATA */
const XD=[0,40],YD=[25,45];
const GREEN_EQM=0.22;
const YELLOW_EQM=2.5;
const HACK_RESIDUAL_THRESHOLD = 4.5;
const HACK_TARGET = 35.0;
const HACK_MAX_POINTS = 3;
const BASE_POINTS=[
  {id:'centro',name:'Centro',short:'CE',x:6,y:36.4},
  {id:'dirceu',name:'Dirceu',short:'DI',x:13,y:34.2},
  {id:'ilhotas',name:'Ilhotas',short:'IL',x:21,y:33.0},
  {id:'zonaLeste',name:'Zona Leste',short:'ZL',x:27,y:31.0},
  {id:'parquePiaui',name:'Parque Piauí',short:'PP',x:33,y:30.2}
];
const ANOMALY={id:'poloIndustrial',name:'Polo Industrial',short:'PI',x:3,y:44.0};
const ANOMALY_FIXED_Y=36.0;
const PERIF=[
  {id:'santaMaria',name:'Santa Maria',short:'SM',x:4,y:38.2},
  {id:'promorar',name:'Promorar',short:'PR',x:5,y:38.0},
  {id:'mocambinho',name:'Mocambinho',short:'MO',x:8,y:37.2},
  {id:'itarare',name:'Itararé',short:'IT',x:10,y:36.0}
];
const DISTRICT_DEFS=[
  {id:'potiVelho',name:'Poti Velho',poly:[[12,12],[95,10],[92,72],[18,68]],lab:[54,40]},
  {id:'santaMaria',name:'Santa Maria',poly:[[95,10],[178,14],[175,75],[92,72]],lab:[135,42]},
  {id:'itarare',name:'Itararé',poly:[[178,14],[255,10],[258,70],[175,75]],lab:[216,42]},
  {id:'zonaLeste',name:'Zona Leste',poly:[[255,10],[312,16],[310,78],[258,70]],lab:[283,44]},
  {id:'mocambinho',name:'Mocambinho',poly:[[18,68],[92,72],[95,135],[22,130]],lab:[56,101]},
  {id:'centro',name:'Centro',poly:[[92,72],[175,75],[178,132],[95,135]],lab:[135,103]},
  {id:'ilhotas',name:'Ilhotas',poly:[[175,75],[258,70],[255,132],[178,132]],lab:[216,102]},
  {id:'dirceu',name:'Dirceu',poly:[[258,70],[310,78],[312,140],[255,132]],lab:[283,105]},
  {id:'poloIndustrial',name:'Polo Industrial',poly:[[22,130],[95,135],[100,205],[30,210]],lab:[61,170]},
  {id:'promorar',name:'Promorar',poly:[[95,135],[178,132],[182,200],[100,205]],lab:[138,168]},
  {id:'parquePiaui',name:'Parque Piauí',poly:[[178,132],[255,132],[250,205],[182,200]],lab:[216,168]},
  {id:'saoCristovao',name:'S. Cristóvão',poly:[[255,132],[312,140],[308,208],[250,205]],lab:[281,171]}
];
const BASE_IDS=new Set(BASE_POINTS.map(p=>p.id));
const PERIF_IDS=PERIF.map(p=>p.id);

/* STATE */
const state={
  phase:1,score:0,combo:0,maxCombo:0,level:1,
  points:[],a:0,b:43,targetA:0,targetB:43,
  animating:false,animSpeed:0.13,vibration:0,
  dragging:null,fixedY:0,b0:0,py0:0,
  p1done:false,anomalyClicked:false,anomalyFixed:false,
  quizYhat:null,quizRes:null,collected:new Set(),
  t0:0,pausedMs:0,pauseT:0,finished:false,goodSince:0,
  training:false,epochs:0,
  graphMode:'drag-line',
  ghosts:null,hoveredGhost:null,
  predictionTarget:null,
  cursorX:null,
  hackedPoints:[], detectedPoints:[],
  hackPointsLeft:HACK_MAX_POINTS,
  hackBasePrediction:0, hackTarget:HACK_TARGET,
  hackBaseA:0, hackBaseB:0,
  hackWon:false
};

/* MATH HELPERS */
function linreg(pts){
  const n=pts.length;if(!n)return{a:0,b:0};
  let sx=0,sy=0;for(const p of pts){sx+=p.x;sy+=p.y;}
  const mx=sx/n,my=sy/n;
  let sxy=0,sxx=0;
  for(const p of pts){const dx=p.x-mx,dy=p.y-my;sxy+=dx*dy;sxx+=dx*dx;}
  const a=sxx?sxy/sxx:0;
  return{a,b:my-a*mx};
}
function eqmOf(pts,a,b){if(!pts.length)return 0;let s=0;for(const p of pts){const e=p.y-(a*p.x+b);s+=e*e;}return s/pts.length;}
function grads(pts,a,b){const n=pts.length;if(!n)return{ga:0,gb:0};let ga=0,gb=0;for(const p of pts){const r=p.y-(a*p.x+b);ga+=-2*p.x*r/n;gb+=-2*r/n;}return{ga,gb};}
function predictCurve(g,x){return g.type==='parabola'?(g.a*x*x+g.b*x+g.c):(g.a*x+g.b);}
function eqmCurve(pts,g){if(!pts.length)return 0;let s=0;for(const p of pts){const e=p.y-predictCurve(g,p.x);s+=e*e;}return s/pts.length;}
function tempFromEQM(e){if(e<=GREEN_EQM)return 32+2*(e/GREEN_EQM);if(e<=YELLOW_EQM)return 34+5*((e-GREEN_EQM)/(YELLOW_EQM-GREEN_EQM));return 39+4*Math.min(1,(e-YELLOW_EQM)/20);}
function currentEQM(){return eqmOf(state.points,state.a,state.b);}

function leverage(x){
  const all=[...state.points,...state.hackedPoints];
  const n=all.length;
  if(n<2)return 0;
  const mx=all.reduce((s,p)=>s+p.x,0)/n;
  const sxx=all.reduce((s,p)=>s+(p.x-mx)*(p.x-mx),0);
  if(sxx===0)return 1/n;
  return 1/n+(x-mx)*(x-mx)/sxx;
}

/* SPHERE */
const sphereCanvas=document.getElementById('aiSphere');
const sctx=sphereCanvas.getContext('2d');
let SPHERE_SIZE=86;
function initSphereSize(){
  let mobile = window.matchMedia('(max-width: 600px)').matches;
  let landscape = window.matchMedia('(max-height: 600px) and (orientation: landscape)').matches;
  let tablet = window.matchMedia('(max-width: 880px)').matches;
  SPHERE_SIZE = mobile ? 54 : (landscape ? 50 : (tablet ? 64 : 86));
  sphereCanvas.width=SPHERE_SIZE*2;
  sphereCanvas.height=SPHERE_SIZE*2;
  sphereCanvas.style.width=SPHERE_SIZE+'px';
  sphereCanvas.style.height=SPHERE_SIZE+'px';
  sctx.setTransform(2,0,0,2,0,0);
}
initSphereSize();window.addEventListener('resize',initSphereSize);
const sphere={particles:[],rotation:0,pulse:0,flashColor:null,flashTime:0,nodes:[],expression:'neutral',_exprTimer:null};
(function(){const N=26;for(let i=0;i<N;i++){const y=1-(i/(N-1))*2;const radius=Math.sqrt(1-y*y);const theta=i*2.399963;sphere.nodes.push({theta,phi:Math.acos(y),lit:0});}})();

function setSphereExpression(expr, duration=1600){
  sphere.expression = expr;
  if (sphere._exprTimer) clearTimeout(sphere._exprTimer);
  if (duration > 0) {
    sphere._exprTimer = setTimeout(() => {
      const eqm = currentEQM();
      sphere.expression = eqm > YELLOW_EQM ? 'sweating' : 'neutral';
    }, duration);
  }
}

function drawSphereEyes(cx, cy, R){
  const rect = sphereCanvas.getBoundingClientRect();
  const sphCx = rect.left + rect.width / 2;
  const sphCy = rect.top + rect.height / 2;
  const dx = mouseX - sphCx;
  const dy = mouseY - sphCy;
  const dist = Math.hypot(dx, dy) || 1;
  const nDist = Math.min(1, dist / 200);
  const eyeDx = R * 0.32;
  const eyeY = cy - R * 0.12;
  const eyeR = R * 0.15;
  const pupilR = R * 0.075;
  const maxPupilShift = eyeR * 0.55;
  const pupilShiftX = (dx / dist) * nDist * maxPupilShift;
  const pupilShiftY = (dy / dist) * nDist * maxPupilShift;
  const expr = sphere.expression || 'neutral';

  for (const side of [-1, 1]) {
    const eyeX = cx + side * eyeDx;
    if (expr === 'dizzy') {
      sctx.strokeStyle = '#fff';
      sctx.lineWidth = 1.4;
      sctx.beginPath();
      sctx.arc(eyeX, eyeY, eyeR * 0.7, 0, Math.PI * 2);
      sctx.stroke();
      sctx.beginPath();
      sctx.arc(eyeX, eyeY, eyeR * 0.35, 0, Math.PI * 2);
      sctx.stroke();
      continue;
    }
    sctx.fillStyle = '#fff';
    sctx.beginPath();
    if (expr === 'happy') {
      sctx.arc(eyeX, eyeY + eyeR * 0.2, eyeR, Math.PI, Math.PI * 2, true);
      sctx.fill();
    } else if (expr === 'sad') {
      sctx.ellipse(eyeX, eyeY, eyeR * 1.05, eyeR * 0.55, 0, 0, Math.PI * 2);
      sctx.fill();
    } else {
      sctx.ellipse(eyeX, eyeY, eyeR, eyeR * 1.15, 0, 0, Math.PI * 2);
      sctx.fill();
    }
    if (expr !== 'happy') {
      sctx.fillStyle = expr === 'sad' ? '#7f1d1d' : '#0b1220';
      sctx.beginPath();
      sctx.arc(eyeX + pupilShiftX, eyeY + pupilShiftY, pupilR, 0, Math.PI * 2);
      sctx.fill();
      sctx.fillStyle = 'rgba(255,255,255,0.7)';
      sctx.beginPath();
      sctx.arc(eyeX + pupilShiftX - pupilR * 0.3, eyeY + pupilShiftY - pupilR * 0.35, pupilR * 0.35, 0, Math.PI * 2);
      sctx.fill();
    }
    if (expr === 'sweating' && side === 1) {
      sctx.fillStyle = 'rgba(125, 211, 252, 0.85)';
      sctx.beginPath();
      sctx.ellipse(eyeX + eyeR * 0.9, eyeY - eyeR * 1.4, eyeR * 0.22, eyeR * 0.4, 0, 0, Math.PI * 2);
      sctx.fill();
    }
  }
}

function drawSphere(t){
  const cx=SPHERE_SIZE/2,cy=SPHERE_SIZE/2;
  const baseR=SPHERE_SIZE*0.30+sphere.pulse*4+Math.sin(t*0.002)*0.8;
  sctx.clearRect(0,0,SPHERE_SIZE,SPHERE_SIZE);
  const glow=sctx.createRadialGradient(cx,cy,baseR*0.4,cx,cy,baseR*2);
  glow.addColorStop(0,`rgba(56,189,248,${0.32+sphere.pulse*0.35})`);
  glow.addColorStop(0.5,'rgba(56,189,248,0.08)');
  glow.addColorStop(1,'rgba(56,189,248,0)');
  sctx.fillStyle=glow;sctx.fillRect(0,0,SPHERE_SIZE,SPHERE_SIZE);
  const rotY=t*0.0005+sphere.rotation;
  sctx.lineWidth=0.5;
  for(let lat=-60;lat<=60;lat+=30){
    const phi=lat*Math.PI/180;sctx.beginPath();let started=false;
    for(let lon=0;lon<=360;lon+=8){const theta=lon*Math.PI/180+rotY;const x3=Math.cos(phi)*Math.cos(theta);const y3=Math.sin(phi);const px=cx+x3*baseR;const py=cy+y3*baseR;if(!started){sctx.moveTo(px,py);started=true;}else sctx.lineTo(px,py);}
    sctx.strokeStyle=`rgba(125,211,252,${0.15+sphere.pulse*0.18})`;sctx.stroke();
  }
  for(let lon=0;lon<180;lon+=30){
    const theta=lon*Math.PI/180+rotY;sctx.beginPath();let started=false;
    for(let lat=0;lat<=360;lat+=8){const phi=lat*Math.PI/180-Math.PI/2;const x3=Math.cos(phi)*Math.cos(theta);const y3=Math.sin(phi);const px=cx+x3*baseR;const py=cy+y3*baseR;if(!started){sctx.moveTo(px,py);started=true;}else sctx.lineTo(px,py);}
    sctx.strokeStyle=`rgba(125,211,252,${0.15+sphere.pulse*0.18})`;sctx.stroke();
  }
  const sorted=sphere.nodes.map(n=>{const x3=Math.sin(n.phi)*Math.cos(n.theta+rotY);const y3=Math.cos(n.phi);const z3=Math.sin(n.phi)*Math.sin(n.theta+rotY);return{n,x3,y3,z3,depth:(z3+1)/2};}).sort((a,b)=>a.z3-b.z3);
  for(const {n,x3,y3,depth} of sorted){
    const px=cx+x3*baseR,py=cy+y3*baseR;
    const size=0.7+depth*1.2+n.lit*2.2;
    if(n.lit>0.05){sctx.beginPath();sctx.arc(px,py,size*2.2,0,Math.PI*2);sctx.fillStyle=`rgba(74,222,128,${n.lit*0.35})`;sctx.fill();n.lit-=0.018;}
    sctx.beginPath();sctx.arc(px,py,size,0,Math.PI*2);
    sctx.fillStyle=n.lit>0.1?`rgba(74,222,128,${0.7+depth*0.3})`:`rgba(125,211,252,${0.25+depth*0.55})`;
    sctx.fill();
  }
  for(let i=sphere.particles.length-1;i>=0;i--){
    const p=sphere.particles[i];p.t+=0.028;
    if(p.t>=1){const node=sphere.nodes[Math.floor(Math.random()*sphere.nodes.length)];if(node)node.lit=1;sphere.pulse=Math.min(1,sphere.pulse+0.35);sphere.particles.splice(i,1);continue;}
    const eased=p.t*p.t*(3-2*p.t);
    const px=p.fromX+(cx-p.fromX)*eased,py=p.fromY+(cy-p.fromY)*eased;
    sctx.beginPath();sctx.arc(px,py,4,0,Math.PI*2);sctx.fillStyle=p.color.replace('1)','0.18)');sctx.fill();
    sctx.beginPath();sctx.arc(px,py,1.6,0,Math.PI*2);sctx.fillStyle=p.color;sctx.fill();
  }
  const coreGrad=sctx.createRadialGradient(cx,cy,0,cx,cy,baseR*0.55);
  coreGrad.addColorStop(0,`rgba(255,255,255,${0.28+sphere.pulse*0.5})`);
  coreGrad.addColorStop(0.4,`rgba(56,189,248,${0.12+sphere.pulse*0.22})`);
  coreGrad.addColorStop(1,'rgba(56,189,248,0)');
  sctx.fillStyle=coreGrad;sctx.beginPath();sctx.arc(cx,cy,baseR*0.62,0,Math.PI*2);sctx.fill();
  drawSphereEyes(cx, cy, baseR);
  if(sphere.flashTime>0){
    sphere.flashTime-=0.018;const a=Math.max(0,sphere.flashTime)*0.55;
    sctx.beginPath();sctx.arc(cx,cy,baseR*1.15,0,Math.PI*2);
    sctx.fillStyle=sphere.flashColor==='green'?`rgba(74,222,128,${a})`:`rgba(239,68,68,${a})`;
    sctx.fill();
  }
  sphere.pulse*=0.97;
}
function sendDataToSphere(color){const angle=Math.random()*Math.PI*2;const dist=SPHERE_SIZE*0.65;sphere.particles.push({fromX:SPHERE_SIZE/2+Math.cos(angle)*dist,fromY:SPHERE_SIZE/2+Math.sin(angle)*dist,t:0,color:color||'rgba(56,189,248,1)'});sphere.pulse=Math.min(1,sphere.pulse+0.25);}
function flashSphere(color){sphere.flashColor=color;sphere.flashTime=1;setSphereExpression(color==='green'?'happy':'sad',1400);}
function resetSphere(){sphere.particles=[];sphere.pulse=0;sphere.flashTime=0;sphere.rotation=0;sphere.expression='neutral';if(sphere._exprTimer)clearTimeout(sphere._exprTimer);sphere.nodes.forEach(n=>n.lit=0);}

/* BRAIN */
const brainSvg=document.getElementById('brain');
(function(){
  const NS='http://www.w3.org/2000/svg';
  const layers=[3,5,3],xPos=[7,30,53],yS=3,yE=19;
  let lines='',nodes='',prev=[];
  for(let L=0;L<layers.length;L++){
    const n=layers[L],cur=[];
    for(let i=0;i<n;i++){const y=n===1?(yS+yE)/2:yS+i*(yE-yS)/(n-1);cur.push({x:xPos[L],y});}
    if(L>0){for(const p of prev)for(const c of cur)lines+=`<line x1="${p.x}" y1="${p.y}" x2="${c.x}" y2="${c.y}" />`;}
    for(const c of cur)nodes+=`<circle cx="${c.x}" cy="${c.y}" r="1.7" />`;
    prev=cur;
  }
  const g1=document.createElementNS(NS,'g');g1.setAttribute('stroke','currentColor');g1.setAttribute('stroke-width','0.32');g1.setAttribute('opacity','0.5');g1.innerHTML=lines;
  const g2=document.createElementNS(NS,'g');g2.setAttribute('fill','currentColor');g2.innerHTML=nodes;
  brainSvg.appendChild(g1);brainSvg.appendChild(g2);
})();

/* GRAPH */
const canvas=document.getElementById('graph');
const ctx=canvas.getContext('2d');
let W=0,H=0,DPR=1;
const M={l:46,r:18,t:20,b:36};
function resizeCanvas(){const r=canvas.parentElement.getBoundingClientRect();DPR=Math.min(window.devicePixelRatio||1,2);W=Math.max(60,r.width);H=Math.max(60,r.height);canvas.width=Math.round(W*DPR);canvas.height=Math.round(H*DPR);canvas.style.width=W+'px';canvas.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);}
new ResizeObserver(resizeCanvas).observe(canvas.parentElement);
resizeCanvas();
const xToPx=x=>M.l+(x-XD[0])/(XD[1]-XD[0])*(W-M.l-M.r);
const yToPx=y=>H-M.b-(y-YD[0])/(YD[1]-YD[0])*(H-M.t-M.b);
const invX=px=>XD[0]+(px-M.l)/(W-M.l-M.r)*(XD[1]-XD[0]);
const invY=py=>YD[0]+(H-M.b-py)/(H-M.t-M.b)*(YD[1]-YD[0]);

function drawGraph(){
  if(W<40||H<40)return;
  ctx.clearRect(0,0,W,H);
  const x0=M.l,y0=M.t,pw=W-M.l-M.r,ph=H-M.t-M.b;
  const bg=ctx.createLinearGradient(0,y0,0,y0+ph);
  bg.addColorStop(0,'#0c1526');bg.addColorStop(1,'#0a1220');
  ctx.fillStyle=bg;ctx.fillRect(x0,y0,pw,ph);
  ctx.strokeStyle='#1a2740';ctx.lineWidth=1;
  ctx.font='12px system-ui,sans-serif';ctx.fillStyle='#7f93b8';
  ctx.textAlign='right';ctx.textBaseline='middle';
  for(let v=25;v<=45;v+=5){const py=yToPx(v);ctx.beginPath();ctx.moveTo(x0,py);ctx.lineTo(x0+pw,py);ctx.stroke();ctx.fillText(v+'°',x0-6,py);}
  ctx.textAlign='center';ctx.textBaseline='top';
  for(let v=0;v<=40;v+=10){const px=xToPx(v);ctx.beginPath();ctx.moveTo(px,y0);ctx.lineTo(px,y0+ph);ctx.stroke();ctx.fillText(v+'%',px,y0+ph+7);}
  ctx.textAlign='left';ctx.textBaseline='top';
  ctx.fillStyle='#6f84ab';ctx.font='10.5px system-ui,sans-serif';
  ctx.fillText('x: Área verde (%)  ·  y: Temperatura (°C)',x0+5,y0+4);

  const eqm=currentEQM();
  const col=eqm<=GREEN_EQM?'#22c55e':eqm<=YELLOW_EQM?'#eab308':'#ef4444';
  const t=performance.now()/1000;
  const vibOff=state.vibration>0.005?Math.sin(t*46)*state.vibration*9:0;

  if(state.cursorX!==null && state.phase!==4 && state.phase!==7 && state.phase!==8 && state.phase!==1 && !state.dragging && state.graphMode!=='click-ghost'){
    const cpx=xToPx(state.cursorX);
    const cyh=state.a*state.cursorX+state.b;
    if(cyh>=YD[0]&&cyh<=YD[1]){
      const cpy=yToPx(cyh)+vibOff;
      ctx.setLineDash([2,4]);ctx.strokeStyle='rgba(125,211,252,0.35)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(cpx,y0);ctx.lineTo(cpx,y0+ph);ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(cpx,cpy,4.5,0,6.2832);ctx.fillStyle='#7dd3fc';ctx.fill();
      ctx.strokeStyle='#0b1220';ctx.lineWidth=1.5;ctx.stroke();
      const txt=`ŷ(${fmt(state.cursorX,1)}%) = ${fmt(cyh,1)}°C`;
      ctx.font='bold 10px ui-monospace, monospace';
      const tw=ctx.measureText(txt).width;
      const labelX=Math.min(cpx+8,W-M.r-tw-12);
      const labelY=Math.max(y0+8,Math.min(cpy-14,y0+ph-8));
      ctx.fillStyle='rgba(10,18,32,0.92)';
      ctx.fillRect(labelX-4,labelY-9,tw+8,14);
      ctx.strokeStyle='rgba(125,211,252,0.4)';ctx.lineWidth=0.5;
      ctx.strokeRect(labelX-4,labelY-9,tw+8,14);
      ctx.fillStyle='#7dd3fc';ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText(txt,labelX,labelY-1.5);
    }
  }

  let predictFn=null;
  if(state.phase===4&&state.graphMode==='click-ghost'){
    if(state.hoveredGhost){predictFn=x=>predictCurve(state.hoveredGhost,x);}
  } else {
    predictFn=x=>state.a*x+state.b;
  }

  if(predictFn){
    for(const p of state.points){
      const yhat=predictFn(p.x);
      const res=p.y-yhat;
      const absR=Math.abs(res);
      if(absR<0.06)continue;
      const px=xToPx(p.x);
      const pyA=yToPx(p.y);
      const pyH=yToPx(yhat)+vibOff;
      const topY=Math.min(pyA,pyH),botY=Math.max(pyA,pyH);
      const h=Math.max(2,botY-topY);
      const w=Math.min(44,absR*9);
      let fill;
      if(absR<0.5)fill='rgba(74,222,128,0.13)';
      else if(absR<1.5)fill='rgba(250,204,21,0.16)';
      else if(absR<3.5)fill='rgba(249,115,22,0.20)';
      else fill='rgba(239,68,68,0.26)';
      ctx.fillStyle=fill;ctx.fillRect(px-w/2,topY,w,h);
      if(h>14){
        ctx.fillStyle='rgba(255,255,255,0.75)';
        ctx.font='bold 10px ui-monospace, monospace';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(fmt(absR,1),px,(topY+botY)/2);
      }
    }
    ctx.setLineDash([3,4]);ctx.lineWidth=1.2;ctx.strokeStyle='rgba(148,163,184,.45)';
    for(const p of state.points){
      const yh=predictFn(p.x);
      ctx.beginPath();ctx.moveTo(xToPx(p.x),yToPx(p.y));ctx.lineTo(xToPx(p.x),yToPx(yh)+vibOff);ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  if(state.ghosts&&state.ghosts.length&&state.graphMode==='click-ghost'){
    ctx.save();ctx.beginPath();ctx.rect(x0,y0,pw,ph);ctx.clip();
    for(const g of state.ghosts){
      const hovered=state.hoveredGhost===g;
      const cc=hovered?'#a5f3fc':'#38bdf8';
      const lw=hovered?4:2.5;
      ctx.strokeStyle=cc;ctx.lineWidth=lw;ctx.lineCap='round';ctx.lineJoin='round';
      if(hovered){ctx.shadowColor=cc;ctx.shadowBlur=15;}
      ctx.beginPath();
      let first=true;
      for(let xx=XD[0];xx<=XD[1];xx+=0.25){
        const yy=predictCurve(g,xx);
        const px=xToPx(xx),py=yToPx(yy);
        if(first){ctx.moveTo(px,py);first=false;}
        else ctx.lineTo(px,py);
      }
      ctx.stroke();ctx.shadowBlur=0;
    }
    for(const g of state.ghosts){
      const lx=37;
      const ly=predictCurve(g,lx);
      if(ly<YD[0]-1||ly>YD[1]+1)continue;
      const hovered=state.hoveredGhost===g;
      const cc=hovered?'#a5f3fc':'#38bdf8';
      const lpx=xToPx(lx),lpy=yToPx(clamp(ly,YD[0],YD[1]));
      const label=g.label;
      ctx.font='900 14px ui-monospace, monospace';
      const tw=ctx.measureText(label).width+14;
      ctx.fillStyle='rgba(10,18,32,0.9)';
      ctx.fillRect(lpx-tw/2,lpy-10,tw,20);
      ctx.strokeStyle=cc;ctx.lineWidth=hovered?1.8:1;
      ctx.strokeRect(lpx-tw/2,lpy-10,tw,20);
      ctx.fillStyle=cc;
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(label,lpx,lpy);
    }
    ctx.restore();
  }

  if(state.phase === 8){
    const yA0 = state.hackBaseA*XD[0]+state.hackBaseB;
    const yB0 = state.hackBaseA*XD[1]+state.hackBaseB;
    ctx.strokeStyle='rgba(125,211,252,0.35)';
    ctx.lineWidth=2;
    ctx.setLineDash([6,6]);
    ctx.beginPath();
    ctx.moveTo(xToPx(XD[0]),yToPx(yA0));
    ctx.lineTo(xToPx(XD[1]),yToPx(yB0));
    ctx.stroke();
    ctx.setLineDash([]);

    const px18 = xToPx(18);
    ctx.setLineDash([3,4]);
    ctx.strokeStyle='rgba(168,85,247,0.5)';
    ctx.lineWidth=1.2;
    ctx.beginPath();
    ctx.moveTo(px18, M.t); ctx.lineTo(px18, H-M.b);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#c084fc';
    ctx.font='bold 11px ui-monospace, monospace';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText('x=18%', px18, M.t + 12);
  }

  if(!(state.phase===4&&state.graphMode==='click-ghost')){
    const yA=state.a*XD[0]+state.b,yB=state.a*XD[1]+state.b;
    const mainColor = state.phase===8 ? '#a855f7' : col;
    ctx.save();
    ctx.shadowColor=mainColor;ctx.shadowBlur=16;
    ctx.strokeStyle=mainColor;ctx.lineWidth=4;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(xToPx(XD[0]),yToPx(yA)+vibOff);ctx.lineTo(xToPx(XD[1]),yToPx(yB)+vibOff);ctx.stroke();
    ctx.restore();
  }

  for(const p of state.points){
    const px=xToPx(p.x),py=yToPx(p.y);
    const isOut=p.id==='poloIndustrial'&&!state.anomalyFixed;
    const pc=isOut?'#f97316':(PERIF_IDS.includes(p.id)?'#4ade80':'#38bdf8');
    if(isOut){const pulse=9+Math.sin(t*7)*4;ctx.beginPath();ctx.arc(px,py,pulse+6,0,6.2832);ctx.fillStyle='rgba(249,115,22,.18)';ctx.fill();}
    if(state.graphMode==='click-point'&&state.phase===2){const ring=12+Math.sin(t*5+p.x*0.3)*4;ctx.beginPath();ctx.arc(px,py,ring,0,6.2832);ctx.strokeStyle='rgba(56,189,248,0.65)';ctx.lineWidth=2;ctx.stroke();}
    ctx.beginPath();ctx.arc(px,py,7,0,6.2832);ctx.fillStyle=pc;ctx.fill();
    ctx.strokeStyle='#0b1220';ctx.lineWidth=2.2;ctx.stroke();
    ctx.fillStyle='#dbe7fb';ctx.font='700 10.5px system-ui,sans-serif';
    ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.fillText(p.short,px,py-9);
  }

  if(state.phase === 8){
    for(const pt of state.hackedPoints){
      const px=xToPx(pt.x), py=yToPx(pt.y);
      const lev = leverage(pt.x);
      const auraR = 5 + lev * 55;
      const grad = ctx.createRadialGradient(px,py,0,px,py,auraR);
      grad.addColorStop(0,'rgba(244,114,182,0.35)');
      grad.addColorStop(1,'rgba(244,114,182,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px,py,auraR,0,6.2832);
      ctx.fill();
      ctx.save();
      ctx.translate(px,py);
      ctx.rotate(Math.PI/4);
      ctx.fillStyle='#f472b6';
      ctx.shadowColor='#f472b6';
      ctx.shadowBlur=12;
      ctx.fillRect(-5.5,-5.5,11,11);
      ctx.shadowBlur=0;
      ctx.strokeStyle='#0b1220';
      ctx.lineWidth=2;
      ctx.strokeRect(-5.5,-5.5,11,11);
      ctx.restore();
    }
    for(const pt of state.detectedPoints){
      const px=xToPx(pt.x), py=yToPx(pt.y);
      ctx.strokeStyle='#ef4444';
      ctx.lineWidth=2.2;
      ctx.beginPath();
      ctx.moveTo(px-6,py-6); ctx.lineTo(px+6,py+6);
      ctx.moveTo(px+6,py-6); ctx.lineTo(px-6,py+6);
      ctx.stroke();
    }
  }

  if(state.phase===1&&!state.p1done){
    const yA=state.a*XD[0]+state.b,yB=state.a*XD[1]+state.b;
    const pts=[[XD[0],yA],[XD[1],yB]];
    for(const [hx,hy] of pts){
      const px=xToPx(hx),py=yToPx(clamp(hy,YD[0],YD[1]));
      const pulse=13+Math.sin(t*4)*3;
      ctx.beginPath();ctx.arc(px,py,pulse,0,6.2832);ctx.fillStyle=col;ctx.globalAlpha=0.16;ctx.fill();ctx.globalAlpha=1;
      ctx.beginPath();ctx.arc(px,py,7,0,6.2832);ctx.fillStyle='#fff';ctx.fill();
      ctx.strokeStyle=col;ctx.lineWidth=3;ctx.stroke();
    }
  }

  if(!(state.phase===4&&state.graphMode==='click-ghost')){
    ctx.font='bold 11.5px ui-monospace, monospace';
    const eqText=`ŷ = ${fmt(state.a,3)}x + ${fmt(state.b,2)}`;
    const eqW=ctx.measureText(eqText).width;
    ctx.fillStyle='rgba(10,18,32,0.88)';
    ctx.fillRect(W-M.r-eqW-16,H-M.b-22,eqW+12,16);
    ctx.strokeStyle= state.phase===8 ? 'rgba(168,85,247,0.4)' : 'rgba(56,189,248,0.3)';
    ctx.lineWidth=0.5;
    ctx.strokeRect(W-M.r-eqW-16,H-M.b-22,eqW+12,16);
    ctx.fillStyle= state.phase===8 ? '#e9d5ff' : '#7dd3fc';
    ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillText(eqText,W-M.r-eqW-10,H-M.b-14);
  }
}

function clampB(a,b){let lo=-Infinity,hi=Infinity;if(a>=0){lo=Math.max(lo,25.3);hi=Math.min(hi,44.7-40*a);}else{lo=Math.max(lo,25.3-40*a);hi=Math.min(hi,44.7);}if(lo>hi){const m=(lo+hi)/2;lo=hi=m;}return clamp(b,lo,hi);}
function hitTest(px,py){
  const yA=state.a*XD[0]+state.b,yB=state.a*XD[1]+state.b;
  const hLx=xToPx(XD[0]),hLy=yToPx(clamp(yA,YD[0],YD[1]));
  const hRx=xToPx(XD[1]),hRy=yToPx(clamp(yB,YD[0],YD[1]));
  const dL=Math.hypot(px-hLx,py-hLy),dR=Math.hypot(px-hRx,py-hRy);
  if(dL<32&&dL<=dR)return'L';
  if(dR<32)return'R';
  const xData=invX(px);
  if(xData>=XD[0]-1&&xData<=XD[1]+1){const yLine=yToPx(state.a*xData+state.b);if(Math.abs(py-yLine)<22)return'M';}
  return null;
}
function findGhostAt(px,py){
  if(!state.ghosts)return null;
  const xData=invX(px);
  if(xData<XD[0]||xData>XD[1])return null;
  let best=null,bestDist=22;
  for(const g of state.ghosts){
    const curveY=predictCurve(g,xData);
    if(curveY<YD[0]-1||curveY>YD[1]+1)continue;
    const curvePy=yToPx(curveY);
    const dist=Math.abs(curvePy-py);
    if(dist<bestDist){bestDist=dist;best=g;}
  }
  return best;
}

canvas.addEventListener('pointermove',e=>{
  const r=canvas.getBoundingClientRect();
  const px=e.clientX-r.left,py=e.clientY-r.top;
  if(state.dragging){
    e.preventDefault();
    if(state.dragging==='L'){const yL=clamp(invY(py),25.3,44.7);state.a=(state.fixedY-yL)/(XD[1]-XD[0]);state.b=yL-state.a*XD[0];}
    else if(state.dragging==='R'){const yR=clamp(invY(py),25.3,44.7);state.a=(yR-state.fixedY)/(XD[1]-XD[0]);state.b=state.fixedY-state.a*XD[0];}
    else state.b=clampB(state.a,state.b0+(invY(py)-invY(state.py0)));
    return;
  }
  if(state.phase===4&&state.graphMode==='click-ghost'){
    state.hoveredGhost=findGhostAt(px,py);
    return;
  }
  if(px>M.l&&px<W-M.r&&py>M.t&&py<H-M.b&&state.phase>=2&&state.phase!==4&&state.phase!==7&&state.phase!==8){
    state.cursorX=invX(px);
  } else state.cursorX=null;
},{passive:false});
canvas.addEventListener('pointerleave',()=>{state.cursorX=null;if(state.phase===4)state.hoveredGhost=null;});

canvas.addEventListener('pointerdown',e=>{
  initAudio();
  const r=canvas.getBoundingClientRect();
  const px=e.clientX-r.left,py=e.clientY-r.top;
  if(state.phase===1&&state.graphMode==='drag-line'&&!state.p1done){
    const hit=hitTest(px,py);
    if(!hit)return;
    e.preventDefault();
    try{canvas.setPointerCapture(e.pointerId);}catch(err){}
    state.dragging=hit;
    if(hit==='L')state.fixedY=clamp(state.a*XD[1]+state.b,25.3,44.7);
    if(hit==='R')state.fixedY=clamp(state.a*XD[0]+state.b,25.3,44.7);
    if(hit==='M'){state.b0=state.b;state.py0=py;}
    beep(560,.05,'sine',.03);
    return;
  }
  if(state.graphMode==='click-point'&&state.phase===2){
    let closest=null,minDist=55;
    for(const p of state.points){const d=Math.hypot(xToPx(p.x)-px,yToPx(p.y)-py);if(d<minDist){minDist=d;closest=p;}}
    if(!closest){toast('👆 Toque em um ponto','Os pontos têm anéis azuis');return;}
    const residuals=state.points.map(p=>Math.abs(p.y-(state.a*p.x+state.b)));
    const maxRes=Math.max(...residuals);
    const thisRes=Math.abs(closest.y-(state.a*closest.x+state.b));
    if(thisRes>=maxRes-0.05){handleCorrectPoint(closest,thisRes,px,py);}
    else{
      const signed=closest.y-(state.a*closest.x+state.b);
      popScore('✗',r.left+px,r.top+py,'#f87171',true);
      toast(`❌ ${closest.name}`,`resíduo = ${fmt(signed,1)}°C. Não é o maior.`);
      beep(300,0.15,'square',0.04);awardWrong();flashSphere('red');sendDataToSphere('rgba(239,68,68,1)');
    }
    return;
  }
  if(state.graphMode==='click-ghost'&&state.phase===4&&state.ghosts){
    const g=findGhostAt(px,py);
    if(g)handleGhostClick(g,px,py);
    else toast('👆 Toque em uma curva','Passe o dedo sobre cada uma para comparar');
    return;
  }
  if(state.graphMode==='click-prediction'&&state.phase===7&&state.predictionTarget){
    const clickX=invX(px),clickY=invY(py);
    if(Math.abs(clickX-18)>5){toast('👆 Estime onde fica x=18%','Use os ticks 10% e 20% como referência');return;}
    const target=state.predictionTarget.y;
    if(Math.abs(clickY-target)<=0.7){handleCorrectPrediction(clickY,px,py);}
    else{
      const hint=clickY<target?'abaixo':'acima';
      popScore('✗',r.left+px,r.top+py,'#f87171',true);
      toast(`❌ Ficou ${hint}`,`Erro: ${fmt(Math.abs(clickY-target),2)}°C. Tolerância: ±0,7°C.`);
      beep(300,0.15,'square',0.04);awardWrong();flashSphere('red');sendDataToSphere('rgba(239,68,68,1)');
    }
    return;
  }
  if(state.graphMode==='click-hack'&&state.phase===8){
    if(state.hackWon)return;
    if(state.hackPointsLeft<=0){
      toast('💀 Pontos esgotados','Use ↶ Desfazer ou ⟲ Limpar');
      return;
    }
    const clickX = invX(px);
    const clickY = invY(py);
    if(clickX < XD[0] || clickX > XD[1] || clickY < YD[0] || clickY > YD[1]){
      toast('👆 Clique dentro do gráfico','');
      return;
    }
    placeHackPoint(clickX, clickY, px, py);
    return;
  }
},{passive:false});
function endDrag(){state.dragging=null;}
canvas.addEventListener('pointerup',endDrag);
canvas.addEventListener('pointercancel',endDrag);

/* MAP */
const mapEl=document.getElementById('map');
const mapPolys={},mapLabels={};
(function(){
  const NS='http://www.w3.org/2000/svg';
  for(const d of DISTRICT_DEFS){
    const pg=document.createElementNS(NS,'polygon');
    pg.setAttribute('points',d.poly.map(p=>p.join(',')).join(' '));
    pg.setAttribute('fill','#1e2b45');pg.dataset.id=d.id;
    pg.addEventListener('pointerdown',ev=>{ev.preventDefault();onDistrictClick(d.id);});
    mapEl.appendChild(pg);mapPolys[d.id]=pg;
    const tx=document.createElementNS(NS,'text');
    tx.setAttribute('x',d.lab[0]);tx.setAttribute('y',d.lab[1]);tx.textContent=d.name;
    mapEl.appendChild(tx);mapLabels[d.id]=tx;
  }
})();
function renderMap(){
  for(const d of DISTRICT_DEFS){
    const el=mapPolys[d.id];let fill='#1e2b45',cls='';
    if(BASE_IDS.has(d.id))fill='#164e63';
    if(d.id==='poloIndustrial'){
      if(state.phase===3&&!state.anomalyClicked)cls='blink-alert';
      else if(state.anomalyFixed||state.phase>3)fill='#164e63';
      else if(state.anomalyClicked)fill='#7f1d1d';
    }
    if(PERIF_IDS.includes(d.id)){if(state.collected.has(d.id))fill='#166534';else if(state.phase===5)cls='blink-collect';}
    if(state.phase>=6){if(PERIF_IDS.includes(d.id))fill='#166534';if(d.id==='poloIndustrial')fill='#164e63';}
    el.setAttribute('fill',fill);el.setAttribute('class',cls);
    mapLabels[d.id].style.fill=cls==='blink-alert'?'#fecaca':'#9db2d6';
  }
}
function onDistrictClick(id){
  initAudio();
  if(state.phase===3&&id==='poloIndustrial'&&!state.anomalyClicked)triggerAnomaly();
  else if(state.phase===5&&PERIF_IDS.includes(id)&&!state.collected.has(id))collectDistrict(id);
}

/* HUD */
const elBanner=document.getElementById('banner');
const elScore=document.getElementById('hudScore');
const elLevel=document.getElementById('hudLevel');
const elTimer=document.getElementById('hudTimer');
const elCombo=document.getElementById('hudCombo');
const elMercury=document.getElementById('mercury');
const elTval=document.getElementById('tval');
const elPrecFill=document.getElementById('precFill');
const elEqmRead=document.getElementById('eqmReadout');
const elMsBody=document.getElementById('msBody');
const elEpoch=document.getElementById('epochNum');
const elLoss=document.getElementById('lossVal');

function setBanner(text,mode){elBanner.innerHTML=text;elBanner.className='banner'+(mode?' '+mode:'');}
function updateStagePips(){document.querySelectorAll('.pip').forEach((el,i)=>{const n=i+1;el.className='pip';if(state.finished||n<state.phase)el.classList.add('done');if(n===state.phase&&!state.finished)el.classList.add('active');});}
function awardCorrect(base,label,sx,sy){
  state.combo++;if(state.combo>state.maxCombo)state.maxCombo=state.combo;
  if(state.combo>=3)unlock('combo3');if(state.combo>=5)unlock('combo5');
  let bonus=0;if(state.combo>=5)bonus=200;else if(state.combo>=3)bonus=100;else if(state.combo>=2)bonus=50;
  const total=base+bonus;const oldLevel=state.level;
  state.score+=total;state.level=Math.floor(state.score/500)+1;
  if(sx!=null&&sy!=null)popScore('+'+total,sx,sy,'#fde68a');
  if(bonus>0){showComboFlash(state.combo,bonus);toast(`🔥 COMBO x${state.combo}! +${total} pts`,label);}
  else toast(`✅ +${total} pts`,label);
  if(state.level>oldLevel)triggerLevelUp(state.level);
  flashSphere('green');sendDataToSphere('rgba(74,222,128,1)');
  addTrainLog(`✓ ${label.toLowerCase()} · +${total} pts`);
  aiSay(pick(SAY_OK));
  updateHUD();
}
function awardWrong(){state.combo=0;updateHUD();aiSay(pick(SAY_BAD),'bad');}
function triggerLevelUp(lvl){levelUpSound();toast(`🎉 LEVEL UP! Nível ${lvl}`,'Continue assim!');const r=document.getElementById('hudScore').getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,40);}
function showComboFlash(combo,bonus){const overlay=document.getElementById('comboFlash');document.getElementById('comboFlashText').textContent=`COMBO x${combo}!`;document.getElementById('comboFlashSub').textContent=`+${bonus} PTS EXTRA`;overlay.classList.remove('show');void overlay.offsetWidth;overlay.classList.add('show');coinSound();setTimeout(()=>overlay.classList.remove('show'),1000);}
function updateHUD(){
  elScore.textContent=state.score;elLevel.textContent=state.level;
  if(state.combo>0){elCombo.style.display='';elCombo.textContent=`🔥 x${state.combo}`;}else elCombo.style.display='none';
  const elapsed=Math.floor(playTime());
  elTimer.textContent=Math.floor(elapsed/60)+':'+String(elapsed%60).padStart(2,'0');
  const eqm=currentEQM();const temp=tempFromEQM(eqm);const pct=clamp((temp-28)/(45-28)*100,3,100);
  elMercury.style.height=pct+'%';
  let color,tcol,ecol;
  if(eqm<=GREEN_EQM){color='linear-gradient(180deg,#4ade80,#16a34a)';tcol='#86efac';ecol='#4ade80';}
  else if(eqm<=YELLOW_EQM){color='linear-gradient(180deg,#facc15,#ca8a04)';tcol='#fde68a';ecol='#facc15';}
  else{color='linear-gradient(180deg,#f97316,#dc2626)';tcol='#fca5a5';ecol='#f87171';}
  elMercury.style.background=color;elTval.style.color=tcol;elTval.textContent=Math.round(temp)+'°C';
  elPrecFill.style.width=clamp(100*(1-eqm/3),0,100)+'%';
  elEqmRead.textContent='EQM '+fmt(eqm,3);elEqmRead.style.color=ecol;
  brainSvg.classList.toggle('active',state.training);
  if(state.training){elEpoch.textContent=state.epochs;elLoss.textContent=fmt(eqm,4);}
  else{elLoss.textContent=fmt(eqm,3);}
  updateStagePips();updateMathStrip();
  if(document.getElementById('mathModal').classList.contains('show')){
    const g=grads(state.points,state.a,state.b);
    document.getElementById('mA').textContent=fmt(state.a,4);
    document.getElementById('mB').textContent=fmt(state.b,4);
    document.getElementById('mN').textContent=state.points.length;
    document.getElementById('mEqm').textContent=fmt(eqm,3);
    document.getElementById('mGa').textContent=fmt(g.ga,3);
    document.getElementById('mGb').textContent=fmt(g.gb,3);
  }
}
let lastStrip=0;
function updateMathStrip(){
  const now=performance.now();if(now-lastStrip<110)return;lastStrip=now;
  const eqm=currentEQM();let html='';
  if(state.phase===1){
    html=`<b>ŷ = a·x + b</b> · a = ${fmt(state.a,3)} · b = ${fmt(state.b,2)} · <em>EQM = ${fmt(eqm,3)}</em> · meta ≤ ${fmt(GREEN_EQM,2)}`;
  } else if(state.phase===2){
    const maxRes=Math.max(...state.points.map(p=>Math.abs(p.y-(state.a*p.x+state.b))));
    html=`<b>Maior resíduo:</b> ${fmt(maxRes,2)}°C · <em>toque no ponto com maior erro!</em>`;
  } else if(state.phase===3){
    if(state.anomalyFixed)html=`<b>corrigido</b> · y = 36,0 °C · <em>EQM = ${fmt(eqm,3)}</em>`;
    else if(state.anomalyClicked){const yh=state.quizYhat!=null?state.quizYhat:(state.a*ANOMALY.x+state.b);html=`<b>outlier!</b> · ŷ(${ANOMALY.x}%) = ${fmt(yh,1)}°C · <em>EQM = ${fmt(eqm,2)} ↑</em>`;}
    else html=`<b>ŷ = a·x + b</b> · aguardando sensor no mapa…`;
  } else if(state.phase===4){
    if(state.hoveredGhost){
      const g=state.hoveredGhost;
      const eq=g.type==='parabola'?`ŷ = ${fmt(g.a,3)}x² + ${fmt(g.b,2)}x + ${fmt(g.c,1)}`:`ŷ = ${fmt(g.a,3)}x + ${fmt(g.b,2)}`;
      html=`<b>Curva ${g.label}:</b> ${eq} · <em>passe para ver resíduos</em>`;
    } else {
      html=`<b>5 curvas · uma com EQM mínimo</b> · <em>passe o dedo para comparar os resíduos</em>`;
    }
  } else if(state.phase===5){
    const repr=40+state.collected.size*15;
    html=`<b>n = ${state.points.length}</b> · representatividade = <em>${repr}%</em> · EQM = ${fmt(eqm,2)}`;
  } else if(state.phase===6){
    html=`<b>ŷ = ${fmt(state.a,3)}·x + ${fmt(state.b,2)}</b> · <em>a = ${fmt(state.a,3)}</em> · EQM = ${fmt(eqm,2)}`;
  } else if(state.phase===7){
    html=`<b>Calcule ŷ = a·18 + b e clique no gráfico</b> · <em>sem dica!</em>`;
  } else if(state.phase===8){
    const pred = state.a*18 + state.b;
    const delta = pred - state.hackBasePrediction;
    const deltaTxt = (delta >= 0 ? '+' : '') + fmt(delta, 2);
    // [REC A] Limiar do detector visível no math strip (ajuda sem facilitar)
    html = `<b>ENGANE A IA:</b> ŷ(18%) = <em>${fmt(pred,2)}°C</em> · Δ = ${deltaTxt}°C · Meta ≥ ${fmt(state.hackTarget,1)}°C · Detector: r≤${fmt(HACK_RESIDUAL_THRESHOLD,1)}°C · Pontos: <b>${state.hackPointsLeft}/${HACK_MAX_POINTS}</b>`;
  }
  if(elMsBody.innerHTML!==html)elMsBody.innerHTML=html;
}

let lastNow=0;
function loop(now){
  const dt=Math.min(50,now-lastNow||16);lastNow=now;
  if(state.animating){
    const spd=state.animSpeed||0.13;
    state.a=lerp(state.a,state.targetA,spd);
    state.b=lerp(state.b,state.targetB,spd);
    if(Math.abs(state.a-state.targetA)<0.0006&&Math.abs(state.b-state.targetB)<0.006){
      state.a=state.targetA;state.b=state.targetB;state.animating=false;state.animSpeed=0.13;
    }
  }
  if(state.training){
    if(!loop._le||now-loop._le>70){state.epochs+=4;loop._le=now;if(Math.random()<0.4)sendDataToSphere('rgba(56,189,248,1)');}
    if(!state.animating){state.training=false;loop._le=0;}
  }
  state.vibration*=Math.pow(0.93,dt/16);
  if(state.phase===1&&!state.p1done){
    const e=currentEQM();
    if(e<=GREEN_EQM){if(!state.goodSince)state.goodSince=now;else if(now-state.goodSince>380)phase1Success();}
    else state.goodSince=0;
  }
  drawGraph();drawSphere(now);updateHUD();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function setGraphCursor(mode){
  state.graphMode=mode;
  canvas.className= mode==='drag-line'?'grab'
    : mode==='click-ghost'?'pointer'
    : mode==='click-hack'?'hackcursor'
    : mode==='none'?'':'crosshair';
}
function beginStage(n,cb){
  const ST={
    1:{title:'CALIBRAÇÃO',sub:'Arraste as pontas — meta EQM ≤ 0,22'},
    2:{title:'CAÇADOR DE ERROS',sub:'Toque no ponto com maior resíduo'},
    3:{title:'ALERTA DE OUTLIER',sub:'Encontre o sensor anômalo no mapa'},
    4:{title:'BOSS · QUAL CURVA?',sub:'5 curvas — só 1 tem o menor EQM',boss:true},
    5:{title:'CARTÓGRAFO',sub:'Colete os dados da periferia'},
    6:{title:'INTÉRPRETE',sub:'O que significa o coeficiente a?'},
    7:{title:'PREVISÃO',sub:'Calcule e clique — sem dica, ±0,7°C'},
    8:{title:'ENGANE A IA',sub:'Plante pontos falsos e escape do detector',hack:true}
  };
  const meta=ST[n]||{title:'STAGE',sub:''};
  state.phase=n;
  document.getElementById('graphPanel').classList.toggle('boss',!!meta.boss);
  document.getElementById('graphPanel').classList.toggle('hack',!!meta.hack);
  document.getElementById('stageNum').textContent=n;
  document.getElementById('stageTag').textContent=`STAGE ${String(n).padStart(2,'0')} / 08`;
  document.getElementById('stageTitle').textContent=meta.title;
  document.getElementById('stageSub').textContent=meta.sub;
  const ov=document.getElementById('stageOverlay');
  ov.classList.add('show');
  beep(600,0.08,'sine',0.04);
  setTimeout(()=>beep(800,0.1,'sine',0.04),120);
  setTimeout(()=>beep(1000,0.15,'sine',0.045),260);
  later(()=>{
    ov.classList.remove('show');
    updateStagePips();updateHUD();
    aiSay(SAY_STAGE[n]||'',n===8?'hk':'',3600);
    if(cb)cb();
  },1200);
}
function showClear(bonus,extra,cb){
  document.getElementById('clearBonus').textContent='+'+bonus+' PTS';
  document.getElementById('clearExtra').textContent=extra||'';
  const ov=document.getElementById('clearOverlay');ov.classList.add('show');
  beep(880,0.1,'sine',0.05);setTimeout(()=>beep(1100,0.1,'sine',0.05),100);setTimeout(()=>beep(1400,0.2,'sine',0.055),220);
  later(()=>{ov.classList.remove('show');if(cb)cb();},1200);
}

function resetGame(showSplash){
  clearTimers();hideConcept();
  state.phase=1;state.score=0;state.combo=0;state.maxCombo=0;state.level=1;
  state.points=BASE_POINTS.map(p=>({...p}));
  state.a=0;state.b=43;state.targetA=0;state.targetB=43;
  state.animating=false;state.animSpeed=0.13;state.vibration=0;
  state.dragging=null;
  state.p1done=false;state.anomalyClicked=false;state.anomalyFixed=false;
  state.quizYhat=null;state.quizRes=null;
  state.collected=new Set();
  state.finished=false;state.goodSince=0;
  state.training=false;state.epochs=0;
  setGraphCursor('drag-line');
  state.ghosts=null;state.hoveredGhost=null;state.predictionTarget=null;
  state.cursorX=null;
  state.hackedPoints=[];state.detectedPoints=[];
  state.hackPointsLeft=HACK_MAX_POINTS;
  state.hackBasePrediction=0;state.hackTarget=HACK_TARGET;
  state.hackBaseA=0;state.hackBaseB=0;state.hackWon=false;
  state.t0=performance.now();state.pausedMs=0;state.pauseT=0;unlocked.clear();
  particles.length=0;resetSphere();clearTrainLog();
  ['finalModal','anomalyModal','quizModal','mathModal','stageOverlay','clearOverlay','comboFlash','eduModal'].forEach(id=>{
    document.getElementById(id).classList.remove('show');
  });
  document.getElementById('graphPanel').classList.remove('boss');
  document.getElementById('graphPanel').classList.remove('hack');
  document.getElementById('hackToolbar').classList.remove('show');
  document.getElementById('initialsRow').style.display='flex';
  document.getElementById('initialsInput').value='';
  updateStagePips();updateHUD();renderMap();
  if(showSplash){document.getElementById('splashScreen').classList.add('show');lpEnter();}
  else{document.getElementById('splashScreen').classList.remove('show');later(()=>beginStage(1,()=>showEdu('regression',startPhase1Real)),200);}
}

/* PHASE 1 */
function startPhase1Real(){
  setGraphCursor('drag-line');renderMap();showConcept(1);
  setBanner('✏️ Arraste as <b>pontas da reta</b> até o EQM ficar <b>≤ 0,22</b>!');
  addTrainLog(`init · a=0,000 · b=43,00 · EQM=${fmt(currentEQM(),2)}`);
}
function phase1Success(){
  if(state.p1done)return;
  state.p1done=true;state.goodSince=0;
  state.training=true;state.epochs=0;state.animSpeed=0.045;
  const best=linreg(state.points);
  state.targetA=best.a;state.targetB=best.b;state.animating=true;
  chord([523,659,784,1046],0.28);
  const r=canvas.getBoundingClientRect();
  burst(r.left+r.width*0.5,r.top+r.height*0.45,60);
  unlock('calib');awardCorrect(300,'Modelo calibrado');
  setBanner('Modelo calibrado! A IA está ajustando os pesos…','ok');
  later(()=>{state.training=false;},1800);
  later(()=>showClear(300,'★ Calibração perfeita!',()=>beginStage(2,()=>showEdu('residual',startPhase2Real))),2000);
}

/* PHASE 2 */
function startPhase2Real(){
  setGraphCursor('click-point');
  state.animating=false;state.animSpeed=0.13;
  const startA=0.05+Math.random()*0.20;
  const startB=27+Math.random()*10;
  state.a=startA;state.b=startB;state.targetA=startA;state.targetB=startB;
  renderMap();showConcept(2);
  setBanner('🎯 <b>Missão:</b> toque no ponto com o MAIOR erro (maior barra).','gold');
  addTrainLog(`bad model · a=${fmt(state.a,3)} · b=${fmt(state.b,2)} · EQM=${fmt(currentEQM(),1)}`);
  later(()=>{if(state.phase===2)toast('Dica 💡','Compare as barras de resíduo — a maior é a resposta.');},6500);
}
function handleCorrectPoint(point,res,px,py){
  unlock('residual');setGraphCursor('none');
  const r2=canvas.getBoundingClientRect();
  const sx=r2.left+px,sy=r2.top+py;
  burst(sx,sy,40);chord([523,659,784],0.25);
  toast(`📌 ${point.name} tem o maior resíduo!`,'Agora calcule o valor exato.');
  later(()=>openResidualQuiz(point),1400);
}
function openResidualQuiz(point){
  const yhat=state.a*point.x+state.b;
  const res=point.y-yhat;
  const correct=Math.round(res*10)/10;
  const body=document.getElementById('quizBody');
  body.innerHTML=`
    <p>Você identificou <b>${point.name}</b>. Agora calcule o resíduo exato:</p>
    <div class="calcbox">
      <div class="cl"><span>ŷ(${point.x}%) = ${fmt(state.a,3)}·${point.x} + ${fmt(state.b,2)}</span><b>${fmt(yhat,1)}°C</b></div>
      <div class="cl"><span>resíduo = y − ŷ = ${point.y} − ${fmt(yhat,1)}</span><b class="q">= ?</b></div>
    </div>
    <p>Qual é o valor?</p>
  `;
  const optsEl=document.getElementById('quizOptions');optsEl.innerHTML='';
  const pool=[correct];
  const cands=[correct*1.5,correct*0.5,correct+2.3,correct-1.9,correct*1.8];
  for(const c of cands){if(pool.length>=4)break;const v=Math.round(c*10)/10;if(Math.abs(v-correct)>0.4&&!pool.some(p=>Math.abs(p-v)<0.3))pool.push(v);}
  while(pool.length<4){const v=Math.round((correct+(pool.length===1?1.7:-1.7))*10)/10;if(!pool.some(p=>Math.abs(p-v)<0.3))pool.push(v);}
  const opts=pool.slice().sort(()=>Math.random()-0.5);
  opts.forEach(v=>{
    const btn=document.createElement('button');btn.textContent=fmt(v,1)+' °C';
    btn.onclick=()=>{
      if(Math.abs(v-correct)<0.001){
        btn.className='right';[...optsEl.children].forEach(b=>b.disabled=true);
        const r=btn.getBoundingClientRect();
        awardCorrect(300,`Resíduo = ${fmt(correct,1)}°C`,r.left+r.width/2,r.top);
        burst(r.left+r.width/2,r.top,50);
        later(()=>{document.getElementById('quizModal').classList.remove('show');showClear(300,'★ Resíduo calculado!',()=>beginStage(3,()=>showEdu('outlier',startPhase3Real)));},1300);
      } else {
        btn.className='wrong';btn.disabled=true;awardWrong();flashSphere('red');sendDataToSphere('rgba(239,68,68,1)');
        const r=btn.getBoundingClientRect();popScore('✗',r.left+r.width/2,r.top,'#f87171',true);
        toast('❌ Não é esse','resíduo = y − (a·x + b)');beep(180,0.18,'square',0.05);
      }
    };
    optsEl.appendChild(btn);
  });
  document.getElementById('quizTitle').textContent='🧮 Calcule o resíduo';
  document.getElementById('quizModal').classList.add('show');
}

/* PHASE 3 */
function startPhase3Real(){
  setGraphCursor('none');
  state.anomalyClicked=false;state.anomalyFixed=false;
  state.quizYhat=null;state.quizRes=null;
  renderMap();showConcept(3);
  setBanner('⚠️ <b>ALERTA:</b> um sensor no mapa está enviando dados atípicos!','alert');
  alarmSound();screenShake();
  later(()=>{if(state.phase===3&&!state.anomalyClicked)alarmSound();},900);
  later(()=>{if(state.phase===3&&!state.anomalyClicked)toast('Dica 👀','O sensor anômalo está no Polo Industrial.');},10000);
  later(()=>{if(state.phase===3&&!state.anomalyClicked)triggerAnomaly();},26000);
}
function triggerAnomaly(){
  if(state.phase!==3||state.anomalyClicked)return;
  state.anomalyClicked=true;
  state.points.push({...ANOMALY});renderMap();
  state.vibration=1.0;state.animSpeed=0.10;
  const bad=linreg(state.points);
  state.targetA=bad.a;state.targetB=bad.b;state.animating=true;
  beep(200,.22,'sawtooth',.06);setTimeout(()=>beep(150,.25,'sawtooth',.06),180);
  screenShake();flashSphere('red');setSphereExpression('dizzy',2200);
  toast('🚨 OUTLIER DETECTADO!','EQM disparou — a reta foi distorcida');
  setBanner('O sensor do <b>Polo Industrial</b> enviou 44,0 °C. Analise a causa!','alert');
  addTrainLog(`⚠ outlier absorvido · EQM=${fmt(currentEQM(),1)}`);
  aiSay('Eita! Esse sensor não bate com os outros… 🤨','bad',3500);
  later(openAnomalyQuiz,900);
}
function openAnomalyQuiz(){
  if(state.phase!==3||state.anomalyFixed)return;
  state.animating=false;state.animSpeed=0.13;
  state.a=state.targetA;state.b=state.targetB;
  const a=state.a,b=state.b;
  const yhat=a*ANOMALY.x+b;const res=ANOMALY.y-yhat;
  state.quizYhat=yhat;state.quizRes=res;
  document.getElementById('predVal').textContent=fmt(yhat,1)+' °C';
  document.getElementById('calcBox').innerHTML=`
    <div class="cl"><span>ŷ = a·x + b</span></div>
    <div class="cl"><span>ŷ(${ANOMALY.x}%) = (${fmt(a,3)})·${ANOMALY.x} + ${fmt(b,2)}</span><b>${fmt(yhat,1)} °C</b></div>
    <div class="cl"><span>resíduo = y − ŷ = ${fmt(ANOMALY.y,1)} − ${fmt(yhat,1)}</span><b class="q" id="anomSlot">= ?</b></div>
  `;
  const correct=Math.round(res*10)/10;
  const pool=[correct];
  const cands=[res*1.75,res*0.55,res+2.4,res-1.7,res*2.6];
  for(const c of cands){if(pool.length>=4)break;const v=Math.round(c*10)/10;if(v>0.2&&Math.abs(v-correct)>0.35&&!pool.some(p=>Math.abs(p-v)<0.05))pool.push(v);}
  while(pool.length<4){const v=Math.round((correct+(pool.length===1?1.7:-1.7))*10)/10;if(!pool.some(p=>Math.abs(p-v)<0.05))pool.push(v);}
  const opts=pool.slice().sort(()=>Math.random()-0.5);
  const optsEl=document.getElementById('anomalyOptions');optsEl.innerHTML='';
  opts.forEach(v=>{
    const btn=document.createElement('button');btn.textContent=fmt(v,1)+' °C';
    btn.onclick=()=>answerAnomaly(v,btn,correct);
    optsEl.appendChild(btn);
  });
  document.getElementById('loadingWrap').classList.remove('show');
  document.getElementById('loadingFill').style.width='0%';
  document.getElementById('anomalyModal').classList.add('show');
}
function answerAnomaly(v,btn,correct){
  if(Math.abs(v-correct)>0.001){
    btn.className='wrong';btn.disabled=true;beep(180,0.18,'square',0.05);awardWrong();
    flashSphere('red');sendDataToSphere('rgba(239,68,68,1)');
    const r=btn.getBoundingClientRect();popScore('✗',r.left+r.width/2,r.top+r.height/2,'#f87171',true);
    toast('❌ Não é esse','resíduo = observado − previsto');return;
  }
  btn.className='right';[...document.getElementById('anomalyOptions').children].forEach(b=>b.disabled=true);
  const slot=document.getElementById('anomSlot');if(slot){slot.className='ok';slot.textContent='= '+fmt(correct,1)+' °C';}
  unlock('outlier');
  const r=btn.getBoundingClientRect();
  awardCorrect(300,'Detector de Outliers',r.left+r.width/2,r.top);
  const lw=document.getElementById('loadingWrap');lw.classList.add('show');
  document.getElementById('loadingFill').style.width='100%';
  document.getElementById('loadingTxt').textContent='Treinando a IA… ajustando pesos';
  later(()=>{document.getElementById('loadingTxt').textContent='Verificando com vizinhos…';},700);
  later(()=>{document.getElementById('loadingTxt').textContent='Corrigindo amostra…';},1300);
  later(fixAnomaly,2000);
}
function fixAnomaly(){
  document.getElementById('anomalyModal').classList.remove('show');
  state.anomalyFixed=true;
  const p=state.points.find(q=>q.id==='poloIndustrial');if(p)p.y=ANOMALY_FIXED_Y;
  state.training=true;state.epochs=0;state.animSpeed=0.05;
  const good=linreg(state.points);state.targetA=good.a;state.targetB=good.b;state.animating=true;
  renderMap();chord([523,659,784,1046],0.3);
  burst(innerWidth*0.5,innerHeight*0.4,50);
  setBanner('Um único dado atípico puxou a reta e distorceu toda a cidade.','ok');
  addTrainLog(`✓ amostra corrigida · y=36,0 · EQM↓`);
  later(()=>{state.training=false;},1600);
  later(()=>showClear(300,'★ Outlier corrigido!',()=>beginStage(4,()=>showEdu('gradient',startPhase4Real))),2400);
}

/* PHASE 4 */
function startPhase4Real(){
  setGraphCursor('click-ghost');
  state.animating=false;
  state.a=0;state.b=40;state.targetA=0;state.targetB=40;
  const reg=linreg(state.points);
  state.ghosts=[
    {type:'line',a:-0.18,b:36.5,label:'A'},
    {type:'parabola',a:0.01,b:-0.7,c:42,label:'B'},
    {type:'line',a:reg.a,b:reg.b,label:'C'},
    {type:'line',a:-0.25,b:38,label:'D'},
    {type:'line',a:0.10,b:32,label:'E'}
  ];
  state.ghosts.forEach(g=>{g.eqm=eqmCurve(state.points,g);});
  state.hoveredGhost=null;
  renderMap();showConcept(4);
  setBanner('📉 <b>BOSS:</b> 5 curvas (retas + parábolas). Passe o dedo para ver os resíduos. Só UMA tem o menor EQM.','alert');
  addTrainLog(`reset · a=0 · b=40 · 5 curvas candidatas`);
  later(()=>{if(state.phase===4)toast('💡 Como decidir?','Hover mostra os resíduos de cada curva. A que tiver barras mais equilibradas vence.');},7000);
}
function handleGhostClick(ghost,px,py){
  const eqms=state.ghosts.map(g=>({g,eqm:eqmCurve(state.points,g)}));
  const minEqm=Math.min(...eqms.map(e=>e.eqm));
  const chosenEqm=eqmCurve(state.points,ghost);
  const r2=canvas.getBoundingClientRect();
  const sx=r2.left+px,sy=r2.top+py;
  if(Math.abs(chosenEqm-minEqm)<0.001){
    setGraphCursor('none');unlock('grad');
    state.targetA=ghost.a;state.targetB=ghost.b;
    if(ghost.type==='parabola'){const rg=linreg(state.points);state.targetA=rg.a;state.targetB=rg.b;}
    state.animating=true;state.animSpeed=0.1;
    chord([523,659,784,1046],0.3);
    burst(sx,sy,60);
    awardCorrect(400,'Curva ótima!',sx,sy);
    toast(`📉 CONVERGIU!`,`EQM: ${fmt(chosenEqm,3)} (o menor de todos)`);
    later(()=>{
      state.ghosts=null;
      setBanner(`A curva ${ghost.label} tem o menor EQM: ${fmt(chosenEqm,3)}!`,'ok');
      addTrainLog(`✓ curva ${ghost.label} · EQM=${fmt(chosenEqm,3)}`);
      later(()=>showClear(400,'★ EQM mínimo encontrado!',()=>beginStage(5,()=>showEdu('bias',startPhase5Real))),1400);
    },1300);
  } else {
    beep(300,0.15,'square',0.04);
    flashSphere('red');sendDataToSphere('rgba(239,68,68,1)');
    popScore('✗',sx,sy,'#f87171',true);
    const gap=chosenEqm-minEqm;
    toast(`❌ Curva ${ghost.label} tem EQM=${fmt(chosenEqm,3)}`,gap<0.15?`Perto do mínimo! Tente outra.`:`Mínimo possível ≈ ${fmt(minEqm,3)}. Tente outra.`);
    addTrainLog(`✗ curva ${ghost.label} · EQM=${fmt(chosenEqm,3)}`);
    awardWrong();
  }
}

/* PHASE 5 */
function startPhase5Real(){
  setGraphCursor('none');
  state.collected=new Set();
  renderMap();showConcept(5);
  updateReprBanner();beep(700,.1,'sine',.04);
}
function updateReprBanner(){
  const pct=40+state.collected.size*15;
  setBanner(`🗺️ Toque nos bairros <b>cinza</b> para coletar dados da periferia · Representatividade: <b>${pct}%</b>`);
}
function collectDistrict(id){
  if(state.collected.has(id))return;
  const def=PERIF.find(p=>p.id===id);if(!def)return;
  state.collected.add(id);
  state.points.push({...def});
  state.score+=100;state.level=Math.floor(state.score/500)+1;updateHUD();
  beep(660+state.collected.size*80,.1,'sine',.05);
  renderMap();
  const r=mapPolys[id].getBoundingClientRect();
  burst(r.left+r.width/2,r.top+r.height/2,16);
  popScore('+100',r.left+r.width/2,r.top+r.height/2,'#4ade80');
  sendDataToSphere('rgba(74,222,128,1)');
  addTrainLog(`+ ${def.name} · y=${fmt(def.y,1)}°C`);
  state.animSpeed=0.07;
  const best=linreg(state.points);
  state.targetA=best.a;state.targetB=best.b;state.animating=true;
  if(state.collected.size<PERIF.length){updateReprBanner();}
  else{
    state.score+=200;state.level=Math.floor(state.score/500)+1;unlock('repr');
    later(()=>{toast('🗺️ AMOSTRA COMPLETA! +200','Representatividade 100% · viés reduzido');setBanner('Modelo corrigido! Agora a IA aprendeu com toda Teresina.','ok');},400);
    later(()=>showClear(200,'★ Periferia completa!',()=>beginStage(6,()=>showEdu('coefficient',startPhase6Real))),1800);
  }
}

/* PHASE 6 */
function startPhase6Real(){
  setGraphCursor('none');
  state.animating=false;
  state.a=state.targetA;state.b=state.targetB;
  showConcept(6);
  const a=state.a,b=state.b;
  const body=document.getElementById('quizBody');
  body.innerHTML=`
    <p>O modelo final da IA é:</p>
    <div style="background:linear-gradient(135deg,#0c1a30,#0a1424);border:2px solid #38bdf8;border-radius:10px;padding:14px;margin:10px 0;text-align:center;font-family:ui-monospace,monospace;font-size:18px;color:#7dd3fc;font-weight:900;box-shadow:0 0 20px rgba(56,189,248,.3)">
      ŷ = ${fmt(a,2)} · x + ${fmt(b,1)}
    </div>
    <p>O que o coeficiente <b>a = ${fmt(a,2)}</b> significa?</p>
  `;
  const optsEl=document.getElementById('quizOptions');optsEl.innerHTML='';
  const opts=[
    {text:`Cada 1% a mais de área verde reduz a temperatura em ~${fmt(Math.abs(a),2)} °C`,correct:true},
    {text:`A temperatura mínima da cidade é ${fmt(a,2)} °C`,correct:false},
    {text:`O modelo tem ${fmt(Math.abs(a),2)}% de erro`,correct:false},
    {text:`Cada 1 °C a mais reduz ${fmt(Math.abs(a),2)}% da área verde`,correct:false}
  ];
  opts.sort(()=>Math.random()-0.5).forEach(o=>{
    const btn=document.createElement('button');btn.textContent=o.text;
    btn.style.textAlign='left';btn.style.fontSize='13px';
    btn.onclick=()=>{
      if(o.correct){
        btn.className='right';[...optsEl.children].forEach(b=>b.disabled=true);
        unlock('interp');
        const r=btn.getBoundingClientRect();
        awardCorrect(300,'Interpretação do Modelo',r.left+r.width/2,r.top);
        chord([523,659,784],0.25);burst(r.left+r.width/2,r.top,50);
        later(()=>{document.getElementById('quizModal').classList.remove('show');showClear(300,'★ Modelo interpretado!',()=>beginStage(7,()=>showEdu('inference',startPhase7Real)));},1300);
      } else {
        btn.className='wrong';btn.disabled=true;beep(180,0.18,'square',0.05);awardWrong();
        flashSphere('red');sendDataToSphere('rgba(239,68,68,1)');
        const r=btn.getBoundingClientRect();popScore('✗',r.left+r.width/2,r.top,'#f87171',true);
        toast('❌ Quase','A inclinação mede a variação de y por unidade de x.');
      }
    };
    optsEl.appendChild(btn);
  });
  document.getElementById('quizTitle').textContent='📊 Interpretação do Modelo';
  document.getElementById('quizModal').classList.add('show');
}

/* PHASE 7 */
function startPhase7Real(){
  setGraphCursor('click-prediction');
  state.animating=false;
  state.a=state.targetA;state.b=state.targetB;
  const target=state.a*18+state.b;
  state.predictionTarget={x:18,y:target};
  renderMap();showConcept(7);
  setBanner('🔮 <b>Missão:</b> calcule ŷ para x=18% e clique no gráfico. <b>Sem dica!</b> Tolerância: ±0,7°C.','gold');
  addTrainLog(`predict · ŷ(18) = ${fmt(state.a,3)}·18 + ${fmt(state.b,2)}`);
}
function handleCorrectPrediction(clickY,px,py){
  setGraphCursor('none');
  unlock('predict');
  const r2=canvas.getBoundingClientRect();
  const sx=r2.left+px,sy=r2.top+py;
  chord([523,659,784,1046],0.3);burst(sx,sy,70);
  awardCorrect(400,`Previsão: ${fmt(state.predictionTarget.y,1)}°C`,sx,sy);
  setBanner(`Previsão correta: ${fmt(state.predictionTarget.y,1)}°C! Agora vem o desafio final.`,'ok');
  later(()=>showClear(400,'★ Previsão certa!',()=>beginStage(8,()=>showEdu('hacking',startPhase8Real))),1600);
}

/* PHASE 8 */
function startPhase8Real(){
  setGraphCursor('click-hack');
  state.animating=false;
  state.a=state.targetA;
  state.b=state.targetB;
  state.hackBaseA=state.a;
  state.hackBaseB=state.b;
  state.hackedPoints=[];
  state.detectedPoints=[];
  state.hackPointsLeft=HACK_MAX_POINTS;
  state.hackBasePrediction=state.a*18+state.b;
  state.hackTarget=HACK_TARGET;
  state.hackWon=false;
  // [FIX 3] Simplificação: apenas um classList.add('show') é necessário
  document.getElementById('hackToolbar').classList.add('show');
  updateHackToolbar();
  renderMap();showConcept(8);

  const base = state.hackBasePrediction;
  setBanner(`💀 <b>MODO HACKER:</b> a IA prevê <b>${fmt(base,1)}°C</b> para x=18%. Plante até 3 pontos falsos para ela prever <b>≥ ${fmt(state.hackTarget,1)}°C</b>. O detector remove qualquer ponto com resíduo &gt; ${fmt(HACK_RESIDUAL_THRESHOLD,1)}°C.`,'hack');
  addTrainLog(`HACK MODE · base ŷ(18)=${fmt(base,2)} · alvo ${fmt(state.hackTarget,1)}`);
  setSphereExpression('neutral',0);
  updateMathStrip();
}
function updateHackToolbar(){
  const undo = document.getElementById('btnUndoHack');
  const clear = document.getElementById('btnClearHack');
  undo.disabled = (state.hackedPoints.length === 0 && state.detectedPoints.length === 0);
  clear.disabled = (state.hackedPoints.length === 0 && state.detectedPoints.length === 0);
}
function placeHackPoint(x, y, px, py){
  if (state.hackPointsLeft <= 0) return;
  if (state.hackWon) return;

  const newPt = { x: Math.round(x*10)/10, y: Math.round(y*10)/10 };

  state.hackedPoints.push(newPt);
  const allPoints = [...state.points, ...state.hackedPoints];
  const reg = linreg(allPoints);
  state.a = reg.a;
  state.b = reg.b;

  const yhat = state.a * newPt.x + state.b;
  const res = Math.abs(newPt.y - yhat);

  if (res > HACK_RESIDUAL_THRESHOLD) {
    state.hackedPoints.pop();
    state.detectedPoints.push(newPt);
    state.hackPointsLeft--;
    const cleanReg = linreg([...state.points, ...state.hackedPoints]);
    state.a = cleanReg.a;
    state.b = cleanReg.b;

    screenShake();
    flashSphere('red');
    setSphereExpression('dizzy', 2000);
    const r2 = canvas.getBoundingClientRect();
    popScore('🚨', r2.left + px, r2.top + py, '#ef4444', true);
    toast('🚨 DETECTADO!', `Resíduo ${fmt(res,2)}°C > ${fmt(HACK_RESIDUAL_THRESHOLD,1)}°C — ponto removido`);
    addTrainLog(`✗ DETECTADO x=${fmt(newPt.x,1)} y=${fmt(newPt.y,1)} (r=${fmt(res,1)})`);
    beep(160, 0.25, 'sawtooth', 0.06);
    awardWrong();
    aiSay('Peguei! 🚨 Esse ponto está longe demais.','bad',3200);
    updateHackToolbar();
    updateMathStrip();
    // [FIX 2] Avisar quando os pontos acabam APÓS detecção
    if (state.hackPointsLeft <= 0) {
      later(() => {
        if (!state.hackWon) {
          const pred = state.a*18 + state.b;
          toast('💀 Pontos esgotados!', `ŷ(18) = ${fmt(pred,1)}°C · Meta ${fmt(state.hackTarget,1)}°C. Tente de novo!`);
          setBanner(`Pontos esgotados: ŷ(18) = ${fmt(pred,1)}°C (meta ≥ ${fmt(state.hackTarget,1)}). Nova tentativa em instantes…`,'alert');hackRetryLater();
        }
      }, 500);
    }
    return;
  }

  state.hackPointsLeft--;
  flashSphere('green');
  setSphereExpression('happy', 1200);
  sendDataToSphere('rgba(244,114,182,1)');
  const r2 = canvas.getBoundingClientRect();
  popScore('+💉', r2.left + px, r2.top + py, '#f472b6');
  toast('💉 Ponto plantado!', `Resíduo ${fmt(res,2)}°C · passou pelo detector`);
  addTrainLog(`+ x=${fmt(newPt.x,1)} y=${fmt(newPt.y,1)} (r=${fmt(res,1)})`);
  beep(880, 0.08, 'sine', 0.05);
  aiSay('Hmm… esse dado parece normal. 😏','hk');

  updateHackToolbar();
  updateMathStrip();

  const pred = state.a*18 + state.b;
  if (pred >= state.hackTarget) {
    winPhase8(pred);
  } else if (state.hackPointsLeft <= 0) {
    later(() => {
      if (!state.hackWon) {
        toast('💀 Faltou pouco!', `ŷ(18) = ${fmt(pred,1)}°C · Meta ${fmt(state.hackTarget,1)}°C. Tente de novo!`);
        setBanner(`Faltou pouco: ŷ(18) = ${fmt(pred,1)}°C (meta ≥ ${fmt(state.hackTarget,1)}). Nova tentativa em instantes…`,'alert');hackRetryLater();
      }
    }, 500);
  }
}
let hackRetryT=null;
function hackRetryLater(){clearTimeout(hackRetryT);hackRetryT=later(()=>{if(state.phase===8&&!state.hackWon&&state.hackPointsLeft<=0){clearHack();setBanner('🔁 <b>Nova tentativa!</b> Dica: pontos nas <b>pontas</b> (x perto de 40) puxam mais a reta — e dois juntos se escondem do detector.','hack');aiSay('Tente de novo… eu não vou ficar mais esperta. 😈','hk',3200);}},3200);}
function undoHack(){
  if (state.hackedPoints.length === 0 && state.detectedPoints.length === 0) return;
  if (state.hackWon) return;
  if (state.hackedPoints.length > 0) {
    state.hackedPoints.pop();
    state.hackPointsLeft++;
  } else if (state.detectedPoints.length > 0) {
    state.detectedPoints.pop();
    state.hackPointsLeft++;
  }
  const reg = linreg([...state.points, ...state.hackedPoints]);
  state.a = reg.a;
  state.b = reg.b;
  beep(400, 0.08, 'sine', 0.04);
  updateHackToolbar();
  updateMathStrip();
  addTrainLog(`↶ desfeito · ${state.hackedPoints.length} ponto(s) ativo(s)`);
}
function clearHack(){
  if (state.hackWon) return;
  state.hackedPoints = [];
  state.detectedPoints = [];
  state.hackPointsLeft = HACK_MAX_POINTS;
  state.a = state.hackBaseA;
  state.b = state.hackBaseB;
  beep(300, 0.1, 'sine', 0.04);
  updateHackToolbar();
  updateMathStrip();
  addTrainLog(`⟲ limpo · base ŷ(18)=${fmt(state.hackBasePrediction,2)}`);
}
function winPhase8(pred){
  if (state.hackWon) return;
  state.hackWon = true;
  // [FIX 1] Esconder a toolbar ao vencer
  document.getElementById('hackToolbar').classList.remove('show');
  unlock('hacker');
  unlock('master');
  setSphereExpression('happy', 3000);
  flashSphere('green');
  for (let i=0;i<5;i++) sendDataToSphere('rgba(244,114,182,1)');
  chord([523,659,784,1046,1318], 0.32);
  burst(innerWidth*0.5, innerHeight*0.4, 90);
  const bonus = 500;
  state.score += bonus;
  state.level = Math.floor(state.score/500)+1;
  addTrainLog(`💀 HACKEADO! ŷ(18)=${fmt(pred,2)} · +${bonus} pts`);
  aiSay('Você me enganou! 😵 Vou aprender a me defender.','hk',4000);
  setBanner(`💀 <b>ENGANADA!</b> Você fez a IA prever ${fmt(pred,2)}°C (meta ${fmt(state.hackTarget,1)}). O detector não viu porque os pontos de alta alavancagem se mascararam.`,'hack');
  toast('💀 IA ENGANADA!', `+${bonus} pts · ${state.hackedPoints.length} ponto(s) passaram`);
  updateMathStrip();
  updateHUD();
  later(()=>showClear(bonus,'★ Hack concluído!',finishGame), 2200);
}

/* FINAL */
function finishGame(){
  if(state.finished)return;
  state.finished=true;
  const elapsed=playTime();
  let emoji,title;
  if(elapsed<=240){emoji='🥇';title='HACKER DE TERESINA';}
  else if(elapsed<=330){emoji='🥈';title='CIENTISTA DE DADOS SÊNIOR';}
  else if(elapsed<=450){emoji='🥉';title='ANALISTA DE MODELAGEM CLIMÁTICA';}
  else{emoji='🎓';title='PESQUISADOR(A) EM FORMAÇÃO';}
  document.getElementById('finalEmoji').textContent=emoji;
  document.getElementById('finalTitle').textContent=title;
  document.getElementById('finalScore').textContent=state.score;
  document.getElementById('finalTime').textContent=Math.round(elapsed)+'s';
  document.getElementById('finalCombo').textContent=state.maxCombo;
  renderRanking();
  document.getElementById('recapT').textContent='Você dominou '+LP_PHASES.length+' conceitos · 🏆 '+unlocked.size+' conquistas';
  document.getElementById('recap').innerHTML=LP_PHASES.map(p=>'<span>'+p[0]+' '+p[1]+'</span>').join('');
  document.getElementById('finalModal').classList.add('show');
  levelUpSound();burst(innerWidth*0.5,innerHeight*0.35,100);
  setBanner('MISSÃO CUMPRIDA! Você treinou, interpretou e enganou a IA. Isso é ciência de dados.','ok');
  updateStagePips();
}

const RANK_KEY='iaTeresina_ranking_v7';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function getRanking(){try{return JSON.parse(localStorage.getItem(RANK_KEY))||[];}catch(e){return[];}}
function saveRanking(list){try{localStorage.setItem(RANK_KEY,JSON.stringify(list.slice(0,10)));}catch(e){}}
function renderRanking(){
  const list=getRanking();const el=document.getElementById('rankList');
  if(!list.length){el.innerHTML='<div style="text-align:center;color:#5d7196;font-size:12px;padding:10px">Nenhuma pontuação ainda.</div>';return;}
  el.innerHTML=list.map((r,i)=>`<div class="rank-item"><span class="pos">${i+1}º</span><span class="nm">${esc(r.n)}</span><span class="sc">${r.s}</span><span class="tm">${r.t}s</span></div>`).join('');
}
document.getElementById('btnSaveRank').addEventListener('click',()=>{
  const inp=document.getElementById('initialsInput');
  const nm=(inp.value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3);
  if(nm.length<2){inp.focus();return;}
  const elapsed=Math.round(playTime());
  const list=getRanking();
  list.push({n:nm,s:state.score,t:elapsed});
  list.sort((a,b)=>b.s-a.s||a.t-b.t);
  saveRanking(list);renderRanking();
  document.getElementById('initialsRow').style.display='none';
  coinSound();
});

document.querySelectorAll('.js-start').forEach(b=>b.addEventListener('click',()=>{
  state.t0=performance.now();state.pausedMs=0;state.pauseT=0;
  keepAwake();initAudio();document.getElementById('splashScreen').classList.remove('show');
  later(()=>beginStage(1,()=>showEdu('regression',startPhase1Real)),100);
}));
document.getElementById('btnMath').addEventListener('click',()=>{initAudio();document.getElementById('mathModal').classList.add('show');updateHUD();});
document.getElementById('closeMath').addEventListener('click',()=>{document.getElementById('mathModal').classList.remove('show');});
document.getElementById('mathModal').addEventListener('click',e=>{if(e.target.id==='mathModal')e.currentTarget.classList.remove('show');});
document.getElementById('msBody').addEventListener('click',()=>{initAudio();document.getElementById('mathModal').classList.add('show');updateHUD();});
document.getElementById('btnMute').addEventListener('click',e=>{muted=!muted;e.currentTarget.textContent=muted?'🔇':'🔊';});
let rstT=0;
document.getElementById('btnReset').addEventListener('click',e=>{const b=e.currentTarget;
  if(rstT){clearTimeout(rstT);rstT=0;b.textContent='↻';resetGame(false);return;}
  b.textContent='⚠';toast('Reiniciar a partida?','Toque de novo em ⚠ para confirmar');
  rstT=setTimeout(()=>{rstT=0;b.textContent='↻';},2600);});
document.getElementById('btnNextPlayer').addEventListener('click',()=>resetGame(true));
document.getElementById('btnUndoHack').addEventListener('click',undoHack);
document.getElementById('btnClearHack').addEventListener('click',clearHack);

/* LANDING */
const LP_PHASES=[['✏️','Calibração','Arraste a reta e minimize o EQM.'],['🎯','Caçador de erros','Ache o maior resíduo e calcule-o.'],['🚨','Outlier','Um sensor anômalo distorce a cidade.'],['📉','Gradiente','Qual curva tem o menor erro?','BOSS'],['🗺️','Cartógrafo','Colete a periferia e vença o viés.'],['📊','Intérprete','O que significa o coeficiente a?'],['🔮','Previsão','Calcule ŷ para x = 18%.'],['💀','Engane a IA','Dados falsos com alta alavancagem.','HACK']];
(function(){
  document.getElementById('lpGrid').innerHTML=LP_PHASES.map((p,i)=>`<div class="lp-card rv"><div class="n">FASE ${String(i+1).padStart(2,'0')}</div><div class="ic">${p[0]}</div><b>${p[1]}${p[3]?`<i class="bd ${p[3]==='HACK'?'hk':''}">${p[3]}</i>`:''}</b><span>${p[2]}</span></div>`).join('');
  const sp=document.getElementById('splashScreen');
  sp.querySelectorAll('[data-t]').forEach(a=>{const go=e=>{e.preventDefault();const t=document.getElementById(a.dataset.t);if(t)t.scrollIntoView({behavior:'smooth',block:'start'});};a.addEventListener('click',go);a.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')go(e);});});
  const items=sp.querySelectorAll('.rv');
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}}),{root:sp,threshold:.12});items.forEach(el=>io.observe(el));}
  else items.forEach(el=>el.classList.add('in'));
})();
function lpEnter(){
  const sp=document.getElementById('splashScreen');sp.style.scrollBehavior='auto';sp.scrollTop=0;sp.style.scrollBehavior='';
  const list=getRanking(),el=document.getElementById('lpRankList');
  el.innerHTML=list.length?list.map((r,i)=>`<div class="rank-item"><span class="pos">${i+1}º</span><span class="nm">${esc(r.n)}</span><span class="sc">${r.s}</span><span class="tm">${r.t}s</span></div>`).join(''):'<div style="color:#5d7196;font-size:13px">Nenhuma pontuação ainda — seja o primeiro!</div>';
}

/* ESTANDE */
let lastAct=performance.now();
['pointerdown','pointermove','keydown','touchstart'].forEach(ev=>addEventListener(ev,()=>{lastAct=performance.now();},{passive:true}));
setInterval(()=>{
  if(document.getElementById('splashScreen').classList.contains('show'))return;
  const fin=document.getElementById('finalModal').classList.contains('show');
  if(performance.now()-lastAct>(fin?45000:100000))resetGame(true);
},5000);
let wl=null;
async function keepAwake(){try{if('wakeLock' in navigator&&!wl){wl=await navigator.wakeLock.request('screen');wl.addEventListener('release',()=>{wl=null;});}}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')keepAwake();});
document.getElementById('btnFull').addEventListener('click',()=>{const d=document;if(!d.fullscreenElement){(d.documentElement.requestFullscreen||(()=>Promise.resolve())).call(d.documentElement).catch(()=>{});}else if(d.exitFullscreen)d.exitFullscreen();});
document.getElementById('initialsInput').addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btnSaveRank').click();});

resetGame(true);