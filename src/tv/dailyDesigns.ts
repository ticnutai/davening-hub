import type {SavedDesign} from './designs';
import type {BoardElement} from './elements';
import {SALON_DESIGNS} from './salonDesigns';
import {SEPARATE_PARTS} from './separateParts';

/** Daily boards retain live bindings and share the existing frame families. */
export const DAILY_DESIGNS:SavedDesign[]=[
 {id:'dailyjerusalem',name:'לוח היום — בוקר ירושלמי',base:0},
 {id:'dailystudy',name:'לוח היום — בית מדרש אגוז',base:1},
].map(p=>{
 const d=structuredClone(SALON_DESIGNS[p.base]);
 const oldId=d.id.slice(2);
 d.id='d_'+p.id;d.name=p.name+' · חלקים עצמאיים';
 d.values.backgroundImage=`/new-shul-assets/${p.id}-background.png`;
 const elements=(d.values.elements as BoardElement[]).filter(e=>!e.id.endsWith('_table'));
 for(const e of elements){
  e.id=e.id.replace(oldId,p.id);
  if(e.id===`${p.id}_footer`)e.color=p.base===0?'#382719':'#fff2d5';
 }
 for(const [key,x,width] of [['openbook',18,13],['charity',39,6],['book',56,6],['olive',79,9]] as const){
  const part=structuredClone(SEPARATE_PARTS.find(s=>s.id===`ready_separate_daily_${key}`)!.elements[0]);
  part.id=`${p.id}_${key}`;part.width=width;part.height=width*16/9*part.crop!.height/part.crop!.width;
  part.x=x;part.y=95-part.height;
  elements.push(part);
 }
 d.values.elements=elements;
 return d;
});
