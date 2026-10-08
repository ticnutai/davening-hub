import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {parseSharedCatalog} from './sharedCatalog';
describe('shared catalog',()=>{
 it('retains all global themes independently of personal design capacity',()=>{
  const c=parseSharedCatalog(JSON.parse(readFileSync('public/new-shul-catalog.json','utf8')));
  for(const part of c.parts) for(const e of part.elements) if(e.kind==='image') expect(e.image).not.toBe('');
  for(const d of c.designs) for(const e of d.values.elements ?? []) if(e.kind==='image') expect(e.image).not.toBe('');
  expect(c.designs).toHaveLength(67);expect(c.parts).toHaveLength(621);
  expect(c.parts.filter(p=>p.designId==='d_premium_jerusalem-stone')).toHaveLength(8);
 });
 it('rejects malformed data',()=>{expect(()=>parseSharedCatalog({})).toThrow();});
});
