import {HALL_DESIGNS} from './hallDesigns';
import {expect,it} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
import {ROSH_CHODESH_DESIGNS} from './roshChodeshDesigns';
import {normalizeElements,exportElementSet,importElementSet,moveElements} from './elements';
import {parseSharedCatalog} from './sharedCatalog';
it('ships seven complete designs with independently editable layers, all within the canvas',()=>{
 expect(ROSH_CHODESH_DESIGNS).toHaveLength(7);
 for(const d of [...ROSH_CHODESH_DESIGNS,...HALL_DESIGNS]){
  const elements=d.values.elements!;
  expect(normalizeElements(elements)).toEqual(elements);
  expect(elements.every(e=>!e.locked&&!e.group)).toBe(true);
  for(const binding of ['title','clock','date','zmanim','prayers','announcements','lessons']) expect(elements.some(e=>e.binding===binding)).toBe(true);
  expect(elements.filter(e=>d.id==='d_rc_antique'||d.id.startsWith('d_hall_')?e.name.startsWith('מסגרת '):e.kind==='frame')).toHaveLength(d.id==='d_rc_antique'?3:d.id.startsWith('d_hall_')?4:5);
  for(const e of elements)if(e.image)expect(existsSync('public'+e.image)).toBe(true);
  const imported=importElementSet(exportElementSet(elements));
  expect(imported).toHaveLength(elements.length);
  const text=imported.find(e=>e.binding==='title')!;
  expect(moveElements(imported,[text.id],1,0).find(e=>e.id===text.id)!.x).toBe(text.x+1);
  expect(imported.filter(e=>e.id!==text.id)).toHaveLength(elements.length-1);
 }
});
it('exposes every layer in shared parts, including frame, fill, background and text',()=>{
 const c=parseSharedCatalog(JSON.parse(readFileSync('public/new-shul-catalog.json','utf8')));
 for(const d of [...ROSH_CHODESH_DESIGNS,...HALL_DESIGNS]){
  expect(c.designs.some(x=>x.id===d.id)).toBe(true);
  expect(c.parts.filter(x=>x.designId===d.id)).toHaveLength(d.values.elements!.length);
 }
});
