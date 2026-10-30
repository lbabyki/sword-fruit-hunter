import {clamp,distance,pointSegmentDistance,seededRandom,type Vector} from './rules.ts';
export type SpaceMode='endless'|'goal';
export type MeteorRoute='horizontal'|'falling'|'rising';
export type SpaceObjectKind='meteor'|'star'|'shield';
export type MeteorVariant='normal'|'heavy'|'splitter'|'fragment';
export type SpaceObject={id:number;kind:SpaceObjectKind;pos:Vector;previous:Vector;velocity:Vector;radius:number;route?:MeteorRoute;variant?:MeteorVariant;special?:boolean;risk?:boolean;splitDone?:boolean;nearAwarded?:boolean};
export type SpaceScore={id:string;player:string;mode:SpaceMode;score:number;survivalSeconds:number;livesLeft:number;stars:number;date:string;settingsKey:string;inputMode:'camera'|'keyboard';qualified:boolean;completed:boolean;nearMisses?:number;dashUses?:number};
export type SpacePhase='idle'|'playing'|'paused'|'finished'|'failed';
export type SpaceStatus={phase:SpacePhase;score:number;stars:number;lives:number;maxLives:number;survivalSeconds:number;difficulty:number;meteoCount:number;goal:number;mode:SpaceMode;hint:string;dashReady:boolean;dashActive:boolean;dashCooldown:number;shield:number;starCombo:number;nearMisses:number;dashUses:number;warning:boolean};
export type SpaceSettings={
 mode:SpaceMode;goal:number;lives:number;meteorSpeed:number;shipSpeed:number;progressive:boolean;
 timeLimit:number;immunitySeconds:number;
 spawnInterval:number;maxConcurrent:number;meteorSize:number;
 horizontalWeight:number;fallingWeight:number;risingWeight:number;
 difficultyEvery:number;difficultyIncrease:number;
 shipAcceleration:number;shipBrake:number;shipHitbox:number;
 starsEnabled:boolean;starPoints:number;starInterval:number;starMax:number;starSpeed:number;
 starCombo:boolean;starComboSeconds:number;specialStars:boolean;
 heavyMeteors:boolean;meteorClusters:boolean;splitterMeteors:boolean;
 shieldEnabled:boolean;dashEnabled:boolean;dashBoost:number;dashCooldown:number;
 nearMiss:boolean;meteorWaves:boolean;riskStars:boolean;
 warning:boolean;screenShake:boolean;engineTrail:boolean;aimSensitivity:number;autoRotate:boolean;reducedMotion:boolean;meteorTrail:boolean;soundVolume:number;
};
export const SPACE_DEFAULTS:Readonly<SpaceSettings>=Object.freeze({
 mode:'endless',goal:1000,lives:3,meteorSpeed:1,shipSpeed:1,progressive:true,
 timeLimit:0,immunitySeconds:1.2,spawnInterval:1.6,maxConcurrent:6,meteorSize:1,
 horizontalWeight:45,fallingWeight:27.5,risingWeight:27.5,
 difficultyEvery:30,difficultyIncrease:15,
 shipAcceleration:1,shipBrake:1,shipHitbox:1,
 starsEnabled:true,starPoints:100,starInterval:3,starMax:2,starSpeed:1,
 starCombo:false,starComboSeconds:4,specialStars:false,
 heavyMeteors:false,meteorClusters:false,splitterMeteors:false,
 shieldEnabled:false,dashEnabled:false,dashBoost:2.8,dashCooldown:3,
 nearMiss:false,meteorWaves:false,riskStars:false,
 warning:true,screenShake:true,engineTrail:true,aimSensitivity:1,autoRotate:true,reducedMotion:false,meteorTrail:true,soundVolume:70
});
export type SpacePreset='Easy'|'Normal'|'Hard'|'Extreme'|'Custom';
export const SPACE_PRESETS:Record<Exclude<SpacePreset,'Custom'>,Partial<SpaceSettings>>={
 Easy:{lives:5,meteorSpeed:.7,spawnInterval:2.2,maxConcurrent:3,starInterval:2.5,progressive:false},
 Normal:{},
 Hard:{lives:2,meteorSpeed:1.4,spawnInterval:1,maxConcurrent:6,starInterval:3.5,progressive:true},
 Extreme:{lives:1,meteorSpeed:1.8,spawnInterval:.7,maxConcurrent:8,starInterval:4,progressive:true}
};
const step=(v:unknown,f:number,min:number,max:number,inc:number)=>typeof v==='number'&&Number.isFinite(v)?Number((Math.round(clamp(v,min,max)/inc)*inc).toFixed(3)):f;
export function normalizeSpaceSettings(raw:unknown):SpaceSettings {
 const p=raw&&typeof raw==='object'?raw as Partial<SpaceSettings>:{};
 const d=SPACE_DEFAULTS;
 const result:SpaceSettings={
  mode:p.mode==='goal'?'goal':'endless',goal:step(p.goal,d.goal,100,10000,100),lives:step(p.lives,d.lives,1,10,1),
  meteorSpeed:step(p.meteorSpeed,d.meteorSpeed,.5,3,.1),shipSpeed:step(p.shipSpeed,d.shipSpeed,.5,2,.1),progressive:typeof p.progressive==='boolean'?p.progressive:d.progressive,
  timeLimit:step(p.timeLimit,d.timeLimit,0,600,10),immunitySeconds:step(p.immunitySeconds,d.immunitySeconds,0,3,.1),
  spawnInterval:step(p.spawnInterval,d.spawnInterval,.5,4,.1),maxConcurrent:step(p.maxConcurrent,d.maxConcurrent,1,12,1),meteorSize:step(p.meteorSize,d.meteorSize,.5,2,.1),
  horizontalWeight:step(p.horizontalWeight,d.horizontalWeight,0,100,.5),fallingWeight:step(p.fallingWeight,d.fallingWeight,0,100,.5),risingWeight:step(p.risingWeight,d.risingWeight,0,100,.5),
  difficultyEvery:step(p.difficultyEvery,d.difficultyEvery,10,120,5),difficultyIncrease:step(p.difficultyIncrease,d.difficultyIncrease,0,30,1),
  shipAcceleration:step(p.shipAcceleration,d.shipAcceleration,.5,2,.1),shipBrake:step(p.shipBrake,d.shipBrake,.5,2,.1),shipHitbox:step(p.shipHitbox,d.shipHitbox,.7,1.2,.1),
  starsEnabled:typeof p.starsEnabled==='boolean'?p.starsEnabled:d.starsEnabled,starPoints:step(p.starPoints,d.starPoints,25,500,25),starInterval:step(p.starInterval,d.starInterval,1,10,.5),starMax:step(p.starMax,d.starMax,1,5,1),starSpeed:step(p.starSpeed,d.starSpeed,.5,2,.1),
  starCombo:typeof p.starCombo==='boolean'?p.starCombo:d.starCombo,starComboSeconds:step(p.starComboSeconds,d.starComboSeconds,1,10,.5),specialStars:typeof p.specialStars==='boolean'?p.specialStars:d.specialStars,
  heavyMeteors:typeof p.heavyMeteors==='boolean'?p.heavyMeteors:d.heavyMeteors,meteorClusters:typeof p.meteorClusters==='boolean'?p.meteorClusters:d.meteorClusters,splitterMeteors:typeof p.splitterMeteors==='boolean'?p.splitterMeteors:d.splitterMeteors,
  shieldEnabled:typeof p.shieldEnabled==='boolean'?p.shieldEnabled:d.shieldEnabled,dashEnabled:typeof p.dashEnabled==='boolean'?p.dashEnabled:d.dashEnabled,
  dashBoost:step(p.dashBoost,d.dashBoost,1.5,4,.1),dashCooldown:step(p.dashCooldown,d.dashCooldown,1,10,.5),
  nearMiss:typeof p.nearMiss==='boolean'?p.nearMiss:d.nearMiss,meteorWaves:typeof p.meteorWaves==='boolean'?p.meteorWaves:d.meteorWaves,riskStars:typeof p.riskStars==='boolean'?p.riskStars:d.riskStars,
  warning:typeof p.warning==='boolean'?p.warning:d.warning,screenShake:typeof p.screenShake==='boolean'?p.screenShake:d.screenShake,engineTrail:typeof p.engineTrail==='boolean'?p.engineTrail:d.engineTrail,aimSensitivity:step(p.aimSensitivity,d.aimSensitivity,.5,2,.1),autoRotate:typeof p.autoRotate==='boolean'?p.autoRotate:d.autoRotate,reducedMotion:typeof p.reducedMotion==='boolean'?p.reducedMotion:d.reducedMotion,meteorTrail:typeof p.meteorTrail==='boolean'?p.meteorTrail:d.meteorTrail,soundVolume:step(p.soundVolume,d.soundVolume,0,100,5)
 };
 if(result.horizontalWeight+result.fallingWeight+result.risingWeight===0){result.horizontalWeight=45;result.fallingWeight=27.5;result.risingWeight=27.5;}
 return result;
}
export const applySpacePreset=(preset:Exclude<SpacePreset,'Custom'>,previous?:SpaceSettings)=>normalizeSpaceSettings({...SPACE_DEFAULTS,...(previous?{mode:previous.mode,goal:previous.goal}:{}),...SPACE_PRESETS[preset]});
const legacyFields=['mode','goal','lives','meteorSpeed','shipSpeed','progressive'] as const;
const cosmeticFields=['warning','screenShake','engineTrail','autoRotate','reducedMotion','meteorTrail','soundVolume'] as const;
export const spaceSettingsKey=(s:SpaceSettings)=>{
 const x=normalizeSpaceSettings(s);
 const allDefaults=Object.keys(SPACE_DEFAULTS).filter(k=>!legacyFields.includes(k as typeof legacyFields[number])&&!cosmeticFields.includes(k as typeof cosmeticFields[number])).every(k=>JSON.stringify(x[k as keyof SpaceSettings])===JSON.stringify(SPACE_DEFAULTS[k as keyof SpaceSettings]));
 if(allDefaults)return `space-v2:${x.mode}:${x.goal}:${x.lives}:${x.meteorSpeed}:${x.shipSpeed}:${Number(x.progressive)}`;
 return `space-v22:${Object.keys(SPACE_DEFAULTS).sort().filter(k=>!cosmeticFields.includes(k as typeof cosmeticFields[number])).map(k=>String(x[k as keyof SpaceSettings])).join(':')}`;
};
export function spaceDifficulty(seconds:number,progressive:boolean,every=30,increase=15){return progressive?Math.min(1.6,1+Math.floor(Math.max(0,seconds)/every)*increase/100):1;}
export function maxMeteors(seconds:number,progressive:boolean,base=4){return progressive?Math.min(12,base+(seconds>=90?2:seconds>=30?1:0)):base;}
export function meteorTrajectory(rand:()=>number=Math.random,speedMultiplier=1,difficulty=1,w=1200,h=720,opts?:Partial<SpaceSettings>):{position:Vector;velocity:Vector;radius:number;route:MeteorRoute}{
 const s=opts??SPACE_DEFAULTS;
 const radius=(28+rand()*20)*(s.meteorSize??1);
 const weights=[Math.max(0,s.horizontalWeight??45),Math.max(0,s.fallingWeight??27.5),Math.max(0,s.risingWeight??27.5)];
 const total=weights.reduce((a,b)=>a+b,0)||100;
 const choice=rand()*total;
 const route:MeteorRoute=choice<weights[0]?'horizontal':choice<weights[0]+weights[1]?'falling':'rising';
 const y0=route==='horizontal'?radius+rand()*(h-2*radius):route==='falling'?radius+rand()*h*.28:h-radius-rand()*h*.28;
 const y1=route==='horizontal'?y0+(-28+rand()*56):route==='falling'?h-radius-rand()*h*.30:radius+rand()*h*.30;
 const dx=-w-2*radius-150;const dy=y1-y0;const mag=Math.hypot(dx,dy);
 const speed=(210+rand()*90)*speedMultiplier*difficulty;
 return {position:{x:w+radius+75,y:y0},velocity:{x:dx/mag*speed,y:dy/mag*speed},radius,route};
}
export function sweptCircleCollision(a0:Vector,a1:Vector,ra:number,b0:Vector,b1:Vector,rb:number){return pointSegmentDistance({x:0,y:0},{x:a0.x-b0.x,y:a0.y-b0.y},{x:a1.x-b1.x,y:a1.y-b1.y})<=ra+rb;}
export function boundShipTarget(target:Vector,w=1200,h=720):Vector{return {x:clamp(target.x,38,w*.82),y:clamp(target.y,42,h-42)};}
export function nextSpaceScore(stars:number){return stars*100;}
export function compareSpaceScores(a:SpaceScore,b:SpaceScore,mode:SpaceMode){return mode==='endless'?b.score-a.score||b.survivalSeconds-a.survivalSeconds:a.survivalSeconds-b.survivalSeconds||b.livesLeft-a.livesLeft;}
export function topSpaceScores(scores:SpaceScore[],mode:SpaceMode,key:string){const names=new Set<string>();return scores.filter(s=>s.mode===mode&&s.settingsKey===key&&s.completed).sort((a,b)=>compareSpaceScores(a,b,mode)).filter(s=>{const n=s.player.trim().toLowerCase();if(names.has(n))return false;names.add(n);return true;}).slice(0,5);}
export function safeMeteorSpawn(candidate:{position:Vector;velocity:Vector;radius:number},existing:SpaceObject[],ship:Vector,w=1200){
 const reach=Math.max(.65,(candidate.position.x-w*.82)/Math.max(1,-candidate.velocity.x));
 const at={x:candidate.position.x+candidate.velocity.x*reach,y:candidate.position.y+candidate.velocity.y*reach};
 if(distance(at,ship)<candidate.radius+85)return false;
 return !existing.some(m=>m.kind==='meteor'&&Math.abs(m.pos.x-candidate.position.x)<165&&Math.abs(m.pos.y-candidate.position.y)<145);
}
export function steerShip(position:Vector,velocity:Vector,target:Vector,dt:number,s:SpaceSettings){
 const t=boundShipTarget(target),delta={x:t.x-position.x,y:t.y-position.y},dist=Math.hypot(delta.x,delta.y);
 const maxV=600*s.shipSpeed*1.15,accel=3200*s.shipAcceleration,brake=4200*s.shipBrake;
 const dir=dist>0?{x:delta.x/dist,y:delta.y/dist}:{x:0,y:0};
 const safeSpeed=Math.min(maxV,Math.sqrt(2*brake*Math.max(0,dist-10)));
 const desired=dist<=10?{x:0,y:0}:{x:dir.x*safeSpeed,y:dir.y*safeSpeed};
 const dv={x:desired.x-velocity.x,y:desired.y-velocity.y};const dvMag=Math.hypot(dv.x,dv.y);
 const limit=(safeSpeed<Math.hypot(velocity.x,velocity.y)?brake:accel)*dt;
 const scale=dvMag>limit?limit/dvMag:1;
 const nextV={x:velocity.x+dv.x*scale,y:velocity.y+dv.y*scale};
 const nextP=boundShipTarget({x:position.x+nextV.x*dt,y:position.y+nextV.y*dt});
 return {position:nextP,velocity:nextV};
}
export const seededSpaceRandom=(seed:number)=>seededRandom(seed);
