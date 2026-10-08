import {writeFileSync} from 'node:fs';
import {BUILTIN_DESIGNS} from '../src/tv/designs';
import {READY_ELEMENTS} from '../src/tv/readyElements';

// Ship assets with the receiving site; the source GitHub repository is private.
const base='';
const clone=<T,>(v:T):T=>JSON.parse(JSON.stringify(v,(_,x)=>typeof x==='string'&&x.startsWith('/new-shul-assets/')?base+x:x));
const parts=READY_ELEMENTS.map(p=>({id:p.id,name:p.name,designId:'standalone',elements:p.elements,note:'פריט עצמאי מהספרייה'}));
for(const d of BUILTIN_DESIGNS){
 for(const e of d.values.elements??[]){
  if(e.kind!=='image'||!e.image||e.hidden)continue;
  parts.push({id:`catalog_${d.id}_${e.id}`,name:e.name,designId:d.id,elements:[e],note:d.id.startsWith('d_premium_')?'אזור מהציור המקורי; הרקע שבתוך החיתוך נשאר מחובר':e.sourceMask?'פרט מהמקור במסכה':'שכבת תמונה עצמאית'});
 }
}
const catalog=clone({format:'new-shul-shared-catalog',version:1,designs:BUILTIN_DESIGNS,parts});
writeFileSync('public/new-shul-catalog.json',JSON.stringify(catalog));
console.log(`Shared catalogue: ${catalog.designs.length} themes, ${catalog.parts.length} selectable image parts`);
