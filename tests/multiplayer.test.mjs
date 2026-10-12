import test from 'node:test';
import assert from 'node:assert/strict';
import {NET_VERSION,createRoom,joinRoom,roomCommand,publicRoom,validSnapshot} from '../room-model.js';
import {MemoryStore} from '../server/party-store.js';
import {makeService} from '../server/party-service.js';
const ids=[1,2,3,4,5].map(n=>({id:String(n).repeat(32),token:String(n).repeat(48)}));
let counter=0;
const request=(room,kind,extra={})=>({id:(++counter).toString(16).padStart(32,'0'),revision:room.revision,kind,...extra});
function pair(){return joinRoom(createRoom('ABCDEFGH',ids[0],'Hôte'),ids[1],'Allié');}
function readyAll(room){for(let i=0;i<room.players.length;i++)room=command(room,i,'lobbyReady',{ready:true});return room;}
function command(room,id,kind,extra={}){const r=roomCommand(room,ids[id].id,request(room,kind,extra),42);assert.equal(r.error,undefined);assert.ok(validSnapshot(publicRoom(r.room)));return r.room;}
test('rooms hold four distinct owners and strip every recovery secret from snapshots',()=>{
 assert.throws(()=>joinRoom(pair(),null,'Invalide'),/Identité/);
 let r=pair();r=joinRoom(r,ids[2],'Trois');r=joinRoom(r,ids[3],'Quatre');assert.throws(()=>joinRoom(r,ids[4],'Cinq'),/complet/);
 assert.equal(new Set(r.players.map(p=>p.hero)).size,4);const view=publicRoom(r);assert.ok(validSnapshot(view));assert.ok(view.players.every(p=>!('token'in p)&&!('seen'in p)));
});
test('local store allocates a room code atomically under concurrent creation',async()=>{
 const store=new MemoryStore(),room={...pair(),expiresAt:Date.now()+60000};
 const results=await Promise.all([store.create(room),store.create(room)]);
 assert.deepEqual(results,[true,false]);
});
test('only host starts or configures; heroes cannot be claimed twice',()=>{
 let r=pair();for(const kind of ['start','settings','remove'])assert.ok(roomCommand(r,ids[1].id,request(r,kind,{mission:1,difficulty:'story',player:ids[0].id})).error);
 assert.ok(roomCommand(r,ids[1].id,request(r,'hero',{hero:'lina'})).error);
 r=command(r,1,'hero',{hero:'tess'});r=command(r,0,'settings',{mission:1,difficulty:'story'});r=command(readyAll(r),0,'start');assert.equal(r.game.mission,1);assert.equal(r.game.difficulty,'story');assert.deepEqual(r.game.heroes.map(h=>h.id),['lina','tess']);
 assert.ok(roomCommand(r,ids[1].id,request(r,'hero',{hero:'iris'})).error);
});
test('actions are bound to the sender; selection and direct enemy phases are forbidden',()=>{
 let r=command(readyAll(pair()),0,'start');const original=r.game.heroes[0].zone;
 r=command(r,1,'action',{action:{type:'move',zone:original+1,hero:'lina',active:'lina'}});
 assert.equal(r.game.heroes[0].zone,original);assert.equal(r.game.heroes[1].zone,original+1);
 for(const type of ['select','endRound','invalid'])assert.ok(roomCommand(r,ids[1].id,request(r,'action',{action:{type,id:'lina'}})).error);
});
test('all living players must finish; one phase only, and ready can be cancelled',()=>{
 let r=command(readyAll(pair()),0,'start');r=command(r,0,'ready',{ready:true});assert.equal(r.game.round,1);
 assert.ok(roomCommand(r,ids[0].id,request(r,'action',{action:{type:'move',zone:41}})).error);
 r=command(r,0,'ready',{ready:false});r=command(r,0,'action',{action:{type:'move',zone:41}});r=command(r,0,'ready',{ready:true});
 const q=request(r,'ready',{ready:true});let result=roomCommand(r,ids[1].id,q);r=result.room;assert.equal(r.game.round,2);assert.ok(r.players.every(p=>!p.ready));
 result=roomCommand(r,ids[1].id,q);assert.ok(result.duplicate);assert.equal(result.room.game.round,2);
});
test('incapacitated survivors do not prevent the next round',()=>{
 let r=command(readyAll(pair()),0,'start');r.game.heroes[1].hp=0;r.game.heroes[1].ap=0;r=command(r,0,'ready',{ready:true});assert.equal(r.game.round,2);
});
test('stale commands and reconnect impersonation leave the state unchanged',()=>{
 let r=command(readyAll(pair()),0,'start');const q=request(r,'action',{action:{type:'move',zone:41}});r=command(r,1,'action',{action:{type:'move',zone:41}});
 const stale=roomCommand(r,ids[0].id,q);assert.match(stale.error,/évolué/);assert.equal(stale.room,r);
 assert.throws(()=>joinRoom(r,{...ids[0],token:ids[1].token},'Faux'),/autre connexion/);
 const resumed=joinRoom(r,ids[0],'Hôte');assert.equal(resumed.players.length,2);assert.deepEqual(resumed.game,r.game);
});
async function servicePair(){
 const store=new MemoryStore(),service=makeService(store);
 const host=await service({method:'POST',body:{type:'create',protocol:NET_VERSION,identity:ids[0],nick:'Hôte'}});
 const code=host.snapshot.code;
 const joined=await service({method:'POST',body:{type:'join',protocol:NET_VERSION,code,identity:ids[1],nick:'Allié'}});
 let lobby=joined.snapshot;
 for(const auth of ids.slice(0,2))lobby=(await service({method:'POST',auth,body:{type:'command',code,request:request(lobby,'lobbyReady',{ready:true})}})).snapshot;
 const start=await service({method:'POST',auth:ids[0],body:{type:'command',code,request:request(lobby,'start')}});
 return {store,service,code,room:start.snapshot};
}
test('service requires authentication and stores hashed recovery tokens only',async()=>{
 const {store,service,code}=await servicePair();const room=await store.get(code);assert.notEqual(room.players[0].token,ids[0].token);
 await assert.rejects(service({method:'GET',auth:{...ids[0],token:ids[1].token},query:{code}}),/place/);
 await assert.rejects(service({method:'GET',query:{code}}),/Identité/);
 const own=await service({method:'GET',auth:ids[0],query:{code}});assert.ok(validSnapshot(own.snapshot));assert.ok(!JSON.stringify(own).includes(ids[0].token));
});
test('concurrent server commands commit exactly once and resynchronize the loser',async()=>{
 const {store,service,code,room}=await servicePair();
 const results=await Promise.all(ids.slice(0,2).map(auth=>service({method:'POST',auth,body:{type:'command',code,request:request(room,'action',{action:{type:'move',zone:41}})}})));
 assert.equal(results.filter(x=>x.error).length,1);const final=await store.get(code);assert.equal(final.game.heroes.reduce((n,h)=>n+h.ap,0),5);assert.equal(final.revision,room.revision+1);
});
test('retry after a lost reply cannot repeat an attack or consume another action',async()=>{
 const {store,service,code,room}=await servicePair(),q=request(room,'action',{action:{type:'move',zone:41}});
 await service({method:'POST',auth:ids[0],body:{type:'command',code,request:q}});
 const retry=await service({method:'POST',auth:ids[0],body:{type:'command',code,request:q}});assert.equal(retry.error,undefined);assert.equal((await store.get(code)).game.heroes[0].ap,2);
});
test('server continues without the host browser and permits recovery during play',async()=>{
 const {service,code,room}=await servicePair();
 const move=await service({method:'POST',auth:ids[1],body:{type:'command',code,request:request(room,'action',{action:{type:'move',zone:41}})}});assert.equal(move.snapshot.game.heroes[1].zone,41);
 const recovered=await service({method:'POST',body:{type:'join',protocol:NET_VERSION,code,identity:ids[0],nick:'Hôte'}});assert.equal(recovered.snapshot.players.length,2);assert.equal(recovered.snapshot.game.heroes[1].zone,41);
});
test('expired rooms, incompatible clients and malformed requests are rejected',async()=>{
 const {store,service,code}=await servicePair();const room=store.rooms.get(code);room.expiresAt=Date.now()-1;
 await assert.rejects(service({method:'GET',auth:ids[0],query:{code}}),/expiré/);
 await assert.rejects(service({method:'POST',body:{type:'create',identity:ids[0],protocol:999}}),/dernière version/);
 await assert.rejects(service({method:'POST',body:{type:'join',identity:ids[0],protocol:NET_VERSION,code:'../../xx'}}),/invalide/);
});
test('missing production storage never pretends that rooms are persistent',async()=>{
 const service=makeService(null);assert.equal((await service({method:'GET',query:{health:'1'}})).available,false);
 await assert.rejects(service({method:'POST',body:{type:'create'}}),/activation/);
});

test('awakened powers and talent choices are applied to the authenticated owner only',()=>{
 let r=command(pair(),0,'hero',{hero:'orso'});r.protocol=2;r=command(readyAll(r),0,'start');
 r=command(r,0,'action',{action:{type:'power',target:'malik'}});
 assert.equal(r.game.heroes.find(h=>h.id==='malik').ward,2);assert.equal(r.game.heroes.find(h=>h.id==='orso').ether,2);
 assert.ok(roomCommand(r,ids[1].id,request(r,'action',{action:{type:'power',target:'orso',hero:'orso'}})).error);
 r.game.heroes.find(h=>h.id==='orso').xp=6;r=command(r,0,'action',{action:{type:'talent',talent:'reservoir'}});
 assert.deepEqual(r.game.heroes.find(h=>h.id==='orso').talents,['reservoir']);
});

test('V1.4 rooms remain resumable and retain the former rules when started',()=>{
 let r=pair();r.protocol=1;r=command(readyAll(r),0,'start');assert.ok(validSnapshot(publicRoom(r)));
 assert.equal(r.game.expansion,undefined);assert.ok(r.game.heroes.every(h=>h.evolution===undefined));
 const resumed=joinRoom(r,ids[0],'Hôte');assert.ok(validSnapshot(publicRoom(resumed)));
});
