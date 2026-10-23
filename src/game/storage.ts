import {bestPerPlayer,rankByScore,rankByTime,finishTimeBonus,finalScore,type RankResult} from './rules.ts';
const KEY='sword-fruit:leaderboard:v1';
const LAST='sword-fruit:last-words:v1';
function valid(x:unknown):x is RankResult {
  if(!x||typeof x!=='object') return false;
  const r=x as Partial<RankResult>;
  return typeof r.player==='string'&&r.player.length<=40&&typeof r.score==='number'&&Number.isFinite(r.score)&&typeof r.rankSeconds==='number'&&Number.isFinite(r.rankSeconds)&&typeof r.id==='string'&&typeof r.date==='string';
}
export function readResults():RankResult[] {
  try {const parsed:unknown=JSON.parse(localStorage.getItem(KEY)??'[]');return Array.isArray(parsed)?parsed.filter(valid).slice(-100).map(r=>{
    // V1.2 stored base points in score. Upgrade old localStorage rows in memory.
    if(r.scoringVersion===2)return r;
    const rankTime=r.rankSeconds;
    return {...r,baseScore:r.score,timeBonus:finishTimeBonus(rankTime),score:finalScore(r.score,rankTime),scoringVersion:2 as const};
  }):[];}catch{return [];}
}
export function saveResult(result:RankResult) {const next=[...readResults(),result].slice(-100);localStorage.setItem(KEY,JSON.stringify(next));}
export function getTopScores(results=readResults()) {return bestPerPlayer(results,rankByScore);}
export function getTopTimes(results=readResults()) {return bestPerPlayer(results,rankByTime);}
export function readLastWords():string[] {try {const x=JSON.parse(localStorage.getItem(LAST)??'[]');return Array.isArray(x)&&x.every(y=>typeof y==='string')?x:[];}catch{return [];}}
export function saveLastWords(words:string[]) {localStorage.setItem(LAST,JSON.stringify(words));}
