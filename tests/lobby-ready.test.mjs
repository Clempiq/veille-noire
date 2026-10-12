import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,joinRoom,roomCommand,setPresence,publicRoom,validSnapshot} from '../room-model.js';
const ids=[1,2,3,4].map(n=>({id:String(n).repeat(32),token:String(n).repeat(48)}));
let serial=0;
const req=(r,kind,extra={})=>({id:(++serial).toString(16).padStart(32,'0'),revision:r.revision,kind,...extra});
const send=(r,i,kind,extra={})=>roomCommand(r,ids[i].id,req(r,kind,extra),42);
function ok(r,i,kind,extra={}){const x=send(r,i,kind,extra);assert.equal(x.error,undefined);assert.ok(validSnapshot(publicRoom(x.room)));return x.room;}
function lobby(count=2){let r=createRoom('ABCDEFGH',ids[0],'Hôte');for(let i=1;i<count;i++)r=joinRoom(r,ids[i],'Allié '+i);return r;}
function ready(r){for(let i=0;i<r.players.length;i++)r=ok(r,i,'lobbyReady',{ready:true});return r;}

test('every player including the host must confirm; launch clears turn readiness',()=>{
 let r=lobby(4);assert.match(send(r,0,'start').error,/Chaque joueur/);
 for(let i=1;i<4;i++)r=ok(r,i,'lobbyReady',{ready:true});
 assert.match(send(r,0,'start').error,/Chaque joueur/);assert.equal(r.game,null);
 r=ok(r,0,'lobbyReady',{ready:true});assert.equal(r.game,null);
 assert.match(send(r,1,'start').error,/hôte/);
 r=ok(r,0,'start');assert.equal(r.game.round,1);assert.ok(r.players.every(p=>!p.ready));
 r=ok(r,0,'action',{action:{type:'move',zone:41}});assert.equal(r.game.heroes[0].ap,2);
 assert.match(send(r,1,'lobbyReady',{ready:true}).error,/mission/);
});
test('confirmation belongs to sender, can be withdrawn and cannot be bypassed by stale launch',()=>{
 let r=lobby();r=ok(r,1,'lobbyReady',{ready:true,player:ids[0].id});
 assert.equal(r.players[0].ready,false);assert.equal(r.players[1].ready,true);
 r=ok(r,0,'lobbyReady',{ready:true});const launch=req(r,'start');
 r=ok(r,1,'lobbyReady',{ready:false});
 assert.match(roomCommand(r,ids[0].id,launch).error,/évolué/);
 assert.match(send(r,0,'start').error,/Chaque joueur/);
 assert.ok(send(r,1,'lobbyReady',{ready:'yes'}).error);
});
test('mission, difficulty and squad changes invalidate previous confirmations',()=>{
 for(const [who,kind,extra] of [[0,'settings',{mission:1,difficulty:'normal'}],[0,'settings',{mission:0,difficulty:'story'}],[1,'hero',{hero:'tess'}],[0,'remove',{player:ids[2].id}]]){
  const r=ok(ready(lobby(3)),who,kind,extra);assert.ok(r.players.every(p=>!p.ready));assert.ok(send(r,0,'start').error);
 }
 const r=joinRoom(ready(lobby()),ids[2],'Trois');assert.ok(r.players.every(p=>!p.ready));
});
test('unchanged choices and recovery preserve confirmation; offline players block launch',()=>{
 let r=ready(lobby());r=ok(r,0,'hero',{hero:'lina'});r=ok(r,0,'settings',{mission:0,difficulty:'normal'});
 r=joinRoom(r,ids[1],'Allié');assert.ok(r.players.every(p=>p.ready));
 r=setPresence(r,ids[1].id,false);assert.match(send(r,0,'start').error,/connectés/);
 r=setPresence(r,ids[1].id,true);assert.ok(ok(r,0,'start').game);
});
test('duplicate confirmation is idempotent and cannot restore an invalidated agreement',()=>{
 let r=lobby();const q=req(r,'lobbyReady',{ready:true});r=roomCommand(r,ids[0].id,q).room;
 r=ok(r,1,'hero',{hero:'tess'});const retry=roomCommand(r,ids[0].id,q);
 assert.equal(retry.duplicate,true);assert.equal(retry.room,r);assert.equal(r.players[0].ready,false);
});
