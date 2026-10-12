import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act,active,addEnemy,enemyPhase,validateSave} from '../engine.js';
import {exchangeReason} from '../exchange.js';
import {survivorLevel,phaseBeats,groupPieces} from '../presentation.js';
const make=()=>createGame(0,['lina','malik','iris','basile'],'normal',42);
const apply=(s,a)=>{const r=act(s,a);assert.equal(r.error,undefined);assert.ok(validateSave(r.state));return r.state;};
test('levels expose exact thresholds and progress without a fictitious fifth level',()=>{
 for(const [xp,number,next,progress]of [[0,1,6,0],[3,1,6,50],[6,2,16,0],[11,2,16,50],[16,3,30,0],[23,3,30,50],[30,4,null,100],[75,4,null,100]])assert.deepEqual(Object.fromEntries(Object.entries(survivorLevel({xp})).filter(([k])=>['number','next','progress'].includes(k))),{number,next,progress});
});
test('equipped weapons can be exchanged atomically without refilling ammunition',()=>{
 let s=make();s.heroes[1].ammo.pistol=2;const seed=s.seed;
 s=apply(s,{type:'exchange',target:'malik',give:'wrench',receive:'pistol'});
 assert.equal(active(s).weapon,'pistol');assert.equal(s.heroes[1].weapon,'wrench');assert.equal(active(s).ammo.pistol,2);assert.equal(s.heroes[1].ammo.pistol,undefined);assert.equal(active(s).ap,2);assert.equal(s.heroes[1].ap,3);assert.equal(s.seed,seed);
 s=apply(s,{type:'exchange',target:'malik',give:'pistol',receive:'wrench'});assert.equal(s.heroes[1].ammo.pistol,2);assert.equal(active(s).ammo.pistol,undefined);
});
test('one-way transfers of consumables preserve duplicates and spend only active AP',()=>{
 let s=make();s=apply(s,{type:'exchange',target:'malik',give:'medkit'});assert.equal(active(s).inventory.includes('medkit'),false);assert.equal(s.heroes[1].inventory.filter(x=>x==='medkit').length,3);
 s=apply(s,{type:'exchange',target:'malik',receive:'medkit'});assert.equal(active(s).inventory.filter(x=>x==='medkit').length,1);assert.equal(s.heroes[1].inventory.filter(x=>x==='medkit').length,2);assert.equal(active(s).ap,1);
});
test('full bags allow reciprocal exchange but reject an extra item',()=>{
 let s=make();for(const h of s.heroes.slice(0,2))while(h.inventory.length<8)h.inventory.push('ammo');
 assert.ok(act(s,{type:'exchange',target:'malik',give:'medkit'}).error);
 s=apply(s,{type:'exchange',target:'malik',give:'medkit',receive:'ammo'});assert.equal(active(s).inventory.length,8);assert.equal(s.heroes[1].inventory.length,8);
});
test('invalid exchanges keep the original state and explain the restriction',()=>{
 const cases=[
  [s=>s.heroes[1].zone=41,{give:'medkit'}],
  [s=>s.heroes[1].hp=0,{give:'medkit'}],
  [s=>addEnemy(s,'drowned',active(s).zone),{give:'medkit'}],
  [s=>active(s).ap=0,{give:'medkit'}],
  [s=>{},{}],[s=>{},{give:'wrench'}],[s=>{},{receive:'pistol'}],
  [s=>{},{give:'medkit',receive:'medkit'}],[s=>{},{give:'grenade'}],
  [s=>active(s).inventory.push('pistol'),{receive:'pistol',give:'wrench'}]
 ];
 for(const [mutate,selection]of cases){const s=make();mutate(s);const a={type:'exchange',target:'malik',...selection},before=structuredClone(s);assert.ok(exchangeReason(s,a));const r=act(s,a);assert.ok(r.error);assert.deepEqual(r.state,before);assert.equal(r.state,s);}
});
test('phase beats preserve order and never animate two actions of one enemy together',()=>{
 const steps=[{kind:'move',enemy:'e1',type:'runner',from:0,to:1},{kind:'move',enemy:'e2',type:'drowned',from:0,to:8},{kind:'move',enemy:'e1',type:'runner',from:1,to:2},{kind:'spawn',enemy:'e3',type:'drowned',zone:0},{kind:'move',enemy:'e3',type:'drowned',from:0,to:1,extra:true},{kind:'attack',enemy:'e3',type:'drowned',zone:1,hero:'lina',damage:1}];
 const original=structuredClone(steps),beats=phaseBeats(steps);assert.equal(beats.length,5);assert.deepEqual(beats.flatMap(b=>b.steps),steps);assert.deepEqual(steps,original);for(const b of beats)assert.equal(new Set(b.steps.map(s=>s.enemy)).size,b.steps.length);
});
test('recorded movement and appearances reconstruct the final enemy positions',()=>{
 for(const difficulty of ['normal','story','nightmare'])for(const ruleset of [1,2])for(const seed of [11,29,42]){
  const s=createGame(1,['lina','malik','iris','basile'],difficulty,seed,ruleset);active(s).xp=16;s.spawnDeck=ruleset===2?['drift','drift','echoes']:undefined;const units=new Map(s.enemies.map(e=>[e.id,{...e}]));enemyPhase(s);
  for(const {steps}of phaseBeats(s.lastPhase.steps))for(const step of steps){if(step.kind==='spawn')units.set(step.enemy,{id:step.enemy,type:step.type,zone:step.zone});if(step.kind==='move'){assert.ok(units.has(step.enemy));assert.equal(units.get(step.enemy).zone,step.from);units.get(step.enemy).zone=step.to;}}
  assert.deepEqual([...units.values()].map(({id,type,zone})=>({id,type,zone})),s.enemies.map(({id,type,zone})=>({id,type,zone})));assert.ok(validateSave(s));
 }
});
test('grouped tokens retain every enemy while keeping markup proportional to occupied zones',()=>{
 const units=Array.from({length:500},(_,i)=>({id:'e'+i,zone:i%4,type:i%2?'runner':'drowned'}));const groups=groupPieces(units);assert.equal(groups.length,4);assert.equal(groups.reduce((n,g)=>n+g.count,0),500);
});
