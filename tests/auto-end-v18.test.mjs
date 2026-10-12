import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../engine.js';
import {autoEndPlan,freeTalents} from '../ui-state.js';

const fresh=(ids=['basile','malik'])=>createGame(0,ids,'normal',7);
const spendAll=s=>{for(const h of s.heroes)h.ap=0;return s;};

test('no automatic end while a standing survivor still has actions',()=>{
 const s=fresh();assert.equal(autoEndPlan(s),null);
 s.heroes[0].ap=0;assert.equal(autoEndPlan(s),null);
});
test('solo: the round ends once every standing survivor is at 0 action',()=>{
 const s=spendAll(fresh());const plan=autoEndPlan(s);
 assert.equal(plan.scope,'round');assert.deepEqual(plan.free,[]);
});
test('a downed survivor does not block the automatic end',()=>{
 const s=fresh();s.heroes[0].ap=0;s.heroes[1].hp=0;s.heroes[1].ap=3;
 assert.equal(autoEndPlan(s).scope,'round');
});
test('free talents are reported, not lost silently',()=>{
 const s=spendAll(fresh(['iris','basile']));
 const plan=autoEndPlan(s);
 assert.ok(plan.free.some(f=>f.hero==='iris'&&f.what==='se déplacer'));
 s.heroes[0].freeMove=true;assert.deepEqual(freeTalents(s,s.heroes[0]),[]);
});
test('online: only the player’s own survivor matters',()=>{
 const s=fresh();s.heroes[0].ap=0;
 assert.equal(autoEndPlan(s,'basile').scope,'turn');
 assert.equal(autoEndPlan(s,'malik'),null);
 s.heroes[0].hp=0;assert.equal(autoEndPlan(s,'basile'),null);
});
test('nothing happens once the expedition is over',()=>{
 const s=spendAll(fresh());s.status='won';assert.equal(autoEndPlan(s),null);
});
