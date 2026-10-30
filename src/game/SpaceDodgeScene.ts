import Phaser from 'phaser';
import {GAME_WIDTH as W,GAME_HEIGHT as H,length,normalize,updateSwordMotion,type Vector} from './rules.ts';
import {SPACE_DEFAULTS,normalizeSpaceSettings,spaceSettingsKey,spaceDifficulty,meteorTrajectory,sweptCircleCollision,boundShipTarget,safeMeteorSpawn,steerShip,seededSpaceRandom,type SpaceSettings,type SpaceObject,type SpaceStatus,type SpaceScore,type SpacePhase,type MeteorVariant} from './spaceRules.ts';
import {TwoFingerDashTrigger} from '../tracking/gestures.ts';
import type {GameBridge} from './types.ts';
type SpaceBridge=Pick<GameBridge,'getSignal'|'getMode'|'getPlayer'|'playSound'> & {onSpaceStatus:(status:SpaceStatus)=>void;onSpaceFinish:(result:SpaceScore)=>void};
type Keys=Record<string,Phaser.Input.Keyboard.Key>;
export class SpaceDodgeScene extends Phaser.Scene {
 private bridge:SpaceBridge;
 private bg!:Phaser.GameObjects.Graphics;private art!:Phaser.GameObjects.Graphics;
 private title?:Phaser.GameObjects.Text;private subtitle?:Phaser.GameObjects.Text;
 private keys:Keys={};private settings:SpaceSettings={...SPACE_DEFAULTS};private phase:SpacePhase='idle';
 private ship:Vector={x:W*.25,y:H/2};private priorShip:Vector={...this.ship};private velocity:Vector={x:0,y:0};
 private objects:SpaceObject[]=[];private id=1;private rng:()=>number=Math.random;
 private lives=3;private stars=0;private score=0;private survival=0;
 private immunity=0;private starCombo=0;private lastStarAt=-Infinity;private nearMisses=0;private dashUses=0;
 private shield=0;private shieldCountdown=18;
 private dashLeft=0;private dashCooldown=0;private dashDirection:Vector={x:0,y:0};private lastAim:Vector|null=null;
 private twoFingerDash=new TwoFingerDashTrigger();private lastDashFrame:number|null=null;private shiftHeld=false;
 private meteorsLeft=0;private starsLeft=0;private telemetry=0;private trail:Vector[]=[];
 private lostSince:number|null=null;private interruption=false;
 private competition=false;private hint='Nhấn BẮT ĐẦU hoặc xòe 5 ngón';
 constructor(bridge:SpaceBridge){super({key:'SpaceDodgeScene'});this.bridge=bridge;}
 create(){
  this.cameras.main.setBackgroundColor('#07152B');this.bg=this.add.graphics();this.art=this.add.graphics();
  this.title=this.add.text(W/2,H*.42,'',{fontFamily:'Arial',fontSize:'58px',fontStyle:'bold',color:'#D9F6FF'}).setOrigin(.5).setDepth(20);
  this.subtitle=this.add.text(W/2,H*.55,'',{fontFamily:'Arial',fontSize:'21px',color:'#A7D3EA'}).setOrigin(.5).setDepth(20);
  this.keys=(this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,SHIFT')??{}) as Keys;
  this.drawBackground();this.publish();
 }
 private drawBackground(){
  const g=this.bg;g.fillGradientStyle(0x041329,0x0D2140,0x101C3D,0x07132C,1);g.fillRect(0,0,W,H);
  const rand=seededSpaceRandom(82026);for(let i=0;i<160;i++){g.fillStyle(i%5?0xB2D8FA:0xF8DE93,.18+rand()*.65);g.fillCircle(rand()*W,rand()*H,.5+rand()*1.8);}
  g.fillStyle(0xE9B46C,.04);g.fillRect(W*.82,0,W*.18,H);g.lineStyle(2,0x366788,.6);g.strokeRoundedRect(12,12,W-24,H-24,15);
  g.lineStyle(1,0xF9DCA0,.13);g.lineBetween(W*.82,15,W*.82,H-15);
 }
 startGame(competition=false,raw:SpaceSettings=SPACE_DEFAULTS){
  this.settings=normalizeSpaceSettings(raw);this.competition=competition;this.rng=competition?seededSpaceRandom(20261030):Math.random;
  this.phase='playing';this.ship={x:W*.25,y:H/2};this.priorShip={...this.ship};this.velocity={x:0,y:0};this.objects=[];
  this.id=1;this.lives=this.settings.lives;this.stars=0;this.score=0;this.survival=0;this.immunity=0;
  this.starCombo=0;this.lastStarAt=-Infinity;this.nearMisses=0;this.dashUses=0;this.shield=0;this.shieldCountdown=18;
  this.dashLeft=0;this.dashCooldown=0;this.lastAim=null;this.twoFingerDash.reset();this.lastDashFrame=null;this.shiftHeld=false;
  this.meteorsLeft=1.3;this.starsLeft=2.6;this.telemetry=0;this.trail=[];this.lostSince=null;this.interruption=false;
  this.hint=this.settings.mode==='endless'?'Né thiên thạch, thu thập sao!':'Thu thập sao để đạt điểm mục tiêu!';this.publish();
 }
 pauseGame(){if(this.phase==='playing'){this.phase='paused';this.hint='Tạm dừng';this.publish();}}
 resumeGame(){if(this.phase==='paused'){this.phase='playing';this.lostSince=null;this.twoFingerDash.reset();this.lastDashFrame=null;this.hint='Tiếp tục';this.publish();}}
 private keyControl(){const down=(...names:string[])=>names.some(n=>this.keys[n]?.isDown);const dx=Number(down('D','RIGHT'))-Number(down('A','LEFT'));const dy=Number(down('S','DOWN'))-Number(down('W','UP'));return {dir:normalize({x:dx,y:dy}),brake:down('SPACE')||(!dx&&!dy),dash:down('SHIFT')};}
 private beginDash(dir:Vector){
  if(!this.settings.dashEnabled||this.dashCooldown>0||this.dashLeft>0||length(dir)<.25)return false;
  this.dashDirection=normalize(dir);this.dashLeft=.22;this.dashCooldown=this.settings.dashCooldown;this.dashUses++;
  this.hint='⚡ DASH!';this.bridge.playSound('dash');this.publish();return true;
 }
 update(_now:number,delta:number){
  const dt=Math.min(Math.max(0,delta/1000),.04);this.draw();if(this.phase!=='playing')return;
  const camera=this.bridge.getMode()==='camera';
  const sig=camera?this.bridge.getSignal():null;
  if(camera&&sig?.kind==='lost'){
   if(this.lostSince===null)this.lostSince=this.survival;
   if(this.survival-this.lostSince>.5){this.interruption=true;this.pauseGame();this.hint='Mất tracking >0.5s';this.publish();return;}
  }else this.lostSince=null;
  this.survival+=dt;this.immunity=Math.max(0,this.immunity-dt);this.dashCooldown=Math.max(0,this.dashCooldown-dt);
  this.priorShip={...this.ship};
  const keyInput=camera?null:this.keyControl();
  if(camera){
   // A classification can be repeated by 60-FPS Phaser while inference runs at
   // 20-30 FPS. Do not count repeated rendering as additional gesture samples.
   const stamp=sig?.observedAtMs;
   const fresh=stamp===undefined||stamp!==this.lastDashFrame;
   if(fresh){
    this.lastDashFrame=stamp??null;
    const raised=this.twoFingerDash.update(sig?.kind??'lost',stamp??this.survival*1000);
    if(raised){
     const aim=sig?.target?boundShipTarget({x:W/2+(sig.target.x-W/2)*this.settings.aimSensitivity,y:H/2+(sig.target.y-H/2)*this.settings.aimSensitivity}):this.lastAim;
     const dir=aim?{x:aim.x-this.ship.x,y:aim.y-this.ship.y}:this.velocity;
     this.beginDash(dir);
    }
   }
  }else{
   if(keyInput!.dash&&!this.shiftHeld){this.beginDash(length(keyInput!.dir)>.1?keyInput!.dir:length(this.velocity)>.1?this.velocity:{x:1,y:0});}
   this.shiftHeld=keyInput!.dash;
  }
  if(this.dashLeft>0){
   this.dashLeft=Math.max(0,this.dashLeft-dt);
   const speed=600*this.settings.shipSpeed*1.15*this.settings.dashBoost;
   this.velocity={x:this.dashDirection.x*speed,y:this.dashDirection.y*speed};
   const wanted={x:this.ship.x+this.velocity.x*dt,y:this.ship.y+this.velocity.y*dt};this.ship=boundShipTarget(wanted);
   if(this.ship.x!==wanted.x||this.ship.y!==wanted.y)this.dashLeft=0;
  }else if(camera){
   if((sig?.kind==='point'||sig?.kind==='dash')&&sig.target){
    const target=boundShipTarget({x:W/2+(sig.target.x-W/2)*this.settings.aimSensitivity,y:H/2+(sig.target.y-H/2)*this.settings.aimSensitivity});
    this.lastAim=target;const next=steerShip(this.ship,this.velocity,target,dt,this.settings);this.ship=next.position;this.velocity=next.velocity;
   }else{const next=updateSwordMotion(this.ship,this.velocity,{x:0,y:0},true,dt,this.settings.shipSpeed*this.settings.shipBrake);this.ship=next.position;this.velocity=next.velocity;}
  }else{
   const next=updateSwordMotion(this.ship,this.velocity,keyInput!.dir,keyInput!.brake,dt,this.settings.shipSpeed*this.settings.shipAcceleration);
   this.ship=next.position;this.velocity=next.velocity;
  }
  this.ship=boundShipTarget(this.ship);
  if(this.settings.engineTrail&&!this.settings.reducedMotion){this.trail.push({...this.ship});if(this.trail.length>12)this.trail.shift();}
  const difficulty=spaceDifficulty(this.survival,this.settings.progressive,this.settings.difficultyEvery,this.settings.difficultyIncrease);
  const inWave=this.settings.meteorWaves && this.survival%30>=20 && this.survival%30<26;
  this.meteorsLeft-=dt;
  if(this.meteorsLeft<=0){this.spawnMeteor(difficulty);this.meteorsLeft=(this.settings.spawnInterval*(.88+this.rng()*.24))/(difficulty*(inWave?1.4:1));}
  if(this.settings.starsEnabled){this.starsLeft-=dt;if(this.starsLeft<=0){this.spawnStar();this.starsLeft=this.settings.starInterval*(.82+this.rng()*.36);}}
  if(this.settings.shieldEnabled){this.shieldCountdown-=dt;if(this.shieldCountdown<=0){this.spawnShield();this.shieldCountdown=18+this.rng()*9;}}
  for(const o of this.objects){o.previous={...o.pos};o.pos={x:o.pos.x+o.velocity.x*dt,y:o.pos.y+o.velocity.y*dt};}
  this.splitMeteors();
  const touched=new Set<number>();const shipRadius=22*this.settings.shipHitbox;
  for(const o of this.objects){
   if(!sweptCircleCollision(this.priorShip,this.ship,shipRadius,o.previous,o.pos,o.radius))continue;
   if(o.kind==='star'){
    touched.add(o.id);this.stars++;
    const chain=this.settings.starCombo&&this.survival-this.lastStarAt<=this.settings.starComboSeconds?this.starCombo+1:1;
    this.starCombo=chain;this.lastStarAt=this.survival;
    const base=this.settings.starPoints*(o.special?(o.risk?5:2.5):1);
    this.score+=base+(this.settings.starCombo?25*(chain-1):0);
    this.bridge.playSound('fruit');this.hint=`★ +${base+(this.settings.starCombo?25*(chain-1):0)} điểm`;
    if(this.settings.mode==='goal'&&this.score>=this.settings.goal){this.objects=[];this.finish(true);return;}
   }else if(o.kind==='shield'){
    touched.add(o.id);this.shield=1;this.bridge.playSound('shield');this.hint='🛡 Khiên bảo vệ đã sẵn sàng';
   }else if(this.immunity<=0 && this.dashLeft<=.02){
    touched.add(o.id);this.bridge.playSound('bomb');
    if(this.settings.screenShake&&!this.settings.reducedMotion)this.cameras.main.shake?.(160,.006,false);
    if(this.shield>0){this.shield=0;this.immunity=.45;this.bridge.playSound('shield');this.hint='🛡 Khiên đã chặn một va chạm';}
    else {this.lives--;this.immunity=this.settings.immunitySeconds;this.hint='Trúng thiên thạch! −1 mạng';if(this.lives<=0){this.objects=[];this.finish(false);return;}}
   }
  }
  // One near-miss bonus per meteor; award only after passing the player's x-coordinate.
  if(this.settings.nearMiss){for(const o of this.objects){if(o.kind!=='meteor'||o.nearAwarded||touched.has(o.id))continue;
   const clearance=Math.hypot(o.pos.x-this.ship.x,o.pos.y-this.ship.y)-o.radius-shipRadius;
   if(clearance>=0&&clearance<=28&&o.pos.x<this.ship.x+shipRadius){o.nearAwarded=true;this.nearMisses++;this.score+=20;this.hint='NEAR MISS +20';}
  }}
  this.objects=this.objects.filter(o=>!touched.has(o.id)&&o.pos.x>-o.radius-70&&o.pos.y>-o.radius-150&&o.pos.y<H+o.radius+150);
  if(this.settings.timeLimit>0&&this.survival>=this.settings.timeLimit){this.finish(this.settings.mode==='endless');return;}
  this.telemetry+=dt;if(this.telemetry>=.10){this.telemetry=0;this.publish();}
 }
 private meteorCount(){return this.objects.filter(o=>o.kind==='meteor').length;}
 private meteorCap(){return this.settings.progressive?Math.min(this.settings.maxConcurrent,Math.min(4,this.settings.maxConcurrent)+Math.floor(this.survival/30)):this.settings.maxConcurrent;}
 private spawnMeteor(difficulty:number){
  const limit=this.meteorCap();
  if(this.meteorCount()>=limit)return;
  const variant:MeteorVariant=this.settings.splitterMeteors&&this.rng()<.08?'splitter':this.settings.heavyMeteors&&this.rng()<.17?'heavy':'normal';
  let created:SpaceObject|null=null;
  for(let i=0;i<15;i++){
   const path=meteorTrajectory(this.rng,this.settings.meteorSpeed,difficulty,W,H,this.settings);
   if(variant==='heavy'){path.radius*=1.35;path.velocity.x*=.75;path.velocity.y*=.75;}
   if(!safeMeteorSpawn(path,this.objects,this.ship))continue;
   created={id:this.id++,kind:'meteor',pos:path.position,previous:{...path.position},velocity:path.velocity,radius:path.radius,route:path.route,variant};this.objects.push(created);break;
  }
  if(created&&this.settings.meteorClusters&&this.meteorCount()<limit&&this.rng()<.16){
   // A second spaced meteor on the same wave; never skip the safe-spawn check.
   for(let i=0;i<10;i++){
    const p=meteorTrajectory(this.rng,this.settings.meteorSpeed,difficulty,W,H,this.settings);
    if(!safeMeteorSpawn(p,this.objects,this.ship))continue;
    this.objects.push({id:this.id++,kind:'meteor',pos:p.position,previous:{...p.position},velocity:p.velocity,radius:p.radius*.75,route:p.route,variant:'normal'});break;
   }
  }
 }
 private splitMeteors(){
  if(!this.settings.splitterMeteors)return;
  const limit=this.meteorCap();
  for(const o of [...this.objects]){
   if(o.kind!=='meteor'||o.variant!=='splitter'||o.splitDone||o.pos.x>W*.67)continue;
   o.splitDone=true;
   // Do not split close to the ship; remain one obstacle instead of an unavoidable trap.
   if(Math.hypot(o.pos.x-this.ship.x,o.pos.y-this.ship.y)<240||this.meteorCount()+1>limit)continue;
   const base={...o.velocity};o.variant='fragment';o.radius*=.65;
   const second:SpaceObject={...o,id:this.id++,pos:{x:o.pos.x+12,y:o.pos.y+26},previous:{x:o.pos.x+12,y:o.pos.y+26},velocity:{x:base.x,y:base.y+85},radius:o.radius,splitDone:true,nearAwarded:false};
   o.velocity={x:base.x,y:base.y-85};this.objects.push(second);
  }
 }
 private spawnStar(){
  if(this.objects.filter(o=>o.kind==='star').length>=this.settings.starMax)return;
  const special=this.settings.specialStars&&this.rng()<.16;
  const risk=special&&this.settings.riskStars&&this.rng()<.45;
  let y=80+this.rng()*(H-160);const x=W+36;
  if(risk){const meteor=this.objects.find(o=>o.kind==='meteor'&&o.pos.x>W*.70);if(meteor)y=Math.max(75,Math.min(H-75,meteor.pos.y+meteor.radius+85));}
  if(this.objects.some(o=>o.kind==='meteor'&&Math.hypot(o.pos.x-x,o.pos.y-y)<(risk?90:140)))return;
  const pos={x,y};this.objects.push({id:this.id++,kind:'star',pos,previous:{...pos},radius:special?22:18,special,risk,velocity:{x:-135*this.settings.starSpeed,y:0}});
 }
 private spawnShield(){
  if(this.shield>0||this.objects.some(o=>o.kind==='shield'))return;
  const pos={x:W+38,y:90+this.rng()*(H-180)};
  if(this.objects.some(o=>o.kind==='meteor'&&Math.hypot(o.pos.x-pos.x,o.pos.y-pos.y)<150))return;
  this.objects.push({id:this.id++,kind:'shield',pos,previous:{...pos},velocity:{x:-120,y:0},radius:19});
 }
 private finish(success:boolean){
  if(this.phase!=='playing')return;
  this.phase=success?'finished':'failed';this.velocity={x:0,y:0};this.objects=[];
  this.hint=success?(this.settings.mode==='goal'?'Đã đạt điểm mục tiêu!':'Hoàn thành thử thách sinh tồn!'):'GAME OVER';
  const result:SpaceScore={id:typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():String(Date.now()),player:this.bridge.getPlayer().trim()||'Người chơi',mode:this.settings.mode,score:this.score,stars:this.stars,survivalSeconds:Number(this.survival.toFixed(2)),livesLeft:this.lives,date:new Date().toISOString(),settingsKey:spaceSettingsKey(this.settings),inputMode:this.bridge.getMode(),qualified:!this.interruption&&this.competition&&this.bridge.getMode()==='camera',completed:this.settings.mode==='endless'||success,nearMisses:this.nearMisses,dashUses:this.dashUses};
  this.publish();this.bridge.onSpaceFinish(result);
 }
 private draw(){
  if(!this.art)return;const g=this.art;g.clear();
  if(this.settings.engineTrail&&!this.settings.reducedMotion&&this.phase==='playing')for(let i=0;i<this.trail.length;i++){const pt=this.trail[i];g.fillStyle(0x58CAFF,(i+1)/this.trail.length*.11);g.fillCircle(pt.x,pt.y,6+(i/this.trail.length)*16);}
  for(const o of this.objects){const x=o.pos.x,y=o.pos.y;
   if(o.kind==='meteor'){
    if(this.settings.meteorTrail&&!this.settings.reducedMotion){g.lineStyle(3,0xEDB775,.22);g.lineBetween(x,y,x-o.velocity.x*.22,y-o.velocity.y*.22);}
    const heavy=o.variant==='heavy',split=o.variant==='splitter';
    g.fillStyle(split?0xF27B4A:0xDEA770,.12);g.fillCircle(x,y,o.radius+9);
    g.fillStyle(split?0xA75F43:heavy?0x665666:0x77605B,1);g.fillCircle(x,y,o.radius);
    g.lineStyle(3,split?0xF4B170:0xC6A58B,1);g.strokeCircle(x,y,o.radius);
    g.fillStyle(0x392D38,.8);g.fillCircle(x-o.radius*.32,y-o.radius*.24,o.radius*.27);g.fillCircle(x+o.radius*.32,y+o.radius*.31,o.radius*.18);
   }else if(o.kind==='shield'){
    g.fillStyle(0x57EFCF,.18);g.fillCircle(x,y,27);g.lineStyle(4,0x70F4D6,.9);g.strokeCircle(x,y,20);g.fillStyle(0x9AFFF2,1);g.fillRoundedRect(x-4,y-12,8,24,3);
   }else{
    g.fillStyle(o.special?0x83C9FF:0xFDD968,.2);g.fillCircle(x,y,27);
    g.fillStyle(o.special?0x83C9FF:0xFFE17D,1);const pts=[] as Vector[];
    for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?9:20;pts.push({x:x+Math.cos(a)*r,y:y+Math.sin(a)*r});}
    g.fillPoints(pts,true);g.lineStyle(2,0xFFFFFF,.8);g.strokePoints(pts,true);
   }
  }
  if(this.settings.warning&&this.objects.some(o=>o.kind==='meteor'&&o.pos.x>W*.82&&o.pos.x<W+75)){
   g.lineStyle(3,0xF7A969,.42);g.lineBetween(W-18,40,W-18,H-40);
   for(const o of this.objects){if(o.kind!=='meteor'||o.pos.x<=W*.82||o.pos.x>=W+75)continue;const cy=Math.max(45,Math.min(H-45,o.pos.y));g.fillStyle(0xF6BB69,.86);g.fillTriangle(W-50,cy,W-25,cy-12,W-25,cy+12);}
  }
  if(this.bridge.getMode()==='camera'){
   const sig=this.bridge.getSignal();if((sig.kind==='point'||sig.kind==='dash')&&sig.target){const pt=boundShipTarget({x:W/2+(sig.target.x-W/2)*this.settings.aimSensitivity,y:H/2+(sig.target.y-H/2)*this.settings.aimSensitivity});g.lineStyle(2,0x54EFC0,.65);g.strokeCircle(pt.x,pt.y,16);g.lineStyle(1,0x55F3CD,.18);g.lineBetween(this.ship.x,this.ship.y,pt.x,pt.y);}
  }
  if(this.immunity===0||Math.floor(this.immunity*11)%2===0){
   const a=this.settings.autoRotate&&length(this.velocity)>15?Math.atan2(this.velocity.y,this.velocity.x):0;
   const f={x:Math.cos(a),y:Math.sin(a)},side={x:-f.y,y:f.x};const loc=(u:number,v:number):Vector=>({x:this.ship.x+f.x*u+side.x*v,y:this.ship.y+f.y*u+side.y*v});
   g.fillStyle(this.dashLeft>0?0xF6D47C:0x46C2F4,.18);g.fillCircle(this.ship.x,this.ship.y,this.dashLeft>0?55:37);
   g.fillStyle(0x77DFFD,1);g.fillPoints([loc(34,0),loc(-16,-22),loc(-8,0),loc(-16,22)],true);
   g.lineStyle(3,0xD5FAFF,1);g.strokePoints([loc(34,0),loc(-16,-22),loc(-8,0),loc(-16,22)],true);
   g.fillStyle(0xF2B46E,.9);g.fillPoints([loc(-17,-8),loc(-35,0),loc(-17,8)],true);
   g.fillStyle(0x286D98,1);g.fillCircle(this.ship.x+f.x*10,this.ship.y+f.y*10,7);
   if(this.shield>0){g.lineStyle(4,0x61FFE0,.8);g.strokeCircle(this.ship.x,this.ship.y,43);}
  }
  const overlay=this.phase!=='playing';this.title?.setVisible(overlay);this.subtitle?.setVisible(overlay);
  if(overlay){const labels:Record<SpacePhase,string>={idle:'SPACE DODGE',playing:'SPACE DODGE',paused:'TẠM DỪNG',finished:'MISSION COMPLETE',failed:'GAME OVER'};
   this.title?.setText(labels[this.phase]);this.subtitle?.setText(this.phase==='idle'?'Xòe 5 ngón hoặc nhấn BẮT ĐẦU':this.phase==='paused'?'Xòe 5 ngón để tiếp tục':this.phase==='failed'?'Hết mạng / hết thời gian! Xòe tay để chơi lại':'Thử thách hoàn tất! Xòe tay để chơi lại');
   g.fillStyle(0x06172B,.68);g.fillRoundedRect(280,240,640,224,18);g.lineStyle(2,0x38768C,.75);g.strokeRoundedRect(280,240,640,224,18);
  }
 }
 private publish(){this.bridge.onSpaceStatus({phase:this.phase,score:this.score,stars:this.stars,lives:this.lives,maxLives:this.settings.lives,survivalSeconds:this.survival,difficulty:spaceDifficulty(this.survival,this.settings.progressive,this.settings.difficultyEvery,this.settings.difficultyIncrease),meteoCount:this.meteorCount(),goal:this.settings.goal,mode:this.settings.mode,hint:this.hint,dashReady:this.settings.dashEnabled&&this.dashCooldown<=0,dashActive:this.dashLeft>0,dashCooldown:this.dashCooldown,shield:this.shield,starCombo:this.starCombo,nearMisses:this.nearMisses,dashUses:this.dashUses,warning:this.objects.some(o=>o.kind==='meteor'&&o.pos.x>W*.82&&o.pos.x<W+75)});}
}
