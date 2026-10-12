import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act,active,addEnemy,weaponRange,weaponNoise,searchesLeft,validateSave} from '../engine.js';
import {HEROES} from '../content.js';
import {actionInfo,targetReason,phaseSummary} from '../ui-state.js';
const make=()=>createGame(0,['noor','ada','jonas','tess'],'normal',42);
const apply=(s,a)=>{const r=act(s,a);assert.equal(r.error,undefined);return r.state;};

test('all 70 four-survivor compositions create a valid save; teams stay within 2–4',()=>{
 for(let a=0;a<5;a++)for(let b=a+1;b<6;b++)for(let c=b+1;c<7;c++)for(let d=c+1;d<8;d++)assert.ok(validateSave(createGame(0,[a,b,c,d].map(i=>HEROES[i].id))));
 assert.throws(()=>createGame(0,['noor']));assert.throws(()=>createGame(0,HEROES.map(h=>h.id)));
});
test('Noor reduces weapon noise in actual combat and never below zero',()=>{
 let s=make();s.enemies=[];addEnemy(s,'drowned',41);s=apply(s,{type:'attack',enemy:s.enemies[0].id});assert.equal(s.noise[40],1);assert.equal(active(s).ammo.pistol,5);
 active(s).weapon='bow';assert.equal(weaponNoise(active(s)),0);
});
test('Ada can search twice, spends actions, and resets next round',()=>{
 let s=make();s.active='ada';active(s).zone=9;s.enemies=[];
 s=apply(s,{type:'search'});assert.equal(searchesLeft(active(s)),1);s.enemies=[];
 s=apply(s,{type:'search'});assert.equal(active(s).ap,1);assert.equal(searchesLeft(active(s)),0);assert.equal(s.map.zones[9].loot,0);
 active(s).zone=10;s.enemies=[];assert.ok(act(s,{type:'search'}).error);
 s=apply(s,{type:'endRound'});assert.equal(searchesLeft(active(s)),2);
});
test('Jonas rerolls first miss once, then recovers the talent next round',()=>{
 let observed=false;
 for(let seed=1;seed<30&&!observed;seed++){
  let s=createGame(0,['jonas','noor'],'normal',seed);s.enemies=[];addEnemy(s,'bell',40);s=apply(s,{type:'attack',enemy:s.enemies[0].id});
  if(!s.lastRoll.reroll)continue;observed=true;
  assert.equal(active(s).rerolled,true);assert.ok(s.lastRoll.reroll.from<s.lastRoll.threshold);assert.equal(s.lastRoll.rolls[s.lastRoll.reroll.index],s.lastRoll.reroll.to);
  addEnemy(s,'bell',40);s=apply(s,{type:'attack',enemy:s.enemies.at(-1).id});assert.equal(s.lastRoll.reroll,null);
  s.enemies=[];s=apply(s,{type:'endRound'});assert.equal(active(s).rerolled,false);assert.ok(validateSave(s));
 }assert.ok(observed);
});
test('Tess attacks at extended range, but fog caps range and melee stays melee',()=>{
 let s=make();s.active='tess';s.enemies=[];addEnemy(s,'drowned',44);assert.equal(weaponRange(s,active(s)),4);assert.equal(targetReason(s,active(s),s.enemies[0]),'');
 s=apply(s,{type:'attack',enemy:s.enemies[0].id});assert.equal(active(s).ap,2);
 s.event={effect:'fog'};assert.equal(weaponRange(s,active(s)),2);active(s).weapon='axe';assert.equal(weaponRange(s,active(s)),0);
});
test('legacy saves keep already-used search and remain playable',()=>{
 let s=createGame(0);delete s.ruleset;delete s.spawnDeck;delete s.lastPhase;s.heroes.forEach(h=>{delete h.searchCount;delete h.rerolled;});s.heroes[0].searched=true;s.heroes[0].zone=9;
 assert.ok(validateSave(s));assert.equal(searchesLeft(active(s)),0);assert.ok(act(s,{type:'search'}).error);
 s=apply(s,{type:'endRound'});assert.equal(searchesLeft(active(s)),1);assert.ok(validateSave(s));
});
test('UI honors free actions at zero AP and exhausted search limits',()=>{
 let s=createGame(0);s.active='iris';active(s).ap=0;assert.equal(actionInfo(s,'move').enabled,true);assert.equal(actionInfo(s,'move').cost,0);
 s.active='lina';active(s).zone=1;active(s).ap=0;assert.equal(actionInfo(s,'door').enabled,true);assert.equal(actionInfo(s,'door').cost,0);
 active(s).zone=9;s.event={effect:'cache'};assert.equal(actionInfo(s,'search').enabled,true);s=apply(s,{type:'search'});assert.equal(active(s).ap,0);assert.equal(s.cacheUsed,true);
 assert.equal(actionInfo(s,'search').enabled,false);
});
test('UI explains armor, protected boss, empty magazine, and no accessible doors',()=>{
 let s=make();s.enemies=[];addEnemy(s,'bell',40);assert.match(targetReason(s,active(s),s.enemies[0]),/armure/);assert.equal(actionInfo(s,'attack').enabled,false);
 s.enemies=[];addEnemy(s,'drowned',41);active(s).ammo.pistol=0;assert.match(actionInfo(s,'attack').reason,/Chargeur vide/);assert.equal(actionInfo(s,'door').enabled,false);
 s=createGame(5);active(s).zone=19;assert.match(targetReason(s,active(s),s.enemies.find(e=>e.type==='cantor')),/résonateurs/);
});
test('phase report distinguishes moved existing enemies, spawns and net wounds',()=>{
 const before=make(),after=structuredClone(before);after.enemies[0].zone=8;addEnemy(after,'runner',0);after.heroes[0].hp-=2;
 const r=phaseSummary(before,after);assert.equal(r.moved,1);assert.equal(r.spawned,1);assert.deepEqual(r.wounded,[{id:'noor',lost:2}]);
});
