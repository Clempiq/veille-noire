import {phaseBeats,groupPieces} from './presentation.js';
import {HEROES} from './content.js';

export async function animateSurvivors(board,before,after,portrait){
 if(!board)return;
 const moved=after.heroes.filter(h=>before.heroes.some(old=>old.id===h.id&&old.zone!==h.zone));if(!moved.length)return;
 const layer=document.createElement('div');layer.className='survivor-glide';layer.setAttribute('aria-hidden','true');board.append(layer);
 const hidden=[],effects=[];const size={w:board.clientWidth/8,h:board.clientHeight/6};
 try{for(const h of moved){const old=before.heroes.find(x=>x.id===h.id),d=HEROES.find(x=>x.id===h.id);layer.insertAdjacentHTML('beforeend',portrait(d));const ghost=layer.lastElementChild;
 const point=z=>({x:((z%8)+.5)*size.w-15,y:(Math.floor(z/8)+.5)*size.h-15});const a=point(old.zone),b=point(h.zone);
 const target=board.querySelector(`[data-id="${h.zone}"] .hero-piece`);if(target&&after.heroes.filter(x=>x.zone===h.zone).length===1){target.style.opacity='0';hidden.push(target);}
 effects.push(ghost.animate([{transform:`translate(${a.x}px,${a.y}px)`},{transform:`translate(${b.x}px,${b.y}px)`}],{duration:420,easing:'cubic-bezier(.25,.6,.3,1)',fill:'forwards'}));
 }await wait(440);}finally{effects.forEach(a=>a.cancel());hidden.forEach(el=>el.style.opacity='');layer.remove();}
}
export function showWounds(before,after){
 const messages=after.heroes.flatMap(h=>{const old=before.heroes.find(x=>x.id===h.id);if(!old)return [];const damage=after.round>before.round?after.lastPhase?.steps.filter(x=>x.kind==='attack'&&x.hero===h.id).reduce((sum,x)=>sum+x.damage,0)||0:Math.max(0,old.hp-h.hp);const healed=Math.max(0,h.hp-old.hp);return damage?[{id:h.id,text:'−'+damage+' PV',heal:false}]:healed?[{id:h.id,text:'+'+healed+' PV',heal:true}]:[];});
 if(!messages.length)return;document.querySelector('.wound-summary')?.remove();const el=document.createElement('div');el.className='wound-summary';el.setAttribute('role','status');el.innerHTML=messages.map(x=>`<span class="${x.heal?'healing':''}">${HEROES.find(h=>h.id===x.id).name.split(' ')[0]} ${x.text}</span>`).join('');document.body.append(el);setTimeout(()=>el.remove(),3600);
}

export function diceFace(n,hit=false){
 const dots={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[n]||[];
 return `<span class="rolled-die ${hit?'hit':''}" role="img" aria-label="Dé ${n}${hit?', succès':''}">${Array.from({length:9},(_,i)=>`<i class="${dots.includes(i)?'pip':''}"></i>`).join('')}</span>`;
}
const wait=(ms,signal)=>new Promise(resolve=>{
 if(signal?.aborted)return resolve();
 const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',done);resolve();};
 const timer=setTimeout(done,ms);signal?.addEventListener('abort',done,{once:true});
});
export async function animateDice(roll){
 const tray=document.createElement('div');tray.className='attack-cinema';tray.setAttribute('role','status');
 tray.innerHTML=`<small>JET D’ATTAQUE</small><strong>${roll.weapon}</strong><div class="rolling-dice">${roll.rolls.map(n=>diceFace(n,n>=roll.threshold)).join('')}</div><p>${roll.hits} succès · ${roll.kills} éliminé${roll.kills>1?'s':''}${roll.reroll?' · relance de Jonas':''}</p>`;
 document.body.append(tray);
 const effects=[...tray.querySelectorAll('.rolled-die')].map((die,i)=>die.animate?.([
  {transform:'translateY(-20px) rotate(-150deg) scale(.6)',opacity:0},
  {transform:'translateY(5px) rotate(18deg) scale(1.08)',opacity:1,offset:.7},
  {transform:'translateY(0) rotate(0) scale(1)',opacity:1}
 ],{duration:650,delay:i*35,easing:'cubic-bezier(.2,.6,.3,1)',fill:'both'}));
 // Keep the final faces readable for 1.2 seconds after the last die settles.
 try{await wait(650+Math.max(0,roll.rolls.length-1)*35+1200);}finally{effects.forEach(a=>a?.cancel());tray.remove();}
}

export async function animatePhase(board,before,after,portrait,{signal}={}){
 if(!board)return;
 const units=new Map(before.enemies.map(e=>[e.id,{...e}]));
 const all=phaseBeats(after.lastPhase?.steps),beats=all.slice(0,20),layer=document.createElement('div'),banner=document.createElement('div');
 layer.className='phase-layer';layer.setAttribute('aria-hidden','true');
 banner.className='phase-banner';banner.innerHTML='<span><small>PHASE DU CHŒUR</small><strong>La horde s’éveille…</strong></span><button type="button">Passer l’animation</button>';
 banner.setAttribute('role','status');banner.querySelector('button').onclick=()=>document.dispatchEvent(new CustomEvent('skip-phase'));
 board.classList.add('phase-playing');board.append(layer);document.body.append(banner);
 board.scrollIntoView({block:'center',behavior:'auto'});
 const pending=new Set();
 const point=(zone,type)=>{const width=board.clientWidth/8,height=board.clientHeight/6,offset={drowned:[-.12,0],runner:[.13,-.13],bell:[.13,.16],cantor:[0,0]}[type];return {x:((zone%8)+.5+offset[0])*width,y:(Math.floor(zone/8)+.5+offset[1])*height};};
 const token=(g,extra='')=>{const el=document.createElement('span'),p=point(g.zone,g.type);el.className='phase-token '+extra;el.style.transform=`translate(${p.x}px,${p.y}px)`;el.innerHTML=`${portrait(g.type)}<b>${g.count}</b>`;layer.append(el);return el;};
 const paint=(skip=new Set())=>{layer.replaceChildren();groupPieces([...units.values()].filter(e=>!skip.has(e.id))).forEach(g=>token(g));};
 const animate=(el,frames,options)=>{const effect=el.animate?.(frames,options);if(effect)pending.add(effect);};
 try{
  paint();await wait(200,signal);
  for(const [index,beat]of beats.entries()){
   if(signal?.aborted)break;
   banner.querySelector('strong').textContent=(beat.extra?'Activation surprise · ':beat.pass===1?'Écorchés · 2e action · ':'1re action · ')+({move:'Les ennemis avancent',attack:'Les ennemis attaquent',spawn:'Des renforts apparaissent'}[beat.kind])+` · ${index+1}/${beats.length}`;
   if(beat.kind==='move'){
    const ids=new Set(beat.steps.map(s=>s.enemy));paint(ids);
    const groups=new Map();for(const s of beat.steps){const key=s.type+':'+s.from+':'+s.to;if(!groups.has(key))groups.set(key,{...s,count:0});groups.get(key).count++;}
    for(const g of groups.values()){
     const el=token({zone:g.from,type:g.type,count:g.count},'travelling'),a=point(g.from,g.type),b=point(g.to,g.type);
     animate(el,[{transform:`translate(${a.x}px,${a.y}px)`},{transform:`translate(${b.x}px,${b.y}px)`}],{duration:440,easing:'ease-in-out',fill:'forwards'});
    }
    await wait(470,signal);for(const s of beat.steps)units.set(s.enemy,{id:s.enemy,type:s.type,zone:s.to});
   }else if(beat.kind==='spawn'){
    for(const s of beat.steps)units.set(s.enemy,{id:s.enemy,type:s.type,zone:s.zone});paint();
    for(const z of new Set(beat.steps.map(s=>s.zone))){const cell=board.querySelector(`[data-id="${z}"]`);if(cell)animate(cell,[{boxShadow:'inset 0 0 0 5px #e6a06b',filter:'brightness(1.6)'},{boxShadow:'inset 0 0 0 0 transparent',filter:'brightness(1)'}],{duration:440});}
    await wait(450,signal);
   }else{
    paint();const damage=new Map();for(const s of beat.steps)damage.set(s.zone,(damage.get(s.zone)||0)+s.damage);
    for(const [zone,n]of damage){const p=point(zone,'drowned'),el=document.createElement('b');el.className='phase-damage';el.style.left=p.x+'px';el.style.top=p.y+'px';el.textContent=n?'−'+n+' PV':'Protégé';layer.append(el);animate(el,[{transform:'translate(-50%,0) scale(.7)',opacity:0},{transform:'translate(-50%,-15px) scale(1)',opacity:1,offset:.3},{transform:'translate(-50%,-22px)',opacity:1}],{duration:500,fill:'forwards'});}
    await wait(570,signal);
   }
   pending.forEach(a=>a.cancel());pending.clear();paint();
  }
  if(!signal?.aborted&&all.length>20){banner.querySelector('strong').textContent='Suite de la phase condensée dans le bilan';await wait(200,signal);}
 }finally{pending.forEach(a=>a.cancel());layer.remove();banner.remove();board.classList.remove('phase-playing');}
}
