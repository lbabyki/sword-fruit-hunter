import test from 'node:test';
import assert from 'node:assert/strict';
import {readResults,saveResult,getTopScores,getTopTimes} from '../src/game/storage.ts';
const key='sword-fruit:leaderboard:v1';
const data=new Map();
globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}};
const row=(id,player,score,rankSeconds,extra={})=>({id,player,score,rankSeconds,playSeconds:rankSeconds,penaltySeconds:0,maxCombo:2,wrongHits:0,bombHits:0,words:['CAT','STUDY','NETWORK'],date:'2026-10-17T00:00:00.000Z',mode:'camera',fairMode:true,...extra});
test('legacy V1.2 rows are migrated in memory without doubling the bonus',()=>{
  data.set(key,JSON.stringify([row('old','A',3375,27.6)]));
  const migrated=readResults()[0];
  assert.equal(migrated.baseScore,3375);
  assert.equal(migrated.timeBonus,560);
  assert.equal(migrated.score,3935);
  assert.equal(migrated.scoringVersion,2);
  saveResult(row('new','B',3935,27.6,{baseScore:3375,timeBonus:560,scoringVersion:2}));
  assert.deepEqual(readResults().map(x=>x.score),[3935,3935]);
});
test('leaderboard stores five unique people per ranking',()=>{
  data.clear();
  for(let i=0;i<7;i++)saveResult(row(String(i),'Player '+i,1000+i*250,60-i));
  saveResult(row('dup','player 6',3100,60));
  assert.equal(getTopScores().length,5);
  assert.equal(getTopTimes().length,5);
  assert.equal(getTopScores()[0].id,'dup');
  assert.equal(getTopTimes()[0].player,'Player 6');
});
