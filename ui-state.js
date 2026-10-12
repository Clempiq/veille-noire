import {weaponLock} from './progression.js';
import {WEAPONS,ENEMIES} from './content.js';
import {active,neighbors,edgeKey,moveCost,escapeCost,attackable,searchesLeft,weaponDamage,weaponDice,weaponThreshold,equipCost,tactical,canExtract} from './engine.js';

export function closedDoors(s,h=active(s)){
 return neighbors(s,h.zone,true).filter(z=>s.map.edges[edgeKey(h.zone,z)]==='closed');
}
export function targetReason(s,h,e){
 if(s.status!=='playing')return 'Cette expédition est terminée.';
 if(weaponLock(h,h.weapon))return weaponLock(h,h.weapon);
 if(!e)return 'Aucune cible ici.';
 if(!attackable(s,h,e))return 'Hors de portée ou ligne de vue bloquée.';
 if(e.type==='cantor'&&!s.objectives.every(o=>o.done))return 'Désactivez les deux résonateurs pour briser sa protection.';
 if(weaponDamage(h)<ENEMIES[e.type].armor)return `Puissance ${weaponDamage(h)}, armure ${ENEMIES[e.type].armor} : équipez une arme plus puissante.`;
 if(WEAPONS[h.weapon].ammo&&!(h.ammo[h.weapon]>0))return 'Chargeur vide. Rechargez depuis le sac.';
 if(h.ap<1)return 'Plus d’actions. Choisissez un autre survivant.';
 return '';
}
export function attackOdds(s,h=active(s)){
 const failures=(weaponThreshold(h)-1)/6,dice=weaponDice(s,h),reroll=h.id==='jonas'&&!h.rerolled?1:0;
 return Math.round((1-Math.pow(failures,dice+reroll))*100);
}
export function actionInfo(s,type,h=active(s)){
 const w=WEAPONS[h.weapon],enemyHere=s.enemies.some(e=>e.zone===h.zone),objective=s.objectives.find(o=>o.zone===h.zone&&!o.done);
 let cost=1,reason='';
 if(type==='move'){
  cost=Math.min(...neighbors(s,h.zone).map(z=>moveCost(s,h,z)),1+escapeCost(s,h));
  if(!neighbors(s,h.zone).some(z=>moveCost(s,h,z)<=h.ap))reason='Aucun déplacement accessible avec vos actions restantes.';
 }else if(type==='door'){
  cost=h.id==='lina'&&!h.freeDoor?0:1;
  if(!closedDoors(s,h).length)reason='Aucune porte fermée à côté de ce survivant.';
 }else if(type==='attack'){
  if(w.ammo&&!(h.ammo[h.weapon]>0))reason='Chargeur vide. Rechargez depuis le sac.';
  else if(!s.enemies.some(e=>attackable(s,h,e)))reason='Aucun ennemi dans la portée et la ligne de vue de votre arme.';
  else if(!s.enemies.some(e=>!targetReason(s,h,e)))reason='Les cibles à portée résistent à cette arme ou sont protégées.';
 }else if(type==='search'){
  cost=s.event?.effect==='cache'&&!s.cacheUsed?0:1;
  if(enemyHere)reason='Éliminez les ennemis dans votre zone avant de fouiller.';
  else if(s.map.zones[h.zone].room<0)reason='Entrez dans un bâtiment pour fouiller.';
  else if(searchesLeft(h)<=0)reason='Fouille déjà utilisée pour cette manche.';
  else if(s.map.zones[h.zone].loot<=0)reason='Les réserves de cette zone sont épuisées.';
  else if(h.inventory.length>=8)reason='Sac plein : transmettez ou abandonnez un objet.';
 }else if(type==='interact'){
  cost=objective?.kind==='seal'?2:1;
  if(!objective)reason='Rejoignez un objectif orange encore actif.';
  else if(enemyHere)reason='Éliminez les ennemis dans la zone de l’objectif.';
 }else {reason='Action indisponible.';}
 if(h.ap<cost)reason=`Il faut ${cost} action${cost>1?'s':''}. ${h.ap===0?'Choisissez un autre survivant.':'Il vous en reste '+h.ap+'.'}`;
 if(h.hp<=0)reason='Ce survivant est à terre.';
 if(s.status!=='playing')reason='Cette expédition est terminée.';
 return {cost,reason,enabled:!reason};
}
export function phaseSummary(before,after){
 if(after.lastPhase)return savedPhaseSummary(after);
 const oldIds=new Set(before.enemies.map(e=>e.id));
 return {
  moved:after.enemies.filter(e=>oldIds.has(e.id)&&before.enemies.find(x=>x.id===e.id).zone!==e.zone).length,
  spawned:after.enemies.filter(e=>!oldIds.has(e.id)).length,
  wounded:after.heroes.filter(h=>h.hp<before.heroes.find(x=>x.id===h.id).hp).map(h=>({id:h.id,lost:before.heroes.find(x=>x.id===h.id).hp-h.hp})),
  newRound:after.round,event:after.event
 };
}
export function savedPhaseSummary(s){
 if(!s.lastPhase)return null;
 const injuries=new Map();for(const x of s.lastPhase.steps)if(x.kind==='attack'&&x.damage>0)injuries.set(x.hero,(injuries.get(x.hero)||0)+x.damage);
 return {moved:new Set(s.lastPhase.steps.filter(x=>x.kind==='move').map(x=>x.enemy)).size,spawned:s.lastPhase.spawned||0,wounded:[...injuries].map(([id,lost])=>({id,lost})),newRound:s.round,event:s.event,draws:s.lastPhase.draws||[]};
}

export const shouldShowDiscovery=(action,state)=>['search','interact'].includes(action.type)&&!!state.lastDiscovery;

// V1.8 · Fin de tour automatique.
// Talents gratuits encore jouables à 0 action : on les signale au lieu de bloquer la fin automatique.
export function freeTalents(s,h){
 if(!h||h.hp<=0||s.status!=='playing')return [];
 const out=[];
 if(neighbors(s,h.zone).some(z=>moveCost(s,h,z)===0))out.push('se déplacer');
 if(h.id==='lina'&&!h.freeDoor&&closedDoors(s,h).length)out.push('ouvrir une porte');
 if(tactical(s)&&equipCost(s,h)===0&&h.inventory.some(i=>WEAPONS[i]&&i!==h.weapon))out.push('changer d’arme');
 return out;
}
// Renvoie null tant que le tour ne doit pas se terminer seul, sinon la cible et les talents gratuits restants.
// solo : toute l'escouade debout est à 0 action. En ligne (heroId fourni) : seul le survivant du joueur compte.
export function autoEndPlan(s,heroId){
 if(!s||s.status!=='playing')return null;
 if(heroId){
  const h=s.heroes.find(x=>x.id===heroId);
  if(!h||h.hp<=0||h.ap>0)return null;
  return {scope:'turn',free:freeTalents(s,h).map(what=>({hero:h.id,what}))};
 }
 const standing=s.heroes.filter(h=>h.hp>0);
 if(!standing.length||standing.some(h=>h.ap>0)||canExtract(s))return null;
 return {scope:'round',free:standing.flatMap(h=>freeTalents(s,h).map(what=>({hero:h.id,what})))};
}
