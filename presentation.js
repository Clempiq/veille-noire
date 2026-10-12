import {XP_STEPS,balanced,BALANCED_XP} from './progression.js';
export const LEVELS=[
 {xp:0,name:'Frémissement',color:'#82b8d6',bonus:'Talent personnel · 3 actions'},
 {xp:6,name:'Résonance',color:'#e1cc77',bonus:'+1 action par manche'},
 {xp:16,name:'Déferlement',color:'#e6a06b',bonus:'+1 dé à chaque attaque'},
 {xp:30,name:'Submersion',color:'#eb8b89',bonus:'Seuil de touche réduit de 1'},
 {xp:50,name:'Ascendance',color:'#c0a3ef',bonus:'+1 action par manche'},
 {xp:75,name:'Légende',color:'#f4d58c',bonus:'+1 dé à chaque attaque'}
];
export function survivorLevel(h){
 const index=h.evolution===1?(balanced(h)?BALANCED_XP:XP_STEPS).filter(x=>h.xp>=x).length-1:h.xp>=30?3:h.xp>=16?2:h.xp>=6?1:0,levels=balanced(h)?BALANCED_LEVELS:LEVELS,current=levels[index],next=h.evolution!==1&&index===3?null:levels[index+1];
 return {...current,index,number:index+1,next:next?.xp??null,progress:next?Math.min(100,(h.xp-current.xp)/(next.xp-current.xp)*100):100};
}
// Preserve chronological dependencies: a creature can appear only once per beat.
export function phaseBeats(steps=[]){
 const beats=[];let beat,seen;
 for(const step of steps){
  if(!['move','attack','spawn'].includes(step.kind))continue;
  if(!beat||beat.kind!==step.kind||beat.extra!==!!step.extra||beat.pass!==(step.pass||0)||seen.has(step.enemy)){
   beat={kind:step.kind,extra:!!step.extra,pass:step.pass||0,steps:[]};beats.push(beat);seen=new Set();
  }
  beat.steps.push(step);seen.add(step.enemy);
 }
 return beats;
}
export function groupPieces(units){
 const groups=new Map();
 for(const u of units){const key=u.zone+':'+u.type;if(!groups.has(key))groups.set(key,{zone:u.zone,type:u.type,count:0});groups.get(key).count++;}
 return [...groups.values()];
}

export const BALANCED_LEVELS=LEVELS.map((l,i)=>({...l,xp:BALANCED_XP[i],bonus:['Talent de départ · 3 actions','+1 action par manche (4 au total)','Choisir une spécialisation parmi 2','Choisir une maîtrise parmi 3','Choisir la seconde spécialisation','Choisir une autre maîtrise'][i]}));
