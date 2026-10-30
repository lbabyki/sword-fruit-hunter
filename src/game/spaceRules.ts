import {clamp,distance,pointSegmentDistance,seededRandom,type Vector} from './rules.ts';
export type SpaceMode='endless'|'goal';
export type MeteorRoute='horizontal'|'falling'|'rising';
export type SpaceObject={id:number;kind:'meteor'|'star';pos:Vector;previous:Vector;velocity:Vector;radius:number;route?:MeteorRoute};
export type SpaceScore={id:string;player:string;mode:SpaceMode;score:number;survivalSeconds:number;livesLeft:number;stars:number;date:string;settingsKey:string;inputMode:'camera'|'keyboard';qualified:boolean;completed:boolean};
export type SpacePhase='idle'|'playing'|'paused'|'finished'|'failed';
export type SpaceStatus={phase:SpacePhase;score:number;stars:number;lives:number;maxLives:number;survivalSeconds:number;difficulty:number;meteoCount:number;goal:number;mode:SpaceMode;hint:string};
export type SpaceSettings={mode:SpaceMode;goal:number;lives:number;meteorSpeed:number;shipSpeed:number;progressive:boolean};
export const SPACE_DEFAULTS:Readonly<SpaceSettings>=Object.freeze({mode:'endless',goal:1000,lives:3,meteorSpeed:1,shipSpeed:1,progressive:true});
const clampStep=(v:unknown,f:number,min:number,max:number,step:number)=>typeof v==='number'&&Number.isFinite(v)?Number((Math.round(clamp(v,min,max)/step)*step).toFixed(2)):f;
export function normalizeSpaceSettings(raw:unknown):SpaceSettings {
 const p=raw&&typeof raw==='object'?raw as Partial<SpaceSettings>:{};
 return {mode:p.mode==='goal'?'goal':'endless',goal:clampStep(p.goal,1000,500,3000,500),lives:clampStep(p.lives,3,1,5,1),meteorSpeed:clampStep(p.meteorSpeed,1,.5,2,.1),shipSpeed:clampStep(p.shipSpeed,1,.5,2,.1),progressive:typeof p.progressive==='boolean'?p.progressive:true};
}
export const spaceSettingsKey=(s:SpaceSettings)=>{const x=normalizeSpaceSettings(s);return `space-v2:${x.mode}:${x.goal}:${x.lives}:${x.meteorSpeed}:${x.shipSpeed}:${Number(x.progressive)}`;};
export function spaceDifficulty(seconds:number,progressive:boolean){return progressive?Math.min(1.6,1+Math.floor(Math.max(0,seconds)/30)*.15):1;}
export function maxMeteors(seconds:number,progressive:boolean){return progressive?seconds>=90?6:seconds>=30?5:4:4;}
/** Three right-to-left trajectories, with edge lanes explicitly permitted. */
export function meteorTrajectory(rand:()=>number=Math.random,speedMultiplier=1,difficulty=1,w=1200,h=720):{position:Vector;velocity:Vector;radius:number;route:MeteorRoute}{
 const radius=28+rand()*20;
 const choice=rand();
 const route: MeteorRoute=choice<.45?'horizontal':choice<.725?'falling':'rising';
 const y0=route==='horizontal'?radius+rand()*(h-2*radius):route==='falling'?radius+rand()*h*.28:h-radius-rand()*h*.28;
 const y1=route==='horizontal'?y0+(-28+rand()*56):route==='falling'?h-radius-rand()*h*.30:radius+rand()*h*.30;
 const dx=-w-2*radius-150;
 const dy=y1-y0;
 const magnitude=Math.hypot(dx,dy);
 const speed=(210+rand()*90)*speedMultiplier*difficulty;
 return {position:{x:w+radius+75,y:y0},velocity:{x:dx/magnitude*speed,y:dy/magnitude*speed},radius,route};
}
export function sweptCircleCollision(a0:Vector,a1:Vector,ra:number,b0:Vector,b1:Vector,rb:number){
 return pointSegmentDistance({x:0,y:0},{x:a0.x-b0.x,y:a0.y-b0.y},{x:a1.x-b1.x,y:a1.y-b1.y})<=ra+rb;
}
/** Reticle target with intentional right-side warning strip. */
export function boundShipTarget(target:Vector,w=1200,h=720):Vector{return {x:clamp(target.x,38,w*.82),y:clamp(target.y,42,h-42)};}
export function nextSpaceScore(stars:number){return stars*100;}
export function compareSpaceScores(a:SpaceScore,b:SpaceScore,mode:SpaceMode){
 return mode==='endless'?b.score-a.score||b.survivalSeconds-a.survivalSeconds:a.survivalSeconds-b.survivalSeconds||b.livesLeft-a.livesLeft;
}
export function topSpaceScores(scores:SpaceScore[],mode:SpaceMode,key:string){
 const filtered=scores.filter(s=>s.mode===mode&&s.settingsKey===key&&s.completed);
 const names=new Set<string>();
 return filtered.sort((a,b)=>compareSpaceScores(a,b,mode)).filter(s=>{const id=s.player.trim().toLowerCase();if(names.has(id))return false;names.add(id);return true;}).slice(0,5);
}
export function safeMeteorSpawn(candidate:{position:Vector;velocity:Vector;radius:number},existing:SpaceObject[],ship:Vector,w=1200){
 // Avoid immediate danger from new meteor in the right-side warning strip.
 const firstReach=Math.max(.65, (candidate.position.x-w*.82)/Math.max(1,-candidate.velocity.x));
 const predicted={x:candidate.position.x+candidate.velocity.x*firstReach,y:candidate.position.y+candidate.velocity.y*firstReach};
 if(distance(predicted,ship)<candidate.radius+85)return false;
 // Do not create an impenetrable wall of similar-height asteroids at similar x.
 return !existing.some(m=>m.kind==='meteor'&&Math.abs(m.pos.x-candidate.position.x)<165&&Math.abs(m.pos.y-candidate.position.y)<145);
}
export function seededSpaceRandom(seed:number){return seededRandom(seed);}
