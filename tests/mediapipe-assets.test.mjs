import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {syncMediaPipeAssets} from '../scripts/sync-mediapipe-assets.mjs';

const files=[
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm'
];

test('copy bundled MediaPipe WASM loader/binary for SIMD and non-SIMD environments',()=>{
  const dir=mkdtempSync(join(tmpdir(),'sf-mediapipe-'));
  try{
    const source=join(dir,'package-wasm'),dest=join(dir,'public-wasm');
    mkdirSync(source);
    for(const name of files)writeFileSync(join(source,name),`fixture:${name}`);
    assert.deepEqual(syncMediaPipeAssets(source,dest),files);
    for(const name of files)assert.equal(readFileSync(join(dest,name),'utf8'),`fixture:${name}`);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('missing WASM dependency fails with actionable npm install hint',()=>{
  const dir=mkdtempSync(join(tmpdir(),'sf-mediapipe-'));
  try{
    assert.throws(()=>syncMediaPipeAssets(join(dir,'absent'),join(dir,'out')),/npm install/);
    assert.equal(existsSync(join(dir,'out')),false);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('incomplete WASM package fails before serving partial assets',()=>{
  const dir=mkdtempSync(join(tmpdir(),'sf-mediapipe-'));
  try{
    const source=join(dir,'src'),dest=join(dir,'out');
    mkdirSync(source);writeFileSync(join(source,files[0]),'x');
    assert.throws(()=>syncMediaPipeAssets(source,dest),/missing required WASM files/);
    assert.equal(existsSync(dest),false);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
