import {extraWordLengths,type ExtraLetters} from './settings.ts';
export const GAME_WIDTH = 1200;
export const GAME_HEIGHT = 720;
export const COMBO_SECONDS = 3.5;
export const BOMB_PENALTY_SECONDS = 5;
export const SWORD_MAX_SPEED = 520;
export const SWORD_ACCELERATION = 2600;
export const SWORD_BRAKING = 3300;
export const SWORD_MIN_SLICE_SPEED = 130;

export const WORD_BANK = [
  ['CAT','DOG','SUN','SKY','RUN','MAP','BOX','SIT','RED','PEN','CUP','ANT'],
  ['STUDY','APPLE','WATER','MUSIC','TRAIN','SMILE','PLANT','SPACE','LIGHT','DREAM','HAPPY','EARTH'],
  ['NETWORK','PICTURE','TEACHER','JOURNEY','ANIMALS','BALANCE','FREEDOM','SCIENCE','LIBRARY','CAPTAIN','COUNTRY','MORNING']
] as const;
export const STAGE_BONUSES = [100,200,300] as const;
export const MAX_BOMBS_PER_STAGE = [0,1,2] as const;

export type Vector = { x: number; y: number };
export type Rect = { minX: number; minY: number; maxX: number; maxY: number };
export type Edge = 'left' | 'right' | 'top' | 'bottom';
export type Path = { edge: Edge; start: Vector; end: Vector; bend: number; duration: number };
export type RankResult = {
  id: string; player: string; score: number; playSeconds: number; penaltySeconds: number;
  rankSeconds: number; maxCombo: number; wrongHits: number; bombHits: number;
  words: string[]; date: string; mode: 'camera' | 'keyboard'; fairMode: boolean;
  baseScore?: number; timeBonus?: number; scoringVersion?: 2;
  settingsKey?: string; scoreTimeSeconds?: number; pointsPerSecond?: number; completedLetters?: number;
};

export function clamp(v: number, a: number, b: number) { return Math.min(b, Math.max(a,v)); }
export function length(v: Vector) { return Math.hypot(v.x,v.y); }
export function normalize(v: Vector): Vector { const l=length(v); return l > 1e-6 ? {x:v.x/l,y:v.y/l} : {x:0,y:0}; }
export function distance(a: Vector,b: Vector) { return Math.hypot(a.x-b.x,a.y-b.y); }
export function interpolate(a: Vector,b: Vector,t: number): Vector { return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}; }
export function hitPointsForCombo(comboAfterHit: number) { return 100 + 25 * Math.max(0, comboAfterHit-1); }
export function rankingSeconds(playSeconds: number,bombs: number) { return playSeconds + bombs * BOMB_PENALTY_SECONDS; }
// Final = base points + (configurable scoring reference - ranking time) * points per second.
// Ranking time includes bomb penalties. Bonus may be negative after 50s.
export function finishTimeBonus(rankSeconds: number,scoreTimeSeconds=50,pointsPerSecond=25): number {
  return Math.round((scoreTimeSeconds-rankSeconds)*pointsPerSecond*100)/100;
}
export function finalScore(baseScore:number,rankSeconds:number,scoreTimeSeconds=50,pointsPerSecond=25):number {
  return Math.round((baseScore+finishTimeBonus(rankSeconds,scoreTimeSeconds,pointsPerSecond))*100)/100;
}
export function theoreticalMaxScore(extraLetters:ExtraLetters=0) {
  const letters=15+extraLetters;
  const bonus=[3,5,7,...extraWordLengths(extraLetters)].reduce((sum,n)=>sum+(STAGE_BONUSES[[3,5,7].indexOf(n)]??0),0);
  return Array.from({length:letters},(_,i)=>hitPointsForCombo(i+1)).reduce((a,b)=>a+b,0)+bonus;
}
export function pickWords(rng: ()=>number=Math.random, previous: readonly string[]=[], extras:ExtraLetters=0) {
  const lengths=[3,5,7,...extraWordLengths(extras)];
  const selected:string[]=[];
  for(const [index,wordLength] of lengths.entries()){
    const bank=WORD_BANK[[3,5,7].indexOf(wordLength)];
    const options=bank.filter(word=>word!==previous[index]&&!selected.includes(word));
    const fallback=bank.filter(word=>!selected.includes(word));
    const candidates=options.length?options:fallback.length?fallback:bank;
    selected.push(candidates[Math.floor(rng()*candidates.length)]??bank[0]);
  }
  return selected;
}
export function seededRandom(seed: number): ()=>number {
  let state=seed>>>0;
  return ()=>{ state=(state+0x6D2B79F5)>>>0; let t=state; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
}
export function rankByScore(a: RankResult,b: RankResult) { return b.score-a.score || a.rankSeconds-b.rankSeconds || a.date.localeCompare(b.date); }
export function rankByTime(a: RankResult,b: RankResult) { return a.rankSeconds-b.rankSeconds || b.score-a.score || a.date.localeCompare(b.date); }
export function bestPerPlayer(list: RankResult[], comparator: (a: RankResult,b: RankResult)=>number): RankResult[] {
  const sorted=[...list].sort(comparator);
  const seen=new Set<string>();
  return sorted.filter(result=>{const name=result.player.trim().toLocaleLowerCase('vi-VN');if(seen.has(name))return false;seen.add(name);return true;}).slice(0,5);
}

export function pointSegmentDistance(p: Vector,a: Vector,b: Vector) {
  const vx=b.x-a.x,vy=b.y-a.y,denom=vx*vx+vy*vy;
  const t=denom<1e-9?0:clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/denom,0,1);
  return distance(p,{x:a.x+t*vx,y:a.y+t*vy});
}
export function swordSweepHitsFruit(oldSword: Vector,newSword: Vector,oldFruit: Vector,newFruit: Vector,oldDir: Vector,newDir: Vector,radius: number) {
  // Chỉ những nhát kiếm chuyển động mới có hiệu lực; phía ngoài kiểm tra ngưỡng tốc độ.
  for(const offset of [24,48,72,96]) {
    const before={x:oldSword.x+oldDir.x*offset-oldFruit.x,y:oldSword.y+oldDir.y*offset-oldFruit.y};
    const after={x:newSword.x+newDir.x*offset-newFruit.x,y:newSword.y+newDir.y*offset-newFruit.y};
    if(pointSegmentDistance({x:0,y:0},before,after) <= radius) return true;
  }
  return false;
}
export function evalPath(path: Path,t: number): Vector {
  const u=clamp(t,0,1);const base=interpolate(path.start,path.end,u);
  const delta=normalize({x:path.end.x-path.start.x,y:path.end.y-path.start.y});
  const offset=path.bend*Math.sin(Math.PI*u);
  return {x:base.x-delta.y*offset,y:base.y+delta.x*offset};
}
export function pathInsideCore(path: Path, core: Rect={minX:240,minY:160,maxX:960,maxY:560}): boolean {
  for(let step=0;step<=40;step++) {const p=evalPath(path,step/40);if(p.x>=core.minX && p.x<=core.maxX && p.y>=core.minY && p.y<=core.maxY) return true;}
  return false;
}
export function makeFruitPath(rng: ()=>number, edge?: Edge, radius=43, speedMultiplier=1): Path {
  const directions: Edge[]=['left','right','top','bottom'];
  const side=edge ?? directions[Math.floor(rng()*directions.length)];
  const lane0=.30+rng()*.40,lane1=.30+rng()*.40;
  const pad=radius+14;
  const horizontal=side==='left'||side==='right';
  const start=side==='left'?{x:-pad,y:lane0*GAME_HEIGHT}:side==='right'?{x:GAME_WIDTH+pad,y:lane0*GAME_HEIGHT}:side==='top'?{x:lane0*GAME_WIDTH,y:-pad}:{x:lane0*GAME_WIDTH,y:GAME_HEIGHT+pad};
  const end=side==='left'?{x:GAME_WIDTH+pad,y:lane1*GAME_HEIGHT}:side==='right'?{x:-pad,y:lane1*GAME_HEIGHT}:side==='top'?{x:lane1*GAME_WIDTH,y:GAME_HEIGHT+pad}:{x:lane1*GAME_WIDTH,y:-pad};
  // Mục tiêu xuất hiện đủ ~5 giây; kiểm tra quỹ đạo đi qua vùng có thể tiếp cận.
  const duration=(4.75+rng()*1.05)/speedMultiplier;
  const candidate={edge:side,start,end,bend:(rng()*2-1)*(horizontal?40:34),duration};
  return pathInsideCore(candidate)?candidate:{...candidate,bend:0};
}
export function swordTravelSeconds(displacement: number, speedMultiplier=1): number {
  const d=Math.max(0,displacement), maxSpeed=SWORD_MAX_SPEED*speedMultiplier, acceleration=SWORD_ACCELERATION*speedMultiplier;
  const tRamp=maxSpeed/acceleration;
  const dRamp=.5*acceleration*tRamp*tRamp;
  return d<=dRamp ? Math.sqrt(2*d/acceleration) : tRamp+(d-dRamp)/maxSpeed;
}
export function pathReachableFromSword(path: Path, swordPosition: Vector, reactionSeconds=.55, swordSpeed=1): boolean {
  // Cho phép người mới ~0,55 giây để nhận diện chữ và bắt đầu điều khiển.
  // Sau đó thử tìm điểm cắt khả thi trước khi hoa quả rời vùng chơi.
  for(let t=.55;t<path.duration-.35;t+=.12) {
    const p=evalPath(path,t/path.duration);
    if(p.x<65||p.x>GAME_WIDTH-65||p.y<65||p.y>GAME_HEIGHT-65)continue;
    if(swordTravelSeconds(distance(swordPosition,p),swordSpeed)+reactionSeconds+.08<=t)return true;
  }
  return false;
}
export function updateSwordMotion(position: Vector, velocity: Vector, inputDirection: Vector, braking: boolean, dt: number, speedMultiplier=1) {
  const target=braking?{x:0,y:0}:{x:inputDirection.x*SWORD_MAX_SPEED*speedMultiplier,y:inputDirection.y*SWORD_MAX_SPEED*speedMultiplier};
  const delta={x:target.x-velocity.x,y:target.y-velocity.y};
  const magnitude=length(delta);const maxDelta=(braking?SWORD_BRAKING:SWORD_ACCELERATION)*speedMultiplier*dt;
  const factor=magnitude>maxDelta?maxDelta/magnitude:1;
  const nextVelocity={x:velocity.x+delta.x*factor,y:velocity.y+delta.y*factor};
  let x=position.x+nextVelocity.x*dt,y=position.y+nextVelocity.y*dt;
  x=clamp(x,55,GAME_WIDTH-55);y=clamp(y,55,GAME_HEIGHT-55);
  if(x<=55 || x>=GAME_WIDTH-55) nextVelocity.x=0;
  if(y<=55 || y>=GAME_HEIGHT-55) nextVelocity.y=0;
  return {position:{x,y},velocity:nextVelocity};
}

// Camera target-seeking mode (the keyboard continues to use updateSwordMotion).
// Smoothly approach the fingertip reticle, slowing down near it instead of
// continuously flying in the last orientation of the fingers.
export function steerSwordToTarget(position:Vector, velocity:Vector, target:Vector, dt:number, speedMultiplier=1) {
  const delta={x:target.x-position.x,y:target.y-position.y};
  const dist=length(delta);
  if(dist<14)return updateSwordMotion(position,velocity,{x:0,y:0},true,dt,speedMultiplier);
  const desiredSpeed=Math.min(SWORD_MAX_SPEED*speedMultiplier,Math.max(0,(dist-10)*4.5*speedMultiplier));
  const direction=normalize(delta);
  const next=updateSwordMotion(position,velocity,{
    x:direction.x*desiredSpeed/(SWORD_MAX_SPEED*speedMultiplier),
    y:direction.y*desiredSpeed/(SWORD_MAX_SPEED*speedMultiplier)
  },false,dt,speedMultiplier);
  return next;
}
