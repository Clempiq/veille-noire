import test from 'node:test';
import assert from 'node:assert/strict';
import {Party} from '../multiplayer.js';
import {createRoom,publicRoom} from '../room-model.js';

const identity={id:'a'.repeat(32),token:'b'.repeat(48)};
function client(){
 const states=[],statuses=[];
 const party=new Party({onState:s=>states.push(s),onStatus:(text,online)=>statuses.push({text,online})});
 // Disable timers: these tests control the sequence of network responses explicitly.
 party.schedule=()=>{};party.identity=identity;party.code='ABCDEFGH';
 const snapshot=publicRoom(createRoom(party.code,identity,'Clem'));
 party.accept(snapshot);return {party,snapshot,states,statuses};
}

test('a rejected game action keeps the connection usable for the next action',async()=>{
 const {party,snapshot}=client();let calls=0;
 party.request=async()=>{calls++;return calls===1?{snapshot,error:'La partie a évolué.'}:{snapshot:{...snapshot,revision:1}};};
 await assert.rejects(party.command({kind:'hero',hero:'iris'}),/évolué/);
 assert.equal(party.connected,true);assert.equal(party.sending,false);
 await party.command({kind:'hero',hero:'iris'});assert.equal(party.snapshot.revision,1);assert.equal(calls,2);
});

test('a lost command reply retries the same identity and board revision',async()=>{
 const {party,snapshot}=client(),requests=[];
 party.request=async body=>{requests.push(body);if(requests.length===1)throw Error('Connection lost');return {snapshot:{...snapshot,revision:1}};};
 await party.command({kind:'hero',hero:'iris'});
 assert.equal(requests.length,2);assert.deepEqual(requests[0],requests[1]);assert.equal(party.connected,true);
});

test('after an outage the unchanged board is emitted again to unlock the interface',async()=>{
 const {party,snapshot,states}=client();party.request=async()=>{throw Error('Offline');};
 await assert.rejects(party.command({kind:'hero',hero:'iris'}),/Offline/);
 assert.equal(party.connected,false);assert.equal(party.sending,false);
 party.request=async()=>({snapshot});await party.poll();
 assert.equal(party.connected,true);assert.equal(states.length,2);assert.equal(party.snapshot.revision,0);
});

test('a late poll cannot replace a more recent command result',()=>{
 const {party,snapshot,states}=client();party.accept({...snapshot,revision:2});party.accept({...snapshot,revision:1});
 assert.equal(party.snapshot.revision,2);assert.equal(states.length,2);
});

test('responses from a different room or without the player are never accepted',()=>{
 const {party,snapshot}=client();
 assert.throws(()=>party.accept({...snapshot,code:'BCDEFGHJ'}),/place/);
 assert.throws(()=>party.accept({...snapshot,host:'c'.repeat(32),players:snapshot.players.map(p=>({...p,id:'c'.repeat(32)}))}),/place/);
 assert.equal(party.snapshot,snapshot);
 party.closed=true;party.accept({...snapshot,revision:8});assert.equal(party.snapshot.revision,0);
});

test('closing a client while creation is pending cannot reopen or save the room',async()=>{
 const {party,snapshot,states,statuses}=client();let finish;
 party.request=()=>new Promise(resolve=>{finish=resolve;});
 party.persist=()=>assert.fail('A closed room must not overwrite recovery credentials');
 const opening=party.open({host:true});party.closed=true;finish({snapshot});await opening;
 assert.equal(states.length,1);const count=statuses.length;
 party.status('Delayed failure',false);assert.equal(statuses.length,count);
});
