import Phaser from 'phaser';
import {
  GAME_WIDTH as W,GAME_HEIGHT as H,COMBO_SECONDS,BOMB_PENALTY_SECONDS,SWORD_MIN_SLICE_SPEED,
  MAX_BOMBS_PER_STAGE,STAGE_BONUSES,clamp,distance,evalPath,hitPointsForCombo,
  length,makeFruitPath,normalize,pickWords,seededRandom,rankingSeconds,finishTimeBonus,finalScore,swordSweepHitsFruit,updateSwordMotion,steerSwordToTarget,pathReachableFromSword
} from './rules.ts';
import type {Vector,Path,RankResult} from './rules.ts';
import type {GameBridge,GamePhase,GameStatus} from './types.ts';
import {DEFAULT_SETTINGS,normalizeSettings,settingsKey,findCollectibleIndex,remainingLetters,type GameSettings} from './settings.ts';
import {readLastWords,saveLastWords} from './storage.ts';

type FruitKind='target'|'decoy'|'bomb';
type Fruit={id:number;kind:FruitKind;letter:string;color:number;path:Path;age:number;position:Vector;previous:Vector;text:Phaser.GameObjects.Text;rotation:number};
type Piece={position:Vector;velocity:Vector;color:number;life:number;rotation:number;spin:number;half:number};
type Spark={position:Vector;velocity:Vector;life:number;color:number};
type KeyboardMap=Record<string,Phaser.Input.Keyboard.Key>;
const FRUIT_COLORS=[0xF16F77,0xF3AE59,0x7DDCA1,0xD18CFF,0x53BCE3,0xF1D374];
const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const COLOR_WHITE='#ECF7FF';

export class SwordFruitScene extends Phaser.Scene {
  private bridge:GameBridge;
  private background!:Phaser.GameObjects.Graphics;
  private art!:Phaser.GameObjects.Graphics;
  private keys:KeyboardMap={};
  private fruit:Fruit[]=[];
  private pieces:Piece[]=[];
  private sparks:Spark[]=[];
  private nextId=1;
  private sword:Vector={x:W/2,y:H/2};
  private previousSword:Vector={x:W/2,y:H/2};
  private velocity:Vector={x:0,y:0};
  private bladeDirection:Vector={x:1,y:0};
  private prevBladeDirection:Vector={x:1,y:0};
  private phase:GamePhase='idle';
  private words:string[]=['CAT','STUDY','NETWORK'];
  private stage=0;
  private letterIndex=0;
  private collectedIndices:number[]=[];
  private settings:GameSettings={...DEFAULT_SETTINGS};
  private score=0;
  private combo=0;
  private maxCombo=0;
  private comboLeft=0;
  private playSeconds=0;
  private penaltySeconds=0;
  private bombs=0;
  private mistakes=0;
  private bombsSpawned=0;
  private stageElapsed=0;
  private spawnCountdown=0;
  private intermission=0;
  private elapsed=0;
  private lastSlice=-100;
  private lastStatus=-100;
  private lostSince:number|null=null;
  private interrupted=false;
  private rng:()=>number=Math.random;
  private fairMode=false;
  private hint='Nhấn BẮT ĐẦU để chơi';

  constructor(bridge:GameBridge){super({key:'SwordFruitScene'});this.bridge=bridge;}
  create() {
    this.cameras.main.setBackgroundColor('#07152B');
    this.background=this.add.graphics();
    this.art=this.add.graphics();
    this.centerTitle=this.add.text(W/2,307,'',{fontFamily:'Arial, sans-serif',fontSize:'54px',fontStyle:'bold',color:'#E6F7FF',align:'center'}).setOrigin(.5).setDepth(11).setVisible(false);
    this.centerSubtitle=this.add.text(W/2,392,'',{fontFamily:'Arial, sans-serif',fontSize:'23px',color:'#A8D9F2',align:'center'}).setOrigin(.5).setDepth(11).setVisible(false);
    this.makeBackground();
    this.keys=(this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE')??{}) as KeyboardMap;
    this.publish();
  }
  private makeBackground() {
    const g=this.background;
    g.fillGradientStyle(0x07152B,0x0C1C39,0x121E3F,0x061329,1);
    g.fillRect(0,0,W,H);
    g.lineStyle(1,0x203B60,.33);
    for(let x=0;x<W;x+=60)g.lineBetween(x,0,x,H);
    for(let y=0;y<H;y+=60)g.lineBetween(0,y,W,y);
    const rng=seededRandom(12340);
    for(let i=0;i<110;i++) {g.fillStyle(i%3===0?0x7CDFFF:0xD5EBFF,.12+rng()*.5);g.fillCircle(rng()*W,rng()*H,.6+rng()*1.35);}
    g.lineStyle(2,0x274A70,.35);g.strokeRoundedRect(16,16,W-32,H-32,20);
    g.lineStyle(1,0x2FA790,.13);g.strokeRoundedRect(W*.20,H*.20,W*.60,H*.60,14);
    g.lineStyle(1,0x1EC2AA,.13);g.strokeCircle(W/2,H/2,145);
  }
  startGame(competition=false,settings:GameSettings=DEFAULT_SETTINGS) {
    this.settings=normalizeSettings(settings);
    this.clearFruit();
    this.pieces=[];this.sparks=[];
    this.fairMode=competition;
    this.rng=competition?seededRandom(20261017):Math.random;
    this.words=pickWords(this.rng,competition?[]:readLastWords(),this.settings.extraLetters);
    if(!competition) {try{saveLastWords(this.words);}catch{ /* storage blocked */ }}
    this.stage=0;this.letterIndex=0;this.collectedIndices=[];this.score=0;this.combo=0;this.maxCombo=0;
    this.comboLeft=0;this.playSeconds=0;this.penaltySeconds=0;this.bombs=0;this.mistakes=0;
    this.bombsSpawned=0;this.stageElapsed=0;this.spawnCountdown=0;this.intermission=0;this.elapsed=0;
    this.lastSlice=-100;this.lastStatus=-100;this.nextId=1;this.lostSince=null;
    this.interrupted=false;
    this.sword={x:W/2,y:H/2};this.previousSword={...this.sword};
    this.velocity={x:0,y:0};this.bladeDirection={x:1,y:0};this.prevBladeDirection={x:1,y:0};
    this.phase='playing';this.hint=this.settings.unorderedLetters?'Chém chữ bất kỳ còn thiếu • Tránh bom':'Chém chữ theo đúng thứ tự • Tránh bom';this.spawnTarget();this.publish();
  }
  pauseGame() {if(this.phase==='playing') {this.phase='paused';this.hint='Tạm dừng';this.publish();}}
  resumeGame() {if(this.phase==='paused'){this.phase='playing';this.lostSince=null;this.hint='Đã tiếp tục';this.publish();}}
  private get currentWord() {return this.words[this.stage]??'';}
  private get expected() {return this.currentWord[this.letterIndex]??'';}
  private get remaining() {return remainingLetters(this.currentWord,this.collectedIndices);}
  private getKeyInput():{direction:Vector;brake:boolean} {
    const k=this.keys;
    const down=(...names:string[])=>names.some(n=>k[n]?.isDown);
    const dx=Number(down('D','RIGHT'))-Number(down('A','LEFT'));
    const dy=Number(down('S','DOWN'))-Number(down('W','UP'));
    return {direction:normalize({x:dx,y:dy}),brake:down('SPACE')||(!dx&&!dy)};
  }
  private getInput():{direction:Vector;brake:boolean;target?:Vector} {
    if(this.bridge.getMode()==='keyboard')return this.getKeyInput();
    const signal=this.bridge.getSignal();
    if((signal.kind==='point'||signal.kind==='dash')&&signal.target)return {direction:signal.direction,brake:false,target:signal.target};
    return {direction:{x:0,y:0},brake:true};
  }
  update(_time:number,deltaMs:number) {
    const dt=Math.min(deltaMs/1000,.04);this.elapsed+=dt;
    this.renderVisual(dt);
    if(this.phase==='between') {this.intermission-=dt;if(this.intermission<=0) this.advanceStage();return;}
    if(this.phase!=='playing')return;
    if(this.bridge.getMode()==='camera') {
      const signal=this.bridge.getSignal();
      if(signal.kind==='lost'){
        if(this.lostSince===null)this.lostSince=this.elapsed;
        if(this.elapsed-this.lostSince>.50){this.interrupted=true;this.phase='paused';this.hint='Mất tracking > 0,5s • Nhấn tiếp tục';this.publish();return;}
      } else this.lostSince=null;
    }
    this.playSeconds+=dt;this.stageElapsed+=dt;
    if(this.combo>0){this.comboLeft=Math.max(0,this.comboLeft-dt);if(this.comboLeft===0){this.combo=0;this.hint='Combo hết thời gian';}}
    const control=this.getInput();
    this.previousSword={...this.sword};this.prevBladeDirection={...this.bladeDirection};
    const next=control.target
      ?steerSwordToTarget(this.sword,this.velocity,control.target,dt,this.settings.swordSpeed)
      :updateSwordMotion(this.sword,this.velocity,control.direction,control.brake,dt,this.settings.swordSpeed);
    this.sword=next.position;this.velocity=next.velocity;
    if(length(this.velocity)>35) {
      const desired=normalize(this.velocity);
      const f=Math.min(1,dt*13);
      this.bladeDirection=normalize({x:this.bladeDirection.x*(1-f)+desired.x*f,y:this.bladeDirection.y*(1-f)+desired.y*f});
    }
    for(const fruit of this.fruit) {
      fruit.previous={...fruit.position};fruit.age+=dt;fruit.position=evalPath(fruit.path,fruit.age/fruit.path.duration);
      fruit.text.setPosition(fruit.position.x,fruit.position.y);
      fruit.rotation+=dt*(fruit.kind==='bomb'?.8:.3);
    }
    this.removeExpired();
    this.spawnCountdown-=dt;
    this.spawnTarget();
    if(this.spawnCountdown<=0){this.spawnAdditional();this.spawnCountdown=1.1+this.rng()*.40;}
    if(length(this.velocity)>=SWORD_MIN_SLICE_SPEED && this.elapsed-this.lastSlice>=.12) {
      const collision=this.fruit.filter(f=>swordSweepHitsFruit(this.previousSword,this.sword,f.previous,f.position,this.prevBladeDirection,this.bladeDirection,f.kind==='bomb'?33:35));
      // một nhát chém/120ms: chọn vật thể ở gần vùng kiếm hơn
      collision.sort((a,b)=>distance(a.position,this.sword)-distance(b.position,this.sword));
      if(collision.length)this.slice(collision[0]);
    }
    if(this.elapsed-this.lastStatus>.085) {this.lastStatus=this.elapsed;this.publish();}
  }
  private removeExpired() {
    for(const f of [...this.fruit])if(f.age>f.path.duration){this.destroyFruit(f);if(f.kind==='target'){this.hint=`Bỏ lỡ chữ ${f.letter} • Đang sinh lại`;}}
  }
  private spawnTarget() {
    if(this.phase!=='playing'||!this.remaining.length)return;
    if(!this.settings.unorderedLetters){
      if(!this.fruit.some(f=>f.kind==='target'&&f.letter===this.expected))this.addFruit('target',this.expected);
      return;
    }
    // Multiple valid letters are offered at once, not just one forced target.
    const distinct=[...new Set(this.remaining)];
    const liveTargets=this.fruit.filter(f=>f.kind==='target');
    if(liveTargets.length>=Math.min(2,distinct.length))return;
    for(const letter of distinct){
      if(this.fruit.filter(f=>f.kind==='target').length>=Math.min(2,distinct.length))break;
      if(!this.fruit.some(f=>f.kind==='target'&&f.letter===letter))this.addFruit('target',letter);
    }
  }
  private spawnAdditional() {
    const maxObjects=this.settings.bombsEnabled&&this.settings.bombsPerWave>0?7:4;
    if(this.fruit.length>=maxObjects)return;
    const decoys=this.fruit.filter(f=>f.kind==='decoy').length;
    let newFruit=false;
    if(decoys<2){
      const invalid=ALPHABET.split('').filter(x=>!this.remaining.includes(x));
      const upcoming=this.settings.unorderedLetters?[]:this.currentWord.slice(this.letterIndex+1).split('').filter(x=>x!==this.expected);
      const letters=upcoming.length&&this.rng()<.65?upcoming:invalid;
      if(letters.length)newFruit=this.addFruit('decoy',letters[Math.floor(this.rng()*letters.length)]);
    }
    if(!this.settings.bombsEnabled)return;
    if(this.settings.bombsPerWave>0){
      if(!newFruit)return; // Bombs accompany a newly spawned fruit, never a bomb-only wave.
      // Every spawn wave tries to launch N bombs along with the fruit.
      // Cap concurrent bombs so they never permanently seal off the target.
      const cap=Math.min(4,2*this.settings.bombsPerWave);
      for(let i=0;i<this.settings.bombsPerWave;i++){
        if(this.fruit.length>=maxObjects||this.fruit.filter(f=>f.kind==='bomb').length>=cap)break;
        this.addFruit('bomb','');
      }
    }else if(this.stage>0 && this.bombsSpawned<MAX_BOMBS_PER_STAGE[this.stage%3] && this.stageElapsed>(this.bombsSpawned+1)*3.2 && this.rng()<.58){
      if(this.addFruit('bomb',''))this.bombsSpawned++;
    }
  }
  private addFruit(kind:FruitKind,letter:string):boolean {
    const radius=kind==='bomb'?34:43;
    for(let attempt=0;attempt<16;attempt++){
      const path=makeFruitPath(this.rng,undefined,radius,this.settings.fruitSpeed);
      if(kind==='target'&&!pathReachableFromSword(path,this.sword,.55,this.settings.swordSpeed))continue;
      const position=evalPath(path,0);
      // Không chỉ kiểm tra spawn: dự báo các lần hai quỹ đạo giao nhau sớm.
      const overlaps=this.fruit.some(f=>[0,.5,1,1.5,2].some(t=>{
        if(f.age+t>f.path.duration || t>path.duration)return false;
        const a=evalPath(path,t/path.duration),b=evalPath(f.path,(f.age+t)/f.path.duration);
        const minClearance=(f.kind==='bomb'||kind==='bomb')?130:110;
        return distance(a,b)<minClearance;
      }));
      if(overlaps) continue;
      const color=FRUIT_COLORS[Math.floor(this.rng()*FRUIT_COLORS.length)];
      const text=this.add.text(position.x,position.y,kind==='bomb'?'✹':letter,{
        fontFamily:'Arial, sans-serif',fontSize:kind==='bomb'?'47px':'45px',fontStyle:'bold',color:COLOR_WHITE,
        stroke:'#1A2845',strokeThickness:5
      }).setOrigin(.5).setDepth(4);
      this.fruit.push({id:this.nextId++,kind,letter,color,path,age:0,position,previous:{...position},text,rotation:0});
      return true;
    }
    // Tuyệt đối không để màn chơi kẹt nếu không tìm được điểm spawn hợp lệ.
    if(kind==='target') {
      const path=makeFruitPath(this.rng,'left',radius,this.settings.fruitSpeed);
      const text=this.add.text(path.start.x,path.start.y,letter,{fontFamily:'Arial',fontSize:'45px',fontStyle:'bold',color:COLOR_WHITE,stroke:'#1A2845',strokeThickness:5}).setOrigin(.5).setDepth(4);
      this.fruit.push({id:this.nextId++,kind,letter,color:0x6FD9A9,path,age:0,position:path.start,previous:{...path.start},text,rotation:0});
      return true;
    }
    return false;
  }
  private destroyFruit(f:Fruit){f.text.destroy();this.fruit=this.fruit.filter(x=>x.id!==f.id);}
  private clearFruit(){for(const f of this.fruit)f.text.destroy();this.fruit=[];}
  private slice(f:Fruit){
    this.lastSlice=this.elapsed;
    this.fragment(f);
    this.destroyFruit(f);
    this.bridge.playSound(f.kind==='bomb'?'bomb':'fruit');
    if(f.kind==='bomb'){
      this.bombs++;this.penaltySeconds+=BOMB_PENALTY_SECONDS;this.combo=0;this.comboLeft=0;
      this.hint='BOM! +5 giây • Mất combo';this.flash(0xF18D65,14);
      // Cosmetic shake: Phaser camera only. World coordinates/hit detection stay unchanged.
      this.cameras.main.shake?.(180,0.008,false);
      if(this.settings.bombGameOver && this.bombs>this.settings.bombLimit){
        this.failByBomb();return;
      }
      this.publish();return;
    }
    const matchIndex=findCollectibleIndex(this.currentWord,this.collectedIndices,f.letter,this.settings.unorderedLetters);
    if(matchIndex===-1){
      this.mistakes++;this.combo=0;this.comboLeft=0;this.hint=this.settings.unorderedLetters?'Chữ này không còn cần thu thập':`Sai thứ tự! Cần chữ ${this.expected}`;this.flash(0xEBA18F,8);this.publish();return;
    }
    this.collectedIndices.push(matchIndex);
    this.letterIndex=this.collectedIndices.length;
    // Existing targets that have no remaining matching letter become distractions.
    for(const other of this.fruit.filter(x=>x.kind==='target')){
      if(!this.remaining.includes(other.letter))other.kind='decoy';
    }
    this.combo++;this.maxCombo=Math.max(this.maxCombo,this.combo);
    const points=hitPointsForCombo(this.combo);this.score+=points;this.comboLeft=COMBO_SECONDS;
    this.hint=`+${points} điểm • COMBO x${this.combo}`;
    this.flash(0x77EDC1,8);
    if(this.letterIndex>=this.currentWord.length){
      const stageBonus=STAGE_BONUSES[[3,5,7].indexOf(this.currentWord.length)]??100;
      this.score+=stageBonus;
      this.clearFruit();this.phase='between';this.intermission=1.30;
      this.velocity={x:0,y:0};this.hint=`Hoàn thành ${this.currentWord} • +${stageBonus} điểm`;
    }else this.spawnTarget();
    this.publish();
  }
  private fragment(f:Fruit){
    for(const sign of [-1,1])this.pieces.push({position:{...f.position},velocity:{x:this.velocity.x*.15+sign*(100+this.rng()*80),y:-125-this.rng()*90},color:f.color,life:1.0,rotation:this.rng()*3,spin:sign*3,half:sign});
    for(let i=0;i<13;i++){const angle=this.rng()*Math.PI*2,mag=60+this.rng()*210;
      this.sparks.push({position:{...f.position},velocity:{x:Math.cos(angle)*mag,y:Math.sin(angle)*mag},life:.36+this.rng()*.34,color:f.kind==='bomb'?0xFF8656:0xA4F5DB});}
  }
  private advanceStage(){
    if(this.stage>=this.words.length-1){this.finish();return;}
    this.stage++;this.letterIndex=0;this.collectedIndices=[];this.bombsSpawned=0;this.stageElapsed=0;this.spawnCountdown=.35;
    this.sword={x:W/2,y:H/2};this.previousSword={...this.sword};this.velocity={x:0,y:0};
    this.phase='playing';this.hint=`CHẶNG ${this.stage+1} • ${this.currentWord.length} chữ`;
    this.spawnTarget();this.publish();
  }
  private finish(){
    this.phase='finished';this.velocity={x:0,y:0};this.hint=`Đã hoàn thành ${this.words.length} từ!`;
    const rankSeconds=Number(rankingSeconds(this.playSeconds,this.bombs).toFixed(2));
    const bonus=finishTimeBonus(rankSeconds,this.settings.scoreTimeSeconds,this.settings.pointsPerSecond);
    const result:RankResult={
      id:typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():String(Date.now()),
      player:this.bridge.getPlayer().trim()||'Người chơi',score:finalScore(this.score,rankSeconds,this.settings.scoreTimeSeconds,this.settings.pointsPerSecond),
      baseScore:this.score,timeBonus:bonus,scoringVersion:2,settingsKey:settingsKey(this.settings),
      scoreTimeSeconds:this.settings.scoreTimeSeconds,pointsPerSecond:this.settings.pointsPerSecond,completedLetters:this.words.join('').length,
      playSeconds:Number(this.playSeconds.toFixed(2)),penaltySeconds:this.penaltySeconds,
      rankSeconds,
      maxCombo:this.maxCombo,wrongHits:this.mistakes,bombHits:this.bombs,words:[...this.words],
      date:new Date().toISOString(),mode:this.bridge.getMode(),fairMode:this.fairMode&&!this.interrupted
    };
    this.publish();this.bridge.onFinish(result);
  }
  private failByBomb(){
    if(this.phase!=='playing')return;
    this.phase='failed';this.velocity={x:0,y:0};this.clearFruit();
    this.hint=`GAME OVER • ${this.bombs} bom, vượt giới hạn ${this.settings.bombLimit}`;
    const rankSeconds=Number(rankingSeconds(this.playSeconds,this.bombs).toFixed(2));
    const result:RankResult={
      id:typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():String(Date.now()),
      player:this.bridge.getPlayer().trim()||'Người chơi',score:this.score,
      baseScore:this.score,timeBonus:0,scoringVersion:2,settingsKey:settingsKey(this.settings),
      scoreTimeSeconds:this.settings.scoreTimeSeconds,pointsPerSecond:this.settings.pointsPerSecond,
      completedLetters:this.words.slice(0,this.stage).join('').length+this.letterIndex,
      playSeconds:Number(this.playSeconds.toFixed(2)),penaltySeconds:this.penaltySeconds,rankSeconds,
      maxCombo:this.maxCombo,wrongHits:this.mistakes,bombHits:this.bombs,words:[...this.words],
      date:new Date().toISOString(),mode:this.bridge.getMode(),fairMode:false
    };
    this.publish();this.bridge.onFailure(result);
  }
  private flash(color:number,count:number){
    for(let i=0;i<count;i++){const a=this.rng()*Math.PI*2,m=40+this.rng()*120;
      this.sparks.push({position:{...this.sword},velocity:{x:Math.cos(a)*m,y:Math.sin(a)*m},life:.26+this.rng()*.27,color});}
  }
  private renderVisual(dt:number) {
    const g=this.art;g.clear();
    this.centerTitle?.setVisible(false);this.centerSubtitle?.setVisible(false);
    for(const p of [...this.pieces]) {
      p.life-=dt;p.position.x+=p.velocity.x*dt;p.position.y+=p.velocity.y*dt;p.velocity.y+=580*dt;p.rotation+=p.spin*dt;
      g.fillStyle(p.color,clamp(p.life,0,1)*.9);
      g.slice(p.position.x,p.position.y,29,p.rotation+(p.half>0?0:Math.PI),p.rotation+(p.half>0?Math.PI:2*Math.PI),false).fillPath();
      g.lineStyle(2,0xFFE7D9,clamp(p.life,0,1));g.strokeCircle(p.position.x,p.position.y,5);
    }
    this.pieces=this.pieces.filter(p=>p.life>0&&p.position.y<H+70);
    for(const s of this.sparks){s.life-=dt;s.position.x+=s.velocity.x*dt;s.position.y+=s.velocity.y*dt;g.fillStyle(s.color,clamp(s.life*2,0,1));g.fillCircle(s.position.x,s.position.y,3);}
    this.sparks=this.sparks.filter(s=>s.life>0);
    for(const f of this.fruit){
      f.text.setVisible(this.phase==='playing');
      const {x,y}=f.position;
      if(f.kind==='bomb'){
        g.fillStyle(0xFF8053,.12);g.fillCircle(x,y,48);g.fillStyle(0x22263B,1);g.fillCircle(x,y,35);
        g.lineStyle(3,0xFCA077,.9);g.strokeCircle(x,y,35);
        g.lineStyle(6,0xF6AF5A,1);g.lineBetween(x+16,y-27,x+26,y-42);g.fillStyle(0xFCE6A0,1);g.fillCircle(x+27,y-45,6);
      } else {
        if(f.kind==='target'){g.fillStyle(0x42E5B5,.09);g.fillCircle(x,y,57);g.lineStyle(2,0x4AEFC1,.70);g.strokeCircle(x,y,53);}
        g.fillStyle(f.color,.95);g.fillCircle(x,y,43);
        g.lineStyle(3,0xFFF1CF,.43);g.strokeCircle(x,y,43);
        g.fillStyle(0xFFFFFF,.24);g.fillEllipse(x-15,y-14,17,24);
        g.fillStyle(0x347A62,1);g.fillEllipse(x+1,y-47,19,10);g.lineStyle(3,0x3C5D50,.85);g.lineBetween(x,y-42,x+5,y-52);
      }
    }
    // Aim reticle previews where the index fingertip is pointing, while the
    // actual sword moves toward this location with acceleration and inertia.
    if(this.bridge.getMode()==='camera' && (this.phase==='playing'||this.phase==='idle'||this.phase==='paused')){
      const signal=this.bridge.getSignal();
      if((signal.kind==='point'||signal.kind==='dash')&&signal.target){
        const {x,y}=signal.target;
        g.lineStyle(2,0x66F5C1,.85);g.strokeCircle(x,y,18);
        g.lineStyle(1,0xA8FFE4,.55);
        g.lineBetween(x-27,y,x-10,y);g.lineBetween(x+10,y,x+27,y);
        g.lineBetween(x,y-27,x,y-10);g.lineBetween(x,y+10,x,y+27);
        g.lineStyle(1,0x66F5C1,.24);g.lineBetween(this.sword.x,this.sword.y,x,y);
      }
    }
    this.drawSword(g);
    if(this.phase==='idle') this.drawCenterMessage('SWORD FRUIT',this.bridge.getMode()==='camera'?'Xòe đủ 5 ngón để bắt đầu • Ngón trỏ nhắm đích':'Nhấn BẮT ĐẦU • WASD / mũi tên để điều khiển',g);
    if(this.phase==='paused') this.drawCenterMessage('TẠM DỪNG',this.bridge.getMode()==='camera'?'Xòe đủ 5 ngón để tiếp tục':'Nhấn nút TIẾP TỤC',g);
    if(this.phase==='between') this.drawCenterMessage('HOÀN THÀNH TỪ!',`+${STAGE_BONUSES[[3,5,7].indexOf(this.currentWord.length)]??100} điểm thưởng`,g);
    if(this.phase==='failed') this.drawCenterMessage('GAME OVER',`Vượt giới hạn ${this.settings.bombLimit} bom • Xòe tay hoặc nhấn chơi lại`,g);
    if(this.phase==='finished') this.drawCenterMessage('MISSION COMPLETE',this.bridge.getMode()==='camera'?'Xòe đủ 5 ngón để chơi lại':'Xem bảng điểm hoặc chọn CHƠI LẠI',g);
  }
  private drawSword(g:Phaser.GameObjects.Graphics){
    const x=this.sword.x,y=this.sword.y,d=this.bladeDirection,n={x:-d.y,y:d.x};
    const xy=(forward:number,side:number)=>({x:x+d.x*forward+n.x*side,y:y+d.y*forward+n.y*side});
    g.fillStyle(0x4BAEF1,.11);g.fillCircle(x,y,34);
    g.lineStyle(2,0x71CCFF,.33);g.strokeCircle(x,y,27);
    const moving=length(this.velocity)>SWORD_MIN_SLICE_SPEED;
    if(moving){g.lineStyle(6,0x5BC7FF,.18);g.lineBetween(x-this.velocity.x*.085,y-this.velocity.y*.085,x+d.x*94,y+d.y*94);}
    const blade=[xy(11,-9),xy(81,-6),xy(104,0),xy(81,6),xy(11,9)];
    g.fillStyle(0xC6EEFF,1);g.fillPoints(blade,true);
    g.lineStyle(2,0x83CFFB,1);g.strokePoints(blade,true);
    g.lineStyle(2,0xFFFFFF,.72);g.lineBetween(x+d.x*16+n.x*1,y+d.y*16+n.y*1,x+d.x*89+n.x*1,y+d.y*89+n.y*1);
    g.lineStyle(12,0xB89865,1);const grip=xy(-30,0),hilt=xy(9,0);g.lineBetween(grip.x,grip.y,hilt.x,hilt.y);
    g.lineStyle(8,0xE6C584,1);const a=xy(9,-22),b=xy(9,22);g.lineBetween(a.x,a.y,b.x,b.y);
    g.fillStyle(0x8C7ADD,1);g.fillCircle(grip.x,grip.y,8);
  }
  private drawCenterMessage(title:string,subtitle:string,g:Phaser.GameObjects.Graphics){
    g.fillStyle(0x07172E,.83);g.fillRoundedRect(285,247,630,210,24);
    g.lineStyle(2,0x2D6288,.9);g.strokeRoundedRect(285,247,630,210,24);
    // Labels created via existing Phaser graphics custom scene overlay with direct Canvas renderer:
    // Phaser Text objects are reused below, not constructed each frame.
    this.centerTitle?.setText(title).setVisible(true);
    this.centerSubtitle?.setText(subtitle).setVisible(true);
  }
  private centerTitle?:Phaser.GameObjects.Text;
  private centerSubtitle?:Phaser.GameObjects.Text;
  private publish(){
    const state:GameStatus={phase:this.phase,word:this.currentWord,stage:this.stage+1,
      letterIndex:this.letterIndex,collectedIndices:[...this.collectedIndices],unorderedLetters:this.settings.unorderedLetters,stageCount:this.words.length,
      scoreTimeSeconds:this.settings.scoreTimeSeconds,pointsPerSecond:this.settings.pointsPerSecond,score:this.score,combo:this.combo,maxCombo:this.maxCombo,
      comboLeft:this.comboLeft,playSeconds:this.playSeconds,penaltySeconds:this.penaltySeconds,
      bombs:this.bombs,bombGameOver:this.settings.bombGameOver,bombLimit:this.settings.bombLimit,mistakes:this.mistakes,sword:{...this.sword},hint:this.hint};
    this.bridge.onStatus(state);
  }
}
