import {TALENTS,POWERS,hasTalent,talentPool,talentSlots,maxEther,heroRank,balanced,availableTalents,validTalentSequence,weaponLock,powerLock,powerInfo} from './progression.js';
import {HEROES,WEAPONS,ITEMS,ENEMIES,MISSIONS,EVENTS,ROOM_NAMES} from './content.js';
import {SPAWN_CARDS,drawSpawn} from './spawn-deck.js';
import {exchangeReason,transferExchange} from './exchange.js';
export const tactical=s=>s.ruleset===2;
export const WIDTH=8,HEIGHT=6;
export const edgeKey=(a,b)=>[a,b].sort((x,y)=>x-y).join('-');
export const xy=z=>({x:z%WIDTH,y:Math.floor(z/WIDTH)});
export const distance=(a,b)=>{a=xy(a);b=xy(b);return Math.abs(a.x-b.x)+Math.abs(a.y-b.y)};
export function createMap(mission=0){
 const variant=MISSIONS[mission]?.layoutBase;
 if(variant!==undefined){
  const base=createMap(variant),mirror=z=>Math.floor(z/8)*8+7-z%8;
  return {zones:base.zones.map(z=>({...z,id:mirror(z.id)})).sort((a,b)=>a.id-b.id),edges:Object.fromEntries(Object.entries(base.edges).map(([key,value])=>[edgeKey(...key.split('-').map(Number).map(mirror)),value]))};
 }
 const layouts=[
  [[9,10,17,18],[12,13,20,21],[25,26,33,34],[28,29,36,37]],
  [[9,10,17,18],[12,13,20,21],[25,26,33,34],[27,28,29,35,36,37]],
  [[9,10,11,17,18,19],[12,13,20,21],[25,26,33,34],[28,29,36,37]],
  [[9,10,17,18],[12,13,14,20,21,22],[25,26,33,34],[28,29,36,37]],
  [[9,10],[12,13,20,21],[25,26,33,34],[28,29]],
  [[9,10],[12,13],[18,19,20,26,27,28],[36,37]]
 ];
 const rooms=layouts[mission]||layouts[0];
 const zones=Array.from({length:48},(_,id)=>({id,room:rooms.findIndex(r=>r.includes(id)),name:'QUAI',loot:2}));
 for(const z of zones)if(z.room>=0)z.name=ROOM_NAMES[(z.room+mission)%ROOM_NAMES.length];
 const edges={};for(let a=0;a<48;a++)for(const b of [a+1,a+8])if(b<48&&distance(a,b)===1){const ra=zones[a].room,rb=zones[b].room;edges[edgeKey(a,b)]=ra===rb?'open':ra>=0||rb>=0?'wall':'open';}
 const entrances=[[[1,9],[10,11],[4,12],[21,22],[24,25],[34,42],[27,28],[37,45]],[[1,9],[10,11],[4,12],[21,22],[24,25],[34,42],[19,27],[37,45]],[[1,9],[19,27],[4,12],[21,22],[24,25],[34,42],[27,28],[37,45]],[[1,9],[10,11],[4,12],[22,23],[24,25],[34,42],[27,28],[37,45]],[[1,9],[10,18],[4,12],[21,22],[24,25],[34,42],[27,28],[29,37]],[[1,9],[10,11],[4,12],[13,14],[17,18],[25,26],[20,21],[28,29],[35,36],[37,45]]][mission]||[];
 for(const [a,b]of entrances)if(edges[edgeKey(a,b)]==='wall')edges[edgeKey(a,b)]='closed';
 return {zones,edges};
}
export function rng(s,n){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return Math.floor(s.seed/4294967296*n)}
export const active=s=>s.heroes.find(h=>h.id===s.active);
export const maxAP=h=>balanced(h)?3+(h.xp>=7?1:0):3+(h.xp>=6?1:0)+(h.evolution===1&&h.xp>=50?1:0);
export const tier=s=>Math.max(0,...s.heroes.map(h=>balanced(h)?Math.min(3,heroRank(h)):h.xp>=30?3:h.xp>=16?2:h.xp>=6?1:0));
export const levelName=s=>['Frémissement','Résonance','Déferlement','Submersion'][tier(s)];
export function log(s,text,type='info'){s.log.unshift({round:s.round,text,type});s.log=s.log.slice(0,90)}
export function addEnemy(s,type,zone){s.enemies.push({id:'e'+s.nextId++,type,zone,hp:ENEMIES[type].hp})}
export function createGame(mission=0,heroIds=['lina','malik','iris','basile'],difficulty='normal',seed=Date.now(),ruleset=2,balance=1,content=1){
 const m=MISSIONS[mission];if(!m)throw Error('Mission inconnue');
 const ids=[...new Set(heroIds)].filter(id=>HEROES.some(h=>h.id===id));if(ids.length<2||ids.length>4)throw Error('Choisissez de deux à quatre survivants.');
 const s={version:1,mission,difficulty,seed:seed>>>0,nextId:1,round:1,phase:'heroes',status:'playing',map:createMap(mission),heroes:ids.map(id=>{const h=HEROES.find(x=>x.id===id);return {id,zone:m.start,hp:h.hp,xp:0,ap:3,weapon:h.weapon,inventory:[h.weapon,'medkit',...(id==='malik'?['medkit']:[]),'ammo'],ammo:{[h.weapon]:WEAPONS[h.weapon].ammo||0},searched:false,searchCount:0,rerolled:false,freeMove:false,freeDoor:false,healed:false,shield:false,aim:false,bleed:0,kills:0}}),active:ids[0],enemies:[],noise:{},objectives:m.objectives.map(o=>({...o,done:false})),revealed:[],sealed:[],escort:null,hold:0,bossKilled:false,log:[],lastRoll:null,event:null,cacheUsed:false,stats:{kills:0,searches:0,rounds:1},startedAt:Date.now()};
 s.ruleset=ruleset;
 if(ruleset===2&&balance===1&&content===1){s.content=1;for(const h of s.heroes){h.focusUsed=false;h.swapUsed=false;}}
 if(ruleset===2){s.expansion=1;s.relicClaimed=false;for(const h of s.heroes){h.evolution=1;h.talents=[];h.ether=3;h.ward=0;if(balanced(h)){h.powerUsed=false;h.pushUsed=false;}h.swiftUsed=false;h.guardUsed=false;}}
 if(ruleset===2&&balance===1){s.balance=1;for(const h of s.heroes){h.balance=1;h.powerUsed=false;h.pushUsed=false;}}
 if(tactical(s)){s.spawnDeck=[];s.lastPhase=null;}
 for(const zone of m.spawns)addEnemy(s,'drowned',zone);
 if(mission>0&&m.opening!=='light'){addEnemy(s,'runner',m.spawns[0]);addEnemy(s,'bell',m.spawns[1]);}
 if(m.boss!==undefined)addEnemy(s,'cantor',m.boss);
 if(mission===5){const h=s.heroes[0];h.inventory.push('harpoon');h.ammo.harpoon=4;}
 log(s,'L’expédition entre dans '+m.subtitle.toLowerCase()+'.');return s;
}
export function neighbors(s,z,doors=false){return [z-8,z+8,z-1,z+1].filter(b=>b>=0&&b<48&&distance(z,b)===1&&['open',...(doors?['closed']:[])].includes(s.map.edges[edgeKey(z,b)]))}
export function path(s,from,to){const queue=[[from]],seen=new Set([from]);while(queue.length){const p=queue.shift(),end=p.at(-1);if(end===to)return p;for(const n of neighbors(s,end))if(!seen.has(n)){seen.add(n);queue.push([...p,n]);}}return null;}
export function visible(s,from,to,range=99){if(from===to)return true;if(distance(from,to)>range)return false;const a=xy(from),b=xy(to);if(a.x!==b.x&&a.y!==b.y)return false;const step=a.x===b.x?(to>from?8:-8):(to>from?1:-1);for(let z=from;z!==to;z+=step)if(s.map.edges[edgeKey(z,z+step)]!=='open')return false;return true;}
export function escapeCost(s,h){const n=s.enemies.filter(e=>e.zone===h.zone).length;return tactical(s)?n:Math.min(1,n);}
export function moveCost(s,h,to){if(!neighbors(s,h.zone).includes(to))return Infinity;return ((h.id==='iris'||balanced(h)&&h.id==='silene')&&!h.freeMove||hasTalent(h,'swift')&&!h.swiftUsed?0:1)+escapeCost(s,h)}
export function weaponRange(s,h){const w=WEAPONS[h.weapon];const r=w.range+(balanced(h)&&h.id==='maelys'&&w.magic?1:0)+(h.id==='tess'&&w.kind==='ranged'?1:0)+(hasTalent(h,'reach')&&w.kind==='ranged'?1:0);return s.event?.effect==='fog'?Math.min(2,r):r;}
export function weaponNoise(h){return Math.max(0,WEAPONS[h.weapon].noise-(balanced(h)&&h.id==='orso'?1:0)-(h.id==='noor'?2:0)-(hasTalent(h,'silent')?2:0));}
export function weaponDice(s,h){return (tactical(s)&&h.weapon==='bow'?1:WEAPONS[h.weapon].dice)+(!balanced(h)&&h.xp>=16?1:0)+(!balanced(h)&&h.evolution===1&&h.xp>=75?1:0)+(hasTalent(h,'barbarian')&&WEAPONS[h.weapon].kind==='melee'?Math.max(0,Math.min(6,s.enemies.filter(e=>e.zone===h.zone).length)-WEAPONS[h.weapon].dice):0)+(hasTalent(h,'brawler')&&WEAPONS[h.weapon].kind==='melee'?1:0);}
export function weaponThreshold(h){return Math.max(2,WEAPONS[h.weapon].hit-(openingShot(h)?1:0)-(!balanced(h)&&h.xp>=30?1:0)-(hasTalent(h,'marksman')&&WEAPONS[h.weapon].kind==='ranged'?1:0));}
export const equipCost=(s,h=active(s))=>tactical(s)&&!hasTalent(h,'quickdraw')&&!(balanced(h)&&h.id==='mira'&&!h.swapUsed)?1:0;
// focusUsed also survives reloads of V1.7 saves; the former aim flag is ignored.
export const openingShot=h=>balanced(h)&&h.id==='sacha'&&!h.focusUsed&&WEAPONS[h.weapon].kind==='ranged';
export const weaponDamage=h=>WEAPONS[h.weapon].damage+(hasTalent(h,'crusher')&&WEAPONS[h.weapon].kind==='melee'?1:0);
export function searchesLeft(h){return Math.max(0,(h.id==='ada'?2:1)-(h.searchCount??(h.searched?1:0)));}
export function attackable(s,h,e){const w=WEAPONS[h.weapon];return w.kind==='melee'?h.zone===e.zone:visible(s,h.zone,e.zone,weaponRange(s,h));}
export function objectivesReady(s){return s.objectives.every(o=>o.done)&&(MISSIONS[s.mission].type!=='defend'||s.hold>=MISSIONS[s.mission].hold)&&(MISSIONS[s.mission].type!=='boss'||s.bossKilled)}
export function canExtract(s){return objectivesReady(s)&&s.heroes.every(h=>h.hp>0&&h.zone===MISSIONS[s.mission].exit)&&(!s.escort||s.escort.zone===MISSIONS[s.mission].exit)&&!s.enemies.some(e=>e.zone===MISSIONS[s.mission].exit)}
function spend(h,n=1){if(h.ap<n)throw Error('Pas assez d’actions disponibles.');h.ap-=n;}
function noise(s,z,n){s.noise[z]=(s.noise[z]||0)+n}
function grantXP(s,h,n){const old=maxAP(h),rank=heroRank(h),choices=talentSlots(h);h.xp+=n;h.ap+=maxAP(h)-old;if(heroRank(h)>rank)log(s,HEROES.find(x=>x.id===h.id).name+' progresse'+(talentSlots(h)>choices?' : nouveau talent à choisir.':maxAP(h)>old?' : une action supplémentaire par manche.':'.'),'good');}
function damageEnemy(s,e,d,h){const def=ENEMIES[e.type];if(e.type==='cantor'&&!s.objectives.every(o=>o.done))return false;if(d<def.armor)return false;e.hp-=d;if(e.hp<=0){s.enemies=s.enemies.filter(x=>x.id!==e.id);s.stats.kills++;h.kills++;grantXP(s,h,def.xp);if(e.type==='cantor')s.bossKilled=true;return true;}return false;}
function assertFreeZone(s,h){if(s.enemies.some(e=>e.zone===h.zone))throw Error('Éliminez d’abord les ennemis présents dans cette zone.');}
function validate(s){if(s.heroes.every(h=>h.hp<=0)){s.status='lost';s.reason='L’escouade a été submergée.';}if(s.heroes.some(h=>h.bleed>=3)){s.status='lost';s.reason='Un survivant n’a pas été secouru à temps.';}if(s.round>MISSIONS[s.mission].rounds){s.status='lost';s.reason='La marée a refermé le passage.';}}
export function act(original,action){
 const s=structuredClone(original);try{
 if(s.status!=='playing')throw Error('Cette expédition est terminée.');
 const h=active(s),name=HEROES.find(x=>x.id===h.id).name.split(' ')[0];
 if(action.type==='select'){const candidate=s.heroes.find(x=>x.id===action.id);if(!candidate||candidate.hp<=0)throw Error('Ce survivant est à terre.');s.active=action.id;s.lastDiscovery=null;s.lastRoll=null;return {state:s};}
 if(action.type==='endRound'){enemyPhase(s);return {state:s};}
 if(h.hp<=0)throw Error('Sélectionnez un survivant debout.');
 s.lastDiscovery=null;s.lastRoll=null;
 switch(action.type){
 case 'talent':{if(!talentSlots(h)||!availableTalents(h).includes(action.talent)||hasTalent(h,action.talent))throw Error('Ce talent ne peut pas être choisi.');h.talents.push(action.talent);if(action.talent==='reservoir')h.ether=Math.min(maxEther(h),(h.ether||0)+2);log(s,name+' apprend '+TALENTS[action.talent].name+'.','good');break;}
 case 'power':usePower(s,h,action);break;
 case 'push':{if(balanced(h)&&h.pushUsed)throw Error('Poussée déjà utilisée cette manche.');if(!hasTalent(h,'push')||!neighbors(s,h.zone).includes(action.zone))throw Error('Choisissez une zone voisine ouverte.');const targets=s.enemies.filter(e=>e.zone===h.zone&&e.type!=='cantor');if(!targets.length)throw Error('Aucun ennemi à repousser (le Cantor résiste).');spend(h);if(balanced(h))h.pushUsed=true;for(const e of targets)e.zone=action.zone;noise(s,h.zone,2);log(s,name+' repousse '+targets.length+' ennemi(s).');break;}
 case 'exchange':{const reason=exchangeReason(s,action);if(reason)throw Error(reason);spend(h);transferExchange(s,action);log(s,`${name} échange du matériel avec ${HEROES.find(x=>x.id===action.target).name}.`);break;}
 case 'move':{const cost=moveCost(s,h,action.zone);if(!Number.isFinite(cost))throw Error('Choisissez une zone adjacente accessible.');spend(h,cost);const prev=h.zone;h.zone=action.zone;if((h.id==='iris'||balanced(h)&&h.id==='silene')&&!h.freeMove)h.freeMove=true;else if(hasTalent(h,'swift'))h.swiftUsed=true;if(s.escort?.following===h.id&&s.escort.zone===prev)s.escort.zone=h.zone;log(s,`${name} rejoint la zone ${h.zone+1}.`);break;}
 case 'door':{if(distance(h.zone,action.zone)!==1||s.map.edges[edgeKey(h.zone,action.zone)]!=='closed')throw Error('Aucune porte fermée ici.');spend(h,h.id==='lina'&&!h.freeDoor?0:1);h.freeDoor=true;s.map.edges[edgeKey(h.zone,action.zone)]='open';noise(s,h.zone,2);const room=s.map.zones[action.zone].room;if(room>=0&&!s.revealed.includes(room)){s.revealed.push(room);const cells=s.map.zones.filter(z=>z.room===room);let num=0;if(tactical(s)){const pool=[...cells];for(let i=0;i<Math.ceil(cells.length/2);i++){const cell=pool.splice(rng(s,pool.length),1)[0];num+=spawnCard(s,cell.id,{building:true});}}else{num=s.difficulty==='story'?1:1+tier(s);for(let i=0;i<num;i++)addEnemy(s,i>1?'runner':'drowned',cells[rng(s,cells.length)].id);}log(s,`La porte s’ouvre. ${num} présence${num>1?'s':''} dans le bâtiment.`,'danger');}else log(s,`${name} ouvre la porte.`);break;}
 case 'attack':{if(weaponLock(h,h.weapon))throw Error(weaponLock(h,h.weapon));const e=s.enemies.find(x=>x.id===action.enemy);if(!e||!attackable(s,h,e))throw Error('Cible hors de portée ou ligne de vue bloquée.');const w=WEAPONS[h.weapon];if(w.ammo&&!(h.ammo[h.weapon]>0))throw Error('Arme vide. Rechargez avec une boîte de munitions.');if(e.type==='cantor'&&!s.objectives.every(o=>o.done))throw Error('Les résonateurs protègent encore le Cantor.');spend(h);if(w.ammo)h.ammo[h.weapon]--;const rolls=Array.from({length:weaponDice(s,h)},()=>1+rng(s,6));const threshold=weaponThreshold(h);if(openingShot(h))h.focusUsed=true;h.aim=false;let reroll=null;if(h.id==='jonas'&&!h.rerolled){const failed=rolls.findIndex(n=>n<threshold);if(failed>=0){reroll={index:failed,from:rolls[failed]};rolls[failed]=1+rng(s,6);reroll.to=rolls[failed];h.rerolled=true;log(s,`Jonas garde son sang-froid : ${reroll.from} relancé en ${reroll.to}.`);}}const hits=rolls.filter(x=>x>=threshold).length;let kills=0;const targets=[e,...s.enemies.filter(x=>x.zone===e.zone&&x.id!==e.id)];for(let i=0;i<hits;i++){const target=targets.find(x=>s.enemies.some(y=>y.id===x.id));if(target&&damageEnemy(s,target,weaponDamage(h),h))kills++;}noise(s,h.zone,weaponNoise(h));s.lastRoll={rolls,reroll,threshold,hits,kills,weapon:w.name,blocked:weaponDamage(h)<ENEMIES[e.type].armor};log(s,`${name} · ${w.name} : ${hits} succès, ${kills} ennemi${kills>1?'s':''} éliminé${kills>1?'s':''}${weaponDamage(h)<ENEMIES[e.type].armor?' — armure résistante':''}.`,kills?'good':'combat');break;}
 case 'search':{assertFreeZone(s,h);if(s.map.zones[h.zone].room<0)throw Error('La fouille est possible dans les bâtiments.');if(searchesLeft(h)<=0)throw Error('Toutes les fouilles de ce survivant ont été utilisées pour cette manche.');if(s.map.zones[h.zone].loot<=0)throw Error('Cette zone a déjà été vidée.');if(h.inventory.length>=8)throw Error('Inventaire plein (8 objets). Échangez ou abandonnez un objet.');const free=s.event?.effect==='cache'&&!s.cacheUsed;spend(h,free?0:1);if(free)s.cacheUsed=true;h.searchCount=(h.searchCount??(h.searched?1:0))+1;h.searched=true;s.map.zones[h.zone].loot--;s.stats.searches++;const pool=tactical(s)?['medkit','medkit','ammo','ammo','ammo','ammo','flare','flare','grenade','blade','shotgun','rifle',...(tier(s)>0?['harpoon']:[])]:['medkit','ammo','ammo','flare','grenade','blade','shotgun','rifle','harpoon'];let item=pool[rng(s,pool.length)];if(s.content===1){const alternatives={blade:'pick',shotgun:'repeater',rifle:'crossbow',harpoon:'maul'};if(alternatives[item]&&rng(s,2)===1)item=alternatives[item];}if(s.expansion===1&&rng(s,100)<(balanced(h)?hasTalent(h,'scavenger')?3:1:hasTalent(h,'scavenger')?8:3))item=rareLoot(s,h);if(tactical(s)&&WEAPONS[item]&&h.inventory.includes(item))item='ammo';h.inventory.push(item);s.lastDiscovery={hero:h.id,item,source:'search',round:s.round};if(WEAPONS[item]?.ammo)h.ammo[item]=WEAPONS[item].ammo;log(s,`${name} trouve ${WEAPONS[item]?.name||{medkit:'une trousse de secours',ammo:'des munitions',flare:'un leurre sonore',grenade:'une charge thermique'}[item]}.`,'good');if(rng(s,10)===0&&!(balanced(h)&&h.id==='nael')){addEnemy(s,'drowned',h.zone);log(s,'Une silhouette remue derrière les réserves…','danger');}break;}
 case 'interact':{assertFreeZone(s,h);const o=s.objectives.find(x=>x.zone===h.zone&&!x.done);if(!o)throw Error('Aucun objectif à activer dans cette zone.');if(s.expansion===1&&!s.relicClaimed&&h.inventory.length>=8)throw Error('Une relique vous attend : libérez une place dans le sac avant cet objectif.');spend(h,o.kind==='seal'?2:1);o.done=true;if(s.expansion===1&&!s.relicClaimed){const item=rareLoot(s,h);h.inventory.push(item);if(WEAPONS[item]?.ammo)h.ammo[item]=WEAPONS[item].ammo;s.relicClaimed=true;s.lastDiscovery={hero:h.id,item,source:'objective',round:s.round};log(s,name+' découvre la relique '+WEAPONS[item].name+'.','good');}grantXP(s,h,tactical(s)?5:2);noise(s,h.zone,o.kind==='activate'?4:1);if(o.kind==='seal')s.sealed.push(o.zone);if(o.kind==='escort')s.escort={zone:h.zone,following:h.id};log(s,o.label+' : accompli.','good');break;}
 case 'rest':spend(h);h.ap=0;log(s,`${name} termine son activation.`);break;
 case 'heal':{if(h.id!=='malik'||h.healed)throw Error('Soin de terrain indisponible.');const target=s.heroes.find(x=>x.id===(action.target||h.id));if(!target||target.zone!==h.zone||target.hp<=0)throw Error('Choisissez un allié debout dans votre zone.');if(target.hp>=HEROES.find(x=>x.id===target.id).hp)throw Error('Ce survivant est déjà en pleine santé.');spend(h);target.hp=Math.min(HEROES.find(x=>x.id===target.id).hp,target.hp+2+(hasTalent(h,'healer')?(balanced(h)?1:2):0));h.healed=true;log(s,'Malik prodigue les premiers soins.','good');break;}
 case 'equip':{if(weaponLock(h,action.item))throw Error(weaponLock(h,action.item));if(!h.inventory.includes(action.item)||!WEAPONS[action.item])throw Error('Arme indisponible.');if(action.item===h.weapon)throw Error('Cette arme est déjà équipée.');spend(h,equipCost(s));if(balanced(h)&&h.id==='mira')h.swapUsed=true;h.weapon=action.item;log(s,`${name} équipe ${WEAPONS[h.weapon].name}.`);break;}
 case 'use':{const idx=h.inventory.indexOf(action.item);if(idx<0)throw Error('Objet indisponible.');if(action.item==='medkit'){const target=s.heroes.find(x=>x.id===(action.target||h.id));if(!target||target.zone!==h.zone)throw Error('Le survivant doit être dans votre zone.');const max=HEROES.find(x=>x.id===target.id).hp;if(target.hp>=max)throw Error('Ce survivant est déjà en pleine santé.');spend(h);target.hp=Math.min(max,target.hp+3+(balanced(h)&&h.id==='ysee'?1:0)+(hasTalent(h,'healer')?(balanced(h)?1:2):0));target.bleed=0;log(s,`${name} soigne ${HEROES.find(x=>x.id===target.id).name}.`,'good');}else if(action.item==='ammo'){const w=WEAPONS[h.weapon];if(!w.ammo)throw Error('Cette arme n’utilise pas de munitions.');if(h.ammo[h.weapon]>=w.ammo)throw Error('Le chargeur est déjà plein.');spend(h);h.ammo[h.weapon]=w.ammo;log(s,`${name} recharge son arme.`);}else if(['flare','grenade'].includes(action.item)){const z=action.zone;if(!Number.isInteger(z)||!visible(s,h.zone,z,action.item==='flare'?3:2))throw Error('Choisissez une zone dans une ligne de vue dégagée.');spend(h);if(action.item==='flare'){noise(s,z,9);log(s,'Le leurre grésille en zone '+(z+1)+'.');}else{for(const e of [...s.enemies.filter(e=>e.zone===z)])damageEnemy(s,e,3,h);noise(s,z,6);log(s,`La charge thermique explose en zone ${z+1}.`,'combat');}}else throw Error('Objet non utilisable.');h.inventory.splice(idx,1);break;}
 case 'trade':{assertFreeZone(s,h);const target=s.heroes.find(x=>x.id===action.target);if(!target||target.id===h.id||target.zone!==h.zone||target.hp<=0)throw Error('Choisissez un allié debout dans votre zone.');const index=h.inventory.indexOf(action.item);if(index<0||target.inventory.length>=8)throw Error('Échange impossible : objet absent ou inventaire plein.');if(action.item===h.weapon)throw Error('Équipez une autre arme avant de donner celle-ci.');if(tactical(s)&&WEAPONS[action.item]&&target.inventory.includes(action.item))throw Error('Cet allié possède déjà cette arme.');spend(h);h.inventory.splice(index,1);target.inventory.push(action.item);if(WEAPONS[action.item]?.ammo)target.ammo[action.item]=h.ammo[action.item]??WEAPONS[action.item].ammo;log(s,`${name} transmet un équipement à ${HEROES.find(x=>x.id===target.id).name}.`);break;}
 case 'drop':{const idx=h.inventory.indexOf(action.item);if(idx<0||action.item===h.weapon)throw Error('Impossible d’abandonner votre arme équipée.');h.inventory.splice(idx,1);log(s,`${name} libère une place dans son sac.`);break;}
 case 'escort':{if(!s.escort||s.escort.zone!==h.zone)throw Error('Edda doit être dans votre zone.');s.escort.following=h.id;log(s,'Edda suit désormais '+name+'.');break;}
 case 'extract':if(!canExtract(s))throw Error('Accomplissez les objectifs, puis réunissez tous les survivants debout à la sortie, sans ennemi.');s.status='won';s.reason=MISSIONS[s.mission].debrief;log(s,'Expédition accomplie. Nacre se souviendra.','good');break;
 default:throw Error('Action inconnue.');
 }validate(s);return {state:s};
 }catch(e){return {state:original,error:e.message};}
}
export function zoneNoise(s,z){return (s.noise[z]||0)+s.heroes.filter(h=>h.hp>0&&h.zone===z).length;}
function recordStep(s,step){if(s.lastPhase&&s.lastPhase.steps.length<400)s.lastPhase.steps.push(step);}
function hurt(s,h,damage,enemy=null,pass=0,extra=false){
 const before=h.hp;
 if(h.ward>0){const absorbed=Math.min(h.ward,damage);damage-=absorbed;h.ward-=absorbed;}
 if(hasTalent(h,'guardian')&&!h.guardUsed){damage=Math.max(0,damage-1);h.guardUsed=true;}
 if(h.id==='basile'&&!h.shield){damage=Math.max(0,damage-1);h.shield=true;}
 h.hp=Math.max(0,h.hp-damage);
 if(enemy)recordStep(s,{kind:'attack',enemy:enemy.id,type:enemy.type,zone:h.zone,hero:h.id,damage:before-h.hp,pass,extra});
 if(!damage)return;
 log(s,`${HEROES.find(x=>x.id===h.id).name} subit ${before-h.hp} blessure${before-h.hp>1?'s':''}${h.hp<=0?' et tombe à terre':''}.`,'danger');
 if(h.hp===0){h.ap=0;h.bleed=0;}
}
function chooseLegacyTarget(s,e){const alive=s.heroes.filter(h=>h.hp>0);const sight=alive.filter(h=>visible(s,e.zone,h.zone,5)).sort((a,b)=>distance(e.zone,a.zone)-distance(e.zone,b.zone));if(sight.length)return sight[0].zone;const noises=Object.entries(s.noise).map(([zone,n])=>({zone:+zone,n,p:path(s,e.zone,+zone)})).filter(x=>x.p&&x.n>0).sort((a,b)=>b.n-a.n||a.p.length-b.p.length);if(noises.length)return noises[0].zone;return alive.map(h=>({zone:h.zone,p:path(s,e.zone,h.zone)})).filter(x=>x.p).sort((a,b)=>a.p.length-b.p.length)[0]?.zone;}
export function enemyRoutes(s,e){
 const alive=s.heroes.filter(h=>h.hp>0),seen=[...new Set(alive.filter(h=>visible(s,e.zone,h.zone)).map(h=>h.zone))];
 const audible=[...new Set([...alive.map(h=>h.zone),...Object.keys(s.noise).map(Number)])];
 const candidates=(seen.length?seen:audible).filter(z=>zoneNoise(s,z)>0);
 const loudest=Math.max(0,...candidates.map(z=>zoneNoise(s,z)));
 const targets=candidates.filter(z=>zoneNoise(s,z)===loudest);
 const routes=new Set();
 for(const target of targets){
  const shortest=path(s,e.zone,target);if(!shortest||shortest.length<2)continue;
  for(const next of neighbors(s,e.zone)){
   const tail=path(s,next,target);if(tail&&tail.length===shortest.length-1)routes.add(next);
  }
 }
 return [...routes].sort((a,b)=>a-b);
}
function activateEnemies(s,onlyType=null,extra=false){
 const pool=s.enemies.filter(e=>!onlyType||e.type===onlyType);
 if(!tactical(s)){
  for(const e of pool){for(let pass=0;pass<ENEMIES[e.type].speed;pass++){
   const victims=s.heroes.filter(h=>h.hp>0&&h.zone===e.zone).sort((a,b)=>b.hp-a.hp);
   if(victims.length)hurt(s,victims[0],ENEMIES[e.type].damage,e,pass,extra);
   else{const goal=chooseLegacyTarget(s,e);if(goal!==undefined){const p=path(s,e.zone,goal);if(p?.length>1){recordStep(s,{kind:'move',enemy:e.id,type:e.type,from:e.zone,to:p[1],extra,pass});e.zone=p[1];}}}
  }}return;
 }
 // Everyone acts once before runners act again. Attackers do not move during that pass.
 for(let pass=0;pass<2;pass++){
  const eligible=pool.filter(e=>ENEMIES[e.type].speed>pass);
  const attackers=new Set(eligible.filter(e=>s.heroes.some(h=>h.hp>0&&h.zone===e.zone)).map(e=>e.id));
  for(const e of eligible.filter(e=>attackers.has(e.id))){
   const victims=s.heroes.filter(h=>h.hp>0&&h.zone===e.zone).sort((a,b)=>b.hp-a.hp);
   if(victims.length)hurt(s,victims[0],ENEMIES[e.type].damage,e,pass,extra);
  }
  const split=new Map(),moves=[],routesCache=new Map();
  for(const e of eligible.filter(e=>!attackers.has(e.id))){
   if(!routesCache.has(e.zone))routesCache.set(e.zone,enemyRoutes(s,e));
   const routes=routesCache.get(e.zone);if(!routes.length)continue;
   const key=e.zone+':'+e.type+':'+routes.join(','),index=split.get(key)||0;
   moves.push({e,from:e.zone,to:routes[index%routes.length]});split.set(key,index+1);
  }
  for(const {e,from,to} of moves){recordStep(s,{kind:'move',enemy:e.id,type:e.type,from,to,extra,pass});e.zone=to;}
 }
}
export function previewEnemyPhase(original){
 const s=structuredClone(original);s.lastPhase={round:s.round,steps:[],draws:[]};
 activateEnemies(s);
 return {steps:s.lastPhase.steps,heroes:s.heroes.map(h=>({id:h.id,hp:h.hp})),enemies:s.enemies.map(e=>({id:e.id,type:e.type,zone:e.zone})),danger:tier(s)};
}
function spawnCard(s,zone,{building=false}={}){
 const card=drawSpawn(s,tier(s),rng,{building});let count=0;
 for(const [i,type]of ['drowned','runner','bell'].entries())for(let n=0;n<card.row[i];n++){addEnemy(s,type,zone);if(!building)recordStep(s,{kind:'spawn',enemy:s.enemies.at(-1).id,type,zone});count++;}
 if(!building)s.lastPhase?.draws.push({card:card.id,zone,row:card.row,rush:card.rush});
 log(s,`${card.name} · zone ${zone+1} : ${count?card.row.map((n,i)=>n?n+' '+ENEMIES[['drowned','runner','bell'][i]].plural:'').filter(Boolean).join(', '):'aucune présence'}.`,'danger');
 if(card.rush){log(s,'Les échos réveillent tous les Noyés : activation supplémentaire.','danger');activateEnemies(s,'drowned',true);}
 return count;
}
export function enemyPhase(s){
 log(s,'— Le Chœur s’éveille —','danger');s.lastRoll=null;
 s.lastPhase={round:s.round,steps:[],draws:[]};
 const alreadyDown=s.heroes.filter(h=>h.hp<=0).map(h=>h.id);
 activateEnemies(s);
 for(const h of s.heroes)if(h.hp<=0&&alreadyDown.includes(h.id))h.bleed++;
 const m=MISSIONS[s.mission];if(m.type==='defend'&&s.objectives.every(o=>o.done)){if(!s.objectives.some(o=>s.enemies.some(e=>e.zone===o.zone))){s.hold++;log(s,`Pompage : ${s.hold}/${m.hold} phases sécurisées.`,'good');}else log(s,'Pompage interrompu par une présence ennemie.','danger');}
 if(!tactical(s))for(const z of Object.keys(s.noise)){s.noise[z]=Math.max(0,s.noise[z]-3);if(!s.noise[z])delete s.noise[z];}
 const difficulty=s.difficulty==='story'?-1:s.difficulty==='nightmare'?1:0,team=s.heroes.length<=2?-1:0,t=tier(s);let spawned=0;
 for(const zone of m.spawns.filter(z=>!s.sealed.includes(z))){
  if(tactical(s)){spawned+=spawnCard(s,zone);continue;}
  const count=Math.max(1,1+Math.floor(t/2)+difficulty+team+(s.round%4===0?1:0));
  for(let i=0;i<count;i++){const r=rng(s,12),type=(s.round>=5&&r>=10)?'bell':s.round>=3&&r>=7?'runner':'drowned';addEnemy(s,type,zone);recordStep(s,{kind:'spawn',enemy:s.enemies.at(-1).id,type,zone});spawned++;}
 }
 log(s,`${spawned} créature${spawned>1?'s':''} émergent des failles.`,'danger');
 if(tactical(s))s.noise={};
 s.round++;s.stats.rounds=s.round;
 const ev=EVENTS[s.round<=2?0:rng(s,EVENTS.length)];s.event={...ev};s.cacheUsed=false;
 if(ev.effect==='echo')for(const z of m.spawns.filter(z=>!s.sealed.includes(z))){addEnemy(s,'drowned',z);recordStep(s,{kind:'spawn',enemy:s.enemies.at(-1).id,type:'drowned',zone:z});}
 if(ev.effect==='heal')for(const h of s.heroes)if(h.hp>0)h.hp=Math.min(HEROES.find(x=>x.id===h.id).hp,h.hp+1);
 if(ev.effect==='noise')noise(s,27,7);
 s.lastPhase.spawned=spawned+(ev.effect==='echo'?m.spawns.filter(z=>!s.sealed.includes(z)).length:0);
 log(s,ev.title+' — '+ev.text,'event');
 for(const h of s.heroes){h.ap=h.hp>0?maxAP(h):0;h.searched=false;h.searchCount=0;h.rerolled=false;h.freeMove=false;h.freeDoor=false;h.healed=false;h.shield=false;h.aim=false;if(s.content===1){h.focusUsed=false;h.swapUsed=false;}if(h.evolution===1){h.ward=0;if(balanced(h)){h.powerUsed=false;h.pushUsed=false;}h.swiftUsed=false;h.guardUsed=false;h.ether=Math.min(maxEther(h),(h.ether||0)+1);}}
 if(active(s).hp<=0)s.active=s.heroes.find(h=>h.hp>0)?.id||s.active;
 validate(s);
}

export function validateSave(s){try{
 const int=(n,min=0,max=1e6)=>Number.isInteger(n)&&n>=min&&n<=max,zone=n=>int(n,0,47),arr=(x,fn,max=100)=>Array.isArray(x)&&x.length<=max&&x.every(fn);
 if(!s||s.version!==1||!int(s.mission,0,MISSIONS.length-1))return false;const m=MISSIONS[s.mission];
 if(s.content!==undefined&&s.content!==1)return false;
 if(s.content===1&&(s.balance!==1||s.heroes.some(h=>typeof h.focusUsed!=='boolean'||typeof h.swapUsed!=='boolean')))return false;
 if((s.mission>=6||s.heroes.some(h=>['sacha','mira','nael'].includes(h.id)))&&s.content!==1)return false;
 if(s.ruleset!==undefined&&![1,2].includes(s.ruleset))return false;
 if(tactical(s)&&(!arr(s.spawnDeck,id=>SPAWN_CARDS.some(c=>c.id===id),SPAWN_CARDS.length)||new Set(s.spawnDeck).size!==s.spawnDeck.length))return false;
 if(s.lastPhase){const p=s.lastPhase;if(!int(p.round,1,100)||(p.spawned!==undefined&&!int(p.spawned,0,1000))||!arr(p.steps,x=>Object.hasOwn(ENEMIES,x.type)&&/^e\d+$/.test(x.enemy)&&(x.kind==='move'?zone(x.from)&&zone(x.to):x.kind==='spawn'?zone(x.zone):x.kind==='attack'&&zone(x.zone)&&s.heroes.some(h=>h.id===x.hero)&&int(x.damage,0,8)),400)||!arr(p.draws,d=>SPAWN_CARDS.some(c=>c.id===d.card)&&zone(d.zone)&&arr(d.row,n=>int(n,0,10),3)&&d.row.length===3&&typeof d.rush==='boolean',12))return false;}
 if(!['story','normal','nightmare'].includes(s.difficulty)||!int(s.seed,0,4294967295)||!int(s.nextId,1)||!int(s.round,1,100)||s.phase!=='heroes'||!['playing','won','lost'].includes(s.status))return false;
 if(!arr(s.heroes,h=>{const d=HEROES.find(x=>x.id===h.id);return d&&zone(h.zone)&&int(h.hp,0,d.hp)&&int(h.ap,0,balanced(h)?4:h.evolution===1?5:4)&&int(h.xp)&&int(h.bleed,0,3)&&int(h.kills)&&(h.searchCount===undefined||int(h.searchCount,0,h.id==='ada'?2:1))&&(h.rerolled===undefined||typeof h.rerolled==='boolean')&&Object.hasOwn(WEAPONS,h.weapon)&&arr(h.inventory,i=>Object.hasOwn(WEAPONS,i)||Object.hasOwn(ITEMS,i),8)&&h.inventory.includes(h.weapon)&&h.ammo&&Object.entries(h.ammo).every(([k,v])=>WEAPONS[k]&&int(v,0,WEAPONS[k].ammo||0))&&['searched','freeMove','freeDoor','healed','shield','aim'].every(k=>typeof h[k]==='boolean');},4)||s.heroes.length<2||new Set(s.heroes.map(h=>h.id)).size!==s.heroes.length||!s.heroes.some(h=>h.id===s.active))return false;
 if(s.balance!==undefined&&s.balance!==1)return false;
 if(s.heroes.some(h=>h.balance!==undefined&&(h.balance!==1||s.balance!==1)||s.balance===1&&(!balanced(h)||h.evolution!==1||typeof h.powerUsed!=='boolean'||typeof h.pushUsed!=='boolean'||!validTalentSequence(h)||!!weaponLock(h,h.weapon))))return false;
 if(s.expansion!==undefined&&s.expansion!==1)return false;
 if(s.relicClaimed!==undefined&&typeof s.relicClaimed!=='boolean')return false;
 if(s.heroes.some(h=>h.evolution!==undefined&&(h.evolution!==1||!arr(h.talents,t=>talentPool(h).includes(t),5)||new Set(h.talents).size!==h.talents.length||h.talents.length>heroRank(h)||!int(h.ether,0,maxEther(h))||!int(h.ward,0,4)||typeof h.swiftUsed!=='boolean'||typeof h.guardUsed!=='boolean')))return false;
 if(s.lastDiscovery&&(!s.heroes.some(h=>h.id===s.lastDiscovery.hero)||!Object.hasOwn({...WEAPONS,...ITEMS},s.lastDiscovery.item)||!['search','objective'].includes(s.lastDiscovery.source)||!int(s.lastDiscovery.round,1,100)))return false;
 if(!arr(s.enemies,e=>ENEMIES[e.type]&&/^e\d+$/.test(e.id)&&zone(e.zone)&&int(e.hp,1,ENEMIES[e.type].hp),2000))return false;
 if(!arr(s.map?.zones,(z)=>zone(z.id)&&int(z.room,-1,3)&&['QUAI',...ROOM_NAMES].includes(z.name)&&int(z.loot,0,2),48)||s.map.zones.length!==48||!s.map.zones.every((z,i)=>z.id===i))return false;
 const base=createMap(s.mission).edges;if(!s.map.edges||Object.keys(s.map.edges).length!==Object.keys(base).length||!Object.entries(s.map.edges).every(([k,v])=>Object.hasOwn(base,k)&&['open','wall','closed'].includes(v)))return false;
 if(!arr(s.objectives,(o)=>m.objectives.some(x=>x.zone===o.zone&&x.kind===o.kind&&x.label===o.label)&&typeof o.done==='boolean',m.objectives.length)||s.objectives.length!==m.objectives.length||new Set(s.objectives.map(o=>o.zone)).size!==s.objectives.length)return false;
 if(!s.noise||!Object.entries(s.noise).every(([k,n])=>zone(+k)&&int(n))||!arr(s.revealed,r=>int(r,0,3),4)||!arr(s.sealed,z=>m.spawns.includes(z),4)||!int(s.hold,0,100)||typeof s.bossKilled!=='boolean')return false;
 if(s.escort&&(!zone(s.escort.zone)||!s.heroes.some(h=>h.id===s.escort.following)))return false;
 if(s.event&&!EVENTS.some(e=>e.title===s.event.title&&e.text===s.event.text&&e.effect===s.event.effect))return false;
 if(!arr(s.log,l=>int(l.round,1,100)&&typeof l.text==='string'&&l.text.length<2000&&['info','good','danger','combat','event'].includes(l.type),100)||!s.stats||!['kills','searches','rounds'].every(k=>int(s.stats[k])))return false;
 if(s.lastRoll&&(!arr(s.lastRoll.rolls,n=>int(n,1,6),10)||!int(s.lastRoll.threshold,2,6)||!int(s.lastRoll.hits,0,10)||!int(s.lastRoll.kills,0,10)||!(Object.values(WEAPONS).some(w=>w.name===s.lastRoll.weapon)||s.balance===1&&s.lastRoll.weapon===POWERS.maelys.name)))return false;
 if(s.lastRoll?.reroll){const r=s.lastRoll.reroll;if(!int(r.index,0,s.lastRoll.rolls.length-1)||!int(r.from,1,6)||!int(r.to,1,6))return false;}
 return true;
 }catch{return false;}}


function rareLoot(s,h){const ids=['eclipse','tempest','heart'].filter(id=>!h.inventory.includes(id));return ids.length?ids[rng(s,ids.length)]:['harpoon','rifle','shotgun','staff','axe','blade','pistol','bow','wrench'].find(id=>!h.inventory.includes(id));}
export function powerTargets(s,h=active(s)){
 const p=powerInfo(h);if(!p||powerLock(h))return [];
 if(p.kind==='hero')return s.heroes.filter(t=>h.id==='orso'?t.zone===h.zone&&t.hp>0&&t.ward<(balanced(h)?hasTalent(h,'overflow')?2:1:hasTalent(h,'overflow')?4:2):(!balanced(h)||t.hp>0||hasTalent(h,'overflow'))&&visible(s,h.zone,t.zone,1)&&t.hp<HEROES.find(d=>d.id===t.id).hp).map(t=>t.id);
 if(p.kind==='move')return s.map.zones.filter(z=>{const route=path(s,h.zone,z.id);return route&&route.length>1&&route.length<=3+(hasTalent(h,'overflow')?1:0);}).map(z=>z.id);
 return [...new Set(s.enemies.filter(e=>visible(s,h.zone,e.zone,2)&&(e.type!=='cantor'||s.objectives.every(o=>o.done))).map(e=>e.zone))];
}
function usePower(s,h,a){
 const p=powerInfo(h);if(powerLock(h))throw Error(powerLock(h));if(h.evolution!==1||!p||!powerTargets(s,h).includes(p.kind==='hero'?a.target:a.zone))throw Error('Cible de pouvoir indisponible.');
 if(h.ether<p.ether)throw Error('Éther insuffisant. Vous en récupérez 1 par manche.');spend(h,p.cost);h.ether-=p.ether;if(balanced(h))h.powerUsed=true;
 const boost=hasTalent(h,'overflow');
 if(h.id==='maelys'&&balanced(h)){const rolls=Array.from({length:3+(boost?1:0)},()=>1+rng(s,6)),hits=rolls.filter(n=>n>=4).length;let kills=0;for(let i=0;i<hits;i++){const target=s.enemies.find(e=>e.zone===a.zone);if(target&&damageEnemy(s,target,2,h))kills++;}s.lastRoll={rolls,threshold:4,hits,kills,weapon:p.name,blocked:false};noise(s,h.zone,4);log(s,p.name+' : '+hits+' succès, '+kills+' élimination(s).','combat');}
 else if(h.id==='maelys'){for(const e of [...s.enemies.filter(e=>e.zone===a.zone)])damageEnemy(s,e,2+(boost?1:0),h);noise(s,h.zone,3);}
 if(h.id==='orso')s.heroes.find(t=>t.id===a.target).ward=balanced(h)?boost?2:1:boost?4:2;
 if(h.id==='ysee'){const t=s.heroes.find(t=>t.id===a.target);t.hp=Math.min(HEROES.find(d=>d.id===t.id).hp,t.hp+(balanced(h)?1:2)+(boost?(balanced(h)?1:2):0)+(hasTalent(h,'healer')?(balanced(h)?1:2):0));t.bleed=0;}
 if(h.id==='silene'){const previous=h.zone;h.zone=a.zone;if(s.escort?.following===h.id&&s.escort.zone===previous)s.escort.zone=h.zone;}
 log(s,HEROES.find(d=>d.id===h.id).name+' · '+p.name+'.','good');
}


