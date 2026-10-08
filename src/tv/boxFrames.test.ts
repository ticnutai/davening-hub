import {it,expect} from 'vitest';
import {SALON_DESIGNS} from './salonDesigns';
import {frameForSelection,replaceBoxFrame} from './boxFrames';
it('replaces frame and matching fill while preserving every other layer and geometry',()=>{
 const all=structuredClone(SALON_DESIGNS[0].values.elements!);
 const id='salonivory_prayers_frame';
 expect(frameForSelection(all,['salonivory_prayers_content'])?.id).toBe(id);
 const after=replaceBoxFrame(all,id,'woodarch',true);
 for(const e of all){const next=after.find(n=>n.id===e.id)!;
  if(![id,'salonivory_prayers_fill','salonivory_prayers_content','salonivory_prayers_heading'].includes(e.id))expect(next).toEqual(e);
  for(const k of ['id','x','y','width','height','group','opacity','hidden'])expect(next[k]).toEqual(e[k]);
 }
 expect(after.find(e=>e.id===id)?.image).toContain('woodarch-frame.png');
});
it('supports frame-only replacement, locked frames and rejects attached artwork regions',()=>{
 const all=structuredClone(SALON_DESIGNS[0].values.elements!);const frame=all.find(e=>e.id==='salonivory_prayers_frame')!;
 const next=replaceBoxFrame(all,frame.id,'silver',false);
 expect(next.filter((e,i)=>JSON.stringify(e)!==JSON.stringify(all[i]))).toHaveLength(1);
 frame.locked=true;expect(replaceBoxFrame(all,frame.id,'gold',true)).toBe(all);
 frame.locked=false;frame.id='premium_art_frame';expect(replaceBoxFrame(all,frame.id,'gold',true)).toBe(all);
});
