import {normalizeSpaceSettings,topSpaceScores,type SpaceScore,type SpaceSettings} from './spaceRules.ts';
const SETTINGS='sword-fruit:space-settings:v2',SCORES='sword-fruit:space-scores:v2';
export function loadSpaceSettings():SpaceSettings{try{return normalizeSpaceSettings(JSON.parse(localStorage.getItem(SETTINGS)??'null'));}catch{return normalizeSpaceSettings(null);}}
export function saveSpaceSettings(value:SpaceSettings){localStorage.setItem(SETTINGS,JSON.stringify(normalizeSpaceSettings(value)));}
export function readSpaceScores():SpaceScore[]{try{const x:unknown=JSON.parse(localStorage.getItem(SCORES)??'[]');return Array.isArray(x)?x.filter(v=>v&&typeof v==='object'&&typeof v.player==='string'&&typeof v.score==='number'&&typeof v.survivalSeconds==='number'&&typeof v.settingsKey==='string').slice(-200):[];}catch{return [];}}
export function saveSpaceScore(s:SpaceScore){localStorage.setItem(SCORES,JSON.stringify([...readSpaceScores(),s].slice(-200)));}
export {topSpaceScores};

export type SpaceCalibration={upperLeft:{x:number;y:number};lowerRight:{x:number;y:number}};
const PROFILE_KEY='sword-fruit:space-profiles:v22';
const CALIB_KEY='sword-fruit:space-calibration:v22';
export type NamedSpaceProfile={name:string;settings:SpaceSettings};
export function loadSpaceProfiles():NamedSpaceProfile[]{try{const v:unknown=JSON.parse(localStorage.getItem(PROFILE_KEY)??'[]');return Array.isArray(v)?v.filter(p=>p&&typeof p.name==='string'&&p.name.length<=40&&p.settings).slice(0,20).map(p=>({name:p.name,settings:normalizeSpaceSettings(p.settings)})):[];}catch{return [];}}
export function storeSpaceProfile(name:string,settings:SpaceSettings):NamedSpaceProfile[]{const safe=name.trim().slice(0,40);if(!safe)return loadSpaceProfiles();const next=[...loadSpaceProfiles().filter(p=>p.name.toLowerCase()!==safe.toLowerCase()),{name:safe,settings:normalizeSpaceSettings(settings)}].slice(-20);localStorage.setItem(PROFILE_KEY,JSON.stringify(next));return next;}
export function deleteSpaceProfile(name:string){const list=loadSpaceProfiles().filter(p=>p.name!==name);localStorage.setItem(PROFILE_KEY,JSON.stringify(list));return list;}
export function loadSpaceCalibration():SpaceCalibration|null{try{const v=JSON.parse(localStorage.getItem(CALIB_KEY)??'null') as SpaceCalibration|null;return isCalibration(v)?v:null;}catch{return null;}}
function isCalibration(v:SpaceCalibration|null):v is SpaceCalibration{return Boolean(v && Number.isFinite(v.upperLeft?.x)&&Number.isFinite(v.upperLeft?.y)&&Number.isFinite(v.lowerRight?.x)&&Number.isFinite(v.lowerRight?.y)&&v.lowerRight.x-v.upperLeft.x>120&&v.lowerRight.y-v.upperLeft.y>90);}
export function saveSpaceCalibration(v:SpaceCalibration|null){if(v&&!isCalibration(v))return false;if(v)localStorage.setItem(CALIB_KEY,JSON.stringify(v));else localStorage.removeItem(CALIB_KEY);return true;}
export function applySpaceCalibration(target:{x:number;y:number},v:SpaceCalibration|null){if(!v)return target;
 const x=55+Math.max(0,Math.min(1,(target.x-v.upperLeft.x)/(v.lowerRight.x-v.upperLeft.x)))*1090;
 const y=55+Math.max(0,Math.min(1,(target.y-v.upperLeft.y)/(v.lowerRight.y-v.upperLeft.y)))*610;
 return {x,y};
}
