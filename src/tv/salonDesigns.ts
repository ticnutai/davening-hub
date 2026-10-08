import type {SavedDesign} from './designs';
import type {BoardElement} from './elements';
import {REALISTIC_DESIGNS} from './realisticDesigns';
import {SEPARATE_PARTS} from './separateParts';

// Room, furniture, four frames and live text are independent layers.
// A set table is a single photographed object; its dishes are not individual layers.
export const SALON_DESIGNS:SavedDesign[]=[
 {id:'salonivory',name:'שבת — סלון פנינה',base:1,table:'ivory',accent:'#624b2e'},
 {id:'salonwalnut',name:'שבת — סלון אגוז',base:0,table:'walnut',accent:'#fff2d5'},
].map(p=>{
 const d=structuredClone(REALISTIC_DESIGNS[p.base]);
 const oldId=d.id.slice(2);
 d.id='d_'+p.id;d.name=p.name+' · חלקים עצמאיים';
 d.values.backgroundImage=`/new-shul-assets/${p.id}-background.png`;
 const elements=(d.values.elements as BoardElement[]).filter(e=>!e.id.includes('_prop_'));
 const rect=(e:BoardElement,r:number[])=>{[e.x,e.y,e.width,e.height]=r;};
 for(const e of elements){
  e.id=e.id.replace(oldId,p.id);
  for(const [key,x] of [['zmanim',8],['prayers',66]] as const){
   if(e.id===`${p.id}_${key}_fill`||e.id===`${p.id}_${key}_frame`)rect(e,[x,19,26,56]);
   if(e.id===`${p.id}_${key}_heading`){rect(e,[x+4,30,18,4]);e.fontSize=2;}
   if(e.id===`${p.id}_${key}_content`){rect(e,[x+5.5,37,15,31]);e.fontSize=key==='zmanim'?1.25:1.9;}
  }
  for(const [key,y] of [['notices',22],['lessons',45]] as const){
   if(e.id===`${p.id}_${key}_fill`||e.id===`${p.id}_${key}_frame`)rect(e,[36,y,28,21]);
   if(e.id===`${p.id}_${key}_heading`){rect(e,[39,y+3,22,4]);e.fontSize=2;}
   if(e.id===`${p.id}_${key}_content`){rect(e,[40,y+8,20,10]);e.fontSize=1.5;}
  }
  if(e.id===`${p.id}_title`){rect(e,[57,6,34,5]);e.fontSize=2.8;e.color=p.accent;}
  if(e.id===`${p.id}_clock`){rect(e,[13,5,17,7]);e.fontSize=4.5;e.color=p.accent;}
  if(e.id===`${p.id}_date`){rect(e,[58,12,32,3]);e.fontSize=1.4;e.color=p.accent;}
  if(e.id===`${p.id}_parasha`){rect(e,[14,13,20,3]);e.fontSize=1.5;e.color=p.accent;}
  if(e.id===`${p.id}_footer`){rect(e,[24,97,52,2.5]);e.fontSize=1.05;e.color='#382719';}
 }
 const table=structuredClone(SEPARATE_PARTS.find(s=>s.id===`ready_separate_salon_${p.table}`)!.elements[0]);
 table.id=`${p.id}_table`;table.height=30;table.width=30*9/16*table.crop!.width/table.crop!.height;
 table.x=50-table.width/2;table.y=67;
 elements.push(table);
 d.values.elements=elements;
 return d;
});
