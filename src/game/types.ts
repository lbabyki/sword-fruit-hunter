import type {GestureSignal} from '../tracking/gestures.ts';
import type {SoundEffect} from '../audio/GameAudio.ts';
import type {RankResult,Vector} from './rules.ts';
export type InputMode='keyboard'|'camera';
export type GamePhase='idle'|'playing'|'between'|'paused'|'finished'|'failed';
export type GameStatus={ phase:GamePhase; word:string; stage:number; letterIndex:number; collectedIndices:number[]; unorderedLetters:boolean; stageCount:number; scoreTimeSeconds:number; pointsPerSecond:number; score:number; combo:number; maxCombo:number; comboLeft:number; playSeconds:number; penaltySeconds:number; bombs:number; bombGameOver:boolean; bombLimit:number; mistakes:number; sword:Vector; hint:string;};
export type GameBridge={onStatus:(status:GameStatus)=>void;onFinish:(result:RankResult)=>void;onFailure:(result:RankResult)=>void;getSignal:()=>GestureSignal;getMode:()=>InputMode;getPlayer:()=>string;playSound:(effect:SoundEffect)=>void;};
