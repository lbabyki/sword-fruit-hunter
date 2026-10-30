import {normalizeSpaceSettings,topSpaceScores,type SpaceScore,type SpaceSettings} from './spaceRules.ts';
const SETTINGS='sword-fruit:space-settings:v2',SCORES='sword-fruit:space-scores:v2';
export function loadSpaceSettings():SpaceSettings{try{return normalizeSpaceSettings(JSON.parse(localStorage.getItem(SETTINGS)??'null'));}catch{return normalizeSpaceSettings(null);}}
export function saveSpaceSettings(value:SpaceSettings){localStorage.setItem(SETTINGS,JSON.stringify(normalizeSpaceSettings(value)));}
export function readSpaceScores():SpaceScore[]{try{const x:unknown=JSON.parse(localStorage.getItem(SCORES)??'[]');return Array.isArray(x)?x.filter(v=>v&&typeof v==='object'&&typeof v.player==='string'&&typeof v.score==='number'&&typeof v.survivalSeconds==='number'&&typeof v.settingsKey==='string').slice(-200):[];}catch{return [];}}
export function saveSpaceScore(s:SpaceScore){localStorage.setItem(SCORES,JSON.stringify([...readSpaceScores(),s].slice(-200)));}
export {topSpaceScores};
