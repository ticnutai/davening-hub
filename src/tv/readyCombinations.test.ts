import {describe,it,expect} from 'vitest';
import {existsSync} from 'node:fs';
import {READY_COMBINATIONS} from './readyCombinations';
import {exportElementSet,importElementSet} from './elements';
import {frameForSelection,replaceBoxFrame} from './boxFrames';
describe('ready combinations',()=>{
 it('six complete combinations survive portable export and have available art',()=>{
  expect(READY_COMBINATIONS.map(c=>c.elements.length)).toEqual([3,4,4,5,4,3]);
  for(const item of READY_COMBINATIONS){
   const added=importElementSet(exportElementSet(item.elements));
   expect(added.map(e=>e.binding)).toEqual(item.elements.map(e=>e.binding));
   for(const e of added){if(e.image)expect(existsSync('public'+e.image)).toBe(true);expect(e.x+e.width).toBeLessThanOrEqual(100);expect(e.y+e.height).toBeLessThanOrEqual(100);}
  }
 });
 it('two copies can replace their frames independently even with equal names and positions',()=>{
  const item=READY_COMBINATIONS.find(c=>c.id==='prayers')!;
  const a=importElementSet(exportElementSet(item.elements)).map(e=>({...e,group:'a'}));
  const b=importElementSet(exportElementSet(item.elements)).map(e=>({...e,group:'b'}));
  const all=[...a,...b];const frame=frameForSelection(all,[a[3].id])!;
  expect(frame.id).toBe(a[1].id);
  const after=replaceBoxFrame(all,frame.id,'artdeco',true);
  expect(after.slice(4)).toEqual(b);expect(after[0].image).toContain('artdeco-fill');expect(after[3].color).toBe('#fff1cb');
 });
});
