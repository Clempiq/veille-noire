import test from 'node:test';
import assert from 'node:assert/strict';
import {HEROES,MISSIONS,WEAPONS} from '../content.js';
import {createGame,createMap,act,active,addEnemy,validateSave,path,equipCost,weaponThreshold,objectivesReady,canExtract} from '../engine.js';
import {actionInfo} from '../ui-state.js';
import {availableTalents,weaponLock} from '../progression.js';
import {createRoom,joinRoom,roomCommand,NET_VERSION} from '../room-model.js';
const apply=(s,a)=>{const r=act(s,a);assert.equal(r.error,undefined);assert.ok(validateSave(r.state));return r.state;};
const make=(id='sacha')=>createGame(6,[id,'basile'],'normal',42);

test('all 1365 four-survivor teams start valid with usable equipment',()=>{
 let count=0;for(let a=0;a<HEROES.length-3;a++)for(let b=a+1;b<HEROES.length-2;b++)for(let c=b+1;c<HEROES.length-1;c++)for(let d=c+1;d<HEROES.length;d++){
  const s=createGame(6,[a,b,c,d].map(i=>HEROES[i].id),'normal',42);assert.ok(validateSave(s));for(const h of s.heroes)assert.equal(weaponLock(h,h.weapon),'');count++;
 }assert.equal(count,1365);
});
test('Sacha automatically improves only the first ranged attack each round',()=>{
 let s=make();s.enemies=[];const h=active(s);assert.equal(weaponThreshold(h),3);
 assert.ok(act(s,{type:'attack',enemy:999}).error);assert.equal(h.focusUsed,false);
 h.ap=0;addEnemy(s,'bell',h.zone);assert.ok(act(s,{type:'attack',enemy:s.enemies[0].id}).error);assert.equal(h.focusUsed,false);
 h.ap=3;s=apply(s,{type:'attack',enemy:s.enemies[0].id});assert.equal(s.lastRoll.threshold,3);assert.equal(active(s).ap,2);assert.equal(active(s).focusUsed,true);
 s=JSON.parse(JSON.stringify(s));s=apply(s,{type:'attack',enemy:s.enemies[0].id});assert.equal(s.lastRoll.threshold,4);
 s.enemies=[];s=apply(s,{type:'endRound'});assert.equal(weaponThreshold(active(s)),3);
 s.enemies=[];active(s).inventory.push('pick');active(s).weapon='pick';addEnemy(s,'bell',active(s).zone);
 s=apply(s,{type:'attack',enemy:s.enemies[0].id});assert.equal(s.lastRoll.threshold,2);assert.equal(active(s).focusUsed,false);
 active(s).weapon='bow';assert.equal(weaponThreshold(active(s)),3);
 active(s).talents.push('marksman');assert.equal(weaponThreshold(active(s)),2);
});
test('removed aim actions and legacy prepared aim cannot grant a bonus',()=>{
 for(const s of [make(),createGame(0,['iris','basile'],'normal',42,2,1,0)]){
  const before=structuredClone(s);assert.ok(act(s,{type:'aim'}).error);assert.deepEqual(s,before);assert.equal(actionInfo(s,'aim').enabled,false);
  const threshold=weaponThreshold(active(s));active(s).aim=true;assert.ok(validateSave(s));assert.equal(weaponThreshold(active(s)),threshold);
 }
});
test('Mira cannot chain free swaps, retain allowance after reload or bypass equipment levels',()=>{
 let s=make('mira');active(s).inventory.push('axe','maul');active(s).ap=0;
 assert.ok(act(s,{type:'equip',item:'maul'}).error);assert.equal(active(s).swapUsed,false);
 s=apply(s,{type:'equip',item:'axe'});assert.equal(active(s).ap,0);assert.equal(equipCost(s),1);
 s=JSON.parse(JSON.stringify(s));assert.ok(act(s,{type:'equip',item:'pick'}).error);
 s.enemies=[];s=apply(s,{type:'endRound'});assert.equal(equipCost(s),0);
 s=apply(s,{type:'equip',item:'pick'});active(s).xp=19;s=apply(s,{type:'talent',talent:'brawler'});
 assert.equal(equipCost(s),1);
});
test('Naël prevents search ambushes without adding loot or extra searches',()=>{
 let prevented=0;for(let seed=1;seed<=180;seed++){
  const a=createGame(6,['nael','basile'],'normal',seed),b=createGame(6,['mira','basile'],'normal',seed);
  for(const s of [a,b]){active(s).zone=13;s.enemies=[];active(s).inventory=['bow','medkit','ammo'];active(s).weapon='bow';active(s).ammo={bow:0};}
  const x=apply(a,{type:'search'}),y=apply(b,{type:'search'});
  assert.equal(x.enemies.length,0);prevented+=y.enemies.length;assert.equal(x.lastDiscovery.item,y.lastDiscovery.item);assert.equal(x.seed,y.seed);
  assert.equal(active(x).ap,2);assert.ok(act(x,{type:'search'}).error);
 }assert.ok(prevented>0);
});
test('new talent trees have four attainable choices and survive serialization',()=>{
 for(const id of ['sacha','mira','nael']){let s=make(id);for(const xp of [19,43,70,100]){active(s).xp=xp;const options=availableTalents(active(s));assert.ok(options.length>0);s=apply(s,{type:'talent',talent:options[0]});}assert.equal(new Set(active(s).talents).size,4);assert.ok(validateSave(JSON.parse(JSON.stringify(s))));}
});
test('new maps have reachable objectives and mirrored topology of proven layouts',()=>{
 for(const m of MISSIONS.slice(6)){const s=createGame(m.id,['sacha','mira'],'normal',1),base=createMap(m.layoutBase),mirror=z=>Math.floor(z/8)*8+7-z%8;
  assert.ok(validateSave(s));assert.equal(Object.values(s.map.edges).filter(x=>x==='closed').length,Object.values(base.edges).filter(x=>x==='closed').length);
  for(const [k,v]of Object.entries(base.edges)){const key=k.split('-').map(Number).map(mirror).sort((a,b)=>a-b).join('-');assert.equal(s.map.edges[key],v);}
  for(const k in s.map.edges)if(s.map.edges[k]==='closed')s.map.edges[k]='open';
  for(const z of [...m.objectives.map(o=>o.zone),m.exit,...m.spawns])assert.ok(path(s,m.start,z));
 }
});
test('defense requires three clear phases and sealed channels stop spawning',()=>{
 let s=createGame(7,['mira','basile'],'story',42);s.objectives.forEach(o=>o.done=true);s.enemies=[];addEnemy(s,'bell',s.objectives[0].zone);
 s=apply(s,{type:'endRound'});assert.equal(s.hold,0);assert.equal(objectivesReady(s),false);
 for(let i=1;i<=3;i++){s.enemies=[];s=apply(s,{type:'endRound'});assert.equal(s.hold,i);}
 s.enemies=[];s.heroes.forEach(h=>h.zone=40);assert.equal(canExtract(s),true);s=apply(s,{type:'extract'});assert.equal(s.status,'won');
 s=createGame(8,['mira','basile'],'story',42);s.enemies=[];active(s).zone=7;s=apply(s,{type:'interact'});assert.ok(s.sealed.includes(7));assert.equal(active(s).ap,1);
 s=apply(s,{type:'endRound'});assert.ok(s.lastPhase.draws.every(d=>d.zone!==7));
});
test('new weapons respect magazine limits and XP gates',()=>{
 let s=make('nael');s.enemies=[];for(let i=0;i<8;i++)addEnemy(s,'bell',active(s).zone);
 for(let i=0;i<3;i++){s=apply(s,{type:'attack',enemy:s.enemies[0].id});}assert.equal(active(s).ammo.crossbow,0);
 active(s).ap=1;assert.ok(act(s,{type:'attack',enemy:s.enemies[0].id}).error);s=apply(s,{type:'use',item:'ammo'});assert.equal(active(s).ammo.crossbow,3);
 for(const weapon of ['maul','repeater']){active(s).inventory.push(weapon);active(s).xp=6;assert.ok(weaponLock(active(s),weapon));active(s).xp=7;assert.equal(weaponLock(active(s),weapon),'');}
});
test('legacy expeditions keep old loot and reject new-content saves without their marker',()=>{
 const old=createGame(0,['lina','malik'],'normal',42,2,1,0);assert.equal(old.content,undefined);assert.ok(validateSave(old));
 const modern=make();delete modern.content;assert.equal(validateSave(modern),false);
 const bad=make();delete active(bad).focusUsed;assert.equal(validateSave(bad),false);
});
test('new content is server-authoritative and unavailable in legacy lobbies',()=>{
 const ids=[1,2].map(n=>({id:String(n).repeat(32),token:String(n).repeat(48)}));let n=0;
 let r=joinRoom(createRoom('ABCDEFGH',ids[0],'A'),ids[1],'B');
 const cmd=(who,kind,extra={})=>roomCommand(r,ids[who].id,{id:(++n).toString(16).padStart(32,'0'),revision:r.revision,kind,...extra},42);
 r.protocol=4;assert.ok(cmd(0,'hero',{hero:'sacha'}).error);assert.ok(cmd(0,'settings',{mission:6,difficulty:'normal'}).error);
 r.protocol=NET_VERSION;for(const [who,kind,extra]of [[0,'hero',{hero:'sacha'}],[1,'hero',{hero:'mira'}],[0,'settings',{mission:8,difficulty:'normal'}],[0,'lobbyReady',{ready:true}],[1,'lobbyReady',{ready:true}],[0,'start',{}]]){const x=cmd(who,kind,extra);assert.equal(x.error,undefined);r=x.room;}
 assert.equal(r.game.content,1);assert.ok(cmd(0,'action',{action:{type:'aim'}}).error);r.game.enemies=[];addEnemy(r.game,'bell',r.game.heroes[0].zone);const x=cmd(0,'action',{action:{type:'attack',enemy:r.game.enemies[0].id}});assert.equal(x.error,undefined);assert.equal(x.room.game.lastRoll.threshold,3);assert.equal(x.room.game.heroes[0].ap,2);assert.equal(x.room.game.heroes[0].focusUsed,true);assert.equal(x.room.game.heroes[1].focusUsed,false);
});
