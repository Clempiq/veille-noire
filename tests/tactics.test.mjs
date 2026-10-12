import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,act,active,addEnemy,moveCost,zoneNoise,enemyRoutes,previewEnemyPhase,enemyPhase,validateSave,rng,neighbors,weaponDice} from '../engine.js';
import {SPAWN_CARDS,drawSpawn} from '../spawn-deck.js';
import {phaseSummary,attackOdds,actionInfo,targetReason} from '../ui-state.js';
const make=(seed=42)=>createGame(0,['lina','malik','iris','basile'],'normal',seed);
const apply=(s,a)=>{const r=act(s,a);assert.equal(r.error,undefined);return r.state;};

test('finished expeditions expose no actionable moves or combat targets',()=>{
 for(const status of ['won','lost']){
  const s=make();s.status=status;addEnemy(s,'drowned',active(s).zone);
  for(const action of ['move','attack','search','door','interact','aim'])assert.equal(actionInfo(s,action).enabled,false);
  assert.match(targetReason(s,active(s),s.enemies.at(-1)),/terminée/);
  assert.ok(act(s,{type:'endRound'}).error);
 }
});
test('bow trades damage output for silence; legacy saves keep the original dice',()=>{
 let s=make();s.active='iris';assert.equal(weaponDice(s,active(s)),1);assert.equal(attackOdds(s),50);active(s).aim=true;assert.equal(attackOdds(s),50);active(s).aim=false;
 active(s).xp=19;assert.equal(weaponDice(s,active(s)),1);delete active(s).balance;assert.equal(weaponDice(s,active(s)),2);delete s.ruleset;assert.equal(weaponDice(s,active(s)),3);
 s=createGame(0,['jonas','noor']);assert.equal(attackOdds(s),88);active(s).rerolled=true;assert.equal(attackOdds(s),75);
});
test('changing weapons consumes one action and cannot occur after actions are spent',()=>{
 let s=make();active(s).inventory.push('axe');active(s).ap=1;s=apply(s,{type:'equip',item:'axe'});assert.equal(active(s).ap,0);assert.ok(act(s,{type:'equip',item:'wrench'}).error);
 delete s.ruleset;s=apply(s,{type:'equip',item:'wrench'});assert.equal(active(s).ap,0);
});
test('new loot never duplicates weapons and cannot refill a carried magazine for free',()=>{
 for(let seed=1;seed<100;seed++){
  let s=make(seed);active(s).zone=9;active(s).inventory=['wrench','blade','shotgun','rifle','harpoon'];active(s).ammo={wrench:0,shotgun:0,rifle:0,harpoon:0};s.enemies=[];
  s=apply(s,{type:'search'});const weapons=active(s).inventory.filter(i=>['wrench','blade','shotgun','rifle','harpoon'].includes(i));assert.equal(new Set(weapons).size,weapons.length);assert.equal(active(s).ammo.rifle,0);
 }
});

test('leaving a crowd costs one AP per enemy; Iris only waives the base movement',()=>{
 const s=make();s.enemies=[];for(let i=0;i<3;i++)addEnemy(s,'drowned',40);
 assert.equal(moveCost(s,active(s),41),4);assert.equal(moveCost(s,s.heroes[2],41),3);assert.ok(act(s,{type:'move',zone:41}).error);
 delete s.ruleset;assert.equal(moveCost(s,active(s),41),2);
});
test('noise counts survivors; louder visible group takes priority over closer survivor',()=>{
 const s=make();s.heroes[0].zone=42;s.heroes.slice(1).forEach(h=>h.zone=47);s.enemies=[];addEnemy(s,'drowned',43);
 assert.equal(zoneNoise(s,47),3);assert.deepEqual(enemyRoutes(s,s.enemies[0]),[44]);
 s.noise[42]=5;assert.deepEqual(enemyRoutes(s,s.enemies[0]),[42]);
});
test('equal shortest paths split groups and forecast is pure',()=>{
 const s=make();Object.keys(s.map.edges).forEach(k=>s.map.edges[k]='open');s.heroes.forEach(h=>h.zone=18);s.enemies=[];
 for(let i=0;i<4;i++)addEnemy(s,'drowned',0);const before=JSON.stringify(s),p=previewEnemyPhase(s);
 assert.equal(JSON.stringify(s),before);assert.equal(p.enemies.filter(e=>e.zone===1).length,2);assert.equal(p.enemies.filter(e=>e.zone===8).length,2);
});
test('runners take second action after first actions of all enemies',()=>{
 const s=make();s.enemies=[];addEnemy(s,'runner',41);addEnemy(s,'drowned',40);
 const p=previewEnemyPhase(s);assert.equal(p.steps[0].type,'drowned');assert.equal(p.steps[0].kind,'attack');assert.equal(p.steps[1].kind,'move');assert.equal(p.steps[2].type,'runner');assert.equal(p.steps[2].kind,'attack');
});
test('forecast matches all existing enemy positions and wounds before unknown spawns',()=>{
 const s=make();s.enemies=[];addEnemy(s,'runner',41);addEnemy(s,'drowned',0);const p=previewEnemyPhase(s);enemyPhase(s);
 for(const e of p.enemies)assert.equal(s.enemies.find(x=>x.id===e.id).zone,e.zone);
 for(const h of p.heroes)assert.equal(s.heroes.find(x=>x.id===h.id).hp,h.hp);assert.ok(validateSave(s));
});
test('deck cycles through 12 unique cards and restores deterministically',()=>{
 const s=make(),cards=Array.from({length:12},()=>drawSpawn(s,0,rng).id);assert.equal(new Set(cards).size,12);assert.equal(s.spawnDeck.length,0);
 const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(drawSpawn(s,2,rng),drawSpawn(restored,2,rng));assert.equal(s.spawnDeck.length,11);
 const pressure=row=>row[0]+row[1]*2+row[2]*3;
 for(const c of SPAWN_CARDS)for(let i=1;i<4;i++)assert.ok(pressure(c.rows[i])>pressure(c.rows[i-1]),c.id+' danger '+i);
});
test('Exploration and small teams reduce cards while Nightmare increases them',()=>{
 const normal=make();normal.spawnDeck=['procession'];const story=structuredClone(normal),small=structuredClone(normal),night=structuredClone(normal);story.difficulty='story';small.heroes=small.heroes.slice(0,2);night.difficulty='nightmare';
 assert.deepEqual(drawSpawn(normal,0,rng).row,[2,0,0]);assert.deepEqual(drawSpawn(story,0,rng).row,[1,0,0]);assert.deepEqual(drawSpawn(small,0,rng).row,[1,0,0]);assert.deepEqual(drawSpawn(night,0,rng).row,[3,0,0]);
});
test('rush only triggers at high danger in Survie/Nightmare and outside buildings',()=>{
 for(const [difficulty,t,building,wanted]of [['normal',0,false,false],['normal',2,false,true],['nightmare',3,false,true],['story',3,false,false],['normal',3,true,false]]){
  const s=make();s.spawnDeck=['echoes'];s.difficulty=difficulty;assert.equal(drawSpawn(s,t,rng,{building}).rush,wanted);
 }
});
test('opening building draws encounters once and objectives grant meaningful XP',()=>{
 let s=make();active(s).zone=1;s.spawnDeck=['procession','procession'];const count=s.enemies.length;
 s=apply(s,{type:'door',zone:9});assert.equal(s.enemies.length-count,4);assert.equal(s.spawnDeck.length,0);
 active(s).zone=11;s=apply(s,{type:'door',zone:10});assert.equal(s.enemies.length-count,4);
 s.enemies=[];active(s).zone=10;active(s).xp=2;s=apply(s,{type:'interact'});assert.equal(active(s).xp,7);assert.equal(active(s).ap,2);
});
test('report preserves wounds even if an event heals and survives JSON serialization',()=>{
 const s=make();s.enemies=[];addEnemy(s,'bell',40);const before=structuredClone(s);enemyPhase(s);const wounds=phaseSummary(before,s).wounded;
 assert.deepEqual(wounds,[{id:'basile',lost:1}]);s.heroes[3].hp=8;assert.deepEqual(phaseSummary(before,JSON.parse(JSON.stringify(s))).wounded,wounds);
});
test('invalid decks, report data and reroll injection are rejected',()=>{
 for(const mutate of [s=>s.spawnDeck=['missing'],s=>s.spawnDeck=['drift','drift'],s=>s.ruleset=999,s=>s.lastPhase.spawned='<img>',s=>s.lastPhase.steps[0]={kind:'move',type:'drowned',enemy:'e1',from:0,to:99},s=>s.lastPhase.draws[0].card='<img>']){
  const s=make();enemyPhase(s);mutate(s);assert.equal(validateSave(s),false);
 }
 let s=make();s.active='malik';s.enemies=[];addEnemy(s,'drowned',41);s=apply(s,{type:'attack',enemy:s.enemies[0].id});s.lastRoll.reroll={index:0,from:'" onmouseover="x',to:3};assert.equal(validateSave(s),false);
});
test('tactical game transitions stay valid across all missions and intensities',()=>{
 for(let seed=1;seed<=36;seed++){
  let s=createGame(seed%6,['noor','ada','jonas','tess'],['story','normal','nightmare'][seed%3],seed);
  for(let n=0;n<100&&s.status==='playing';n++){
   const h=active(s),moves=neighbors(s,h.zone),actions=[{type:'move',zone:moves[n%moves.length]},{type:'search'},{type:'interact'},{type:'attack',enemy:s.enemies[n%s.enemies.length]?.id},{type:'select',id:s.heroes[n%4].id},{type:'endRound'}];
   s=act(s,actions[(n+seed)%actions.length]).state;assert.ok(validateSave(s),`seed=${seed} step=${n}`);
  }
 }
});
