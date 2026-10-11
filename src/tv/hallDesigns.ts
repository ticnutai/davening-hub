import type {SavedDesign} from './designs';
import {REALISTIC_DESIGNS} from './realisticDesigns';
import {newElement} from './elements';

/** New room photographs; existing frame families remain independent image layers. */
export const HALL_DESIGNS:SavedDesign[]=[
 {id:'walnut',name:'ספריית אגוז מלכותית',base:0,ink:'#fff1cf'},
 {id:'stone',name:'בוקר ירושלמי מוזהב',base:1,ink:'#513b24'},
 {id:'ivory',name:'היכל שנהב וזהב',base:1,ink:'#513b24'},
].map(p=>{
 const d=structuredClone(REALISTIC_DESIGNS[p.base]);
 const old=d.id.slice(2);const id='hall_'+p.id;
 d.id='d_'+id;d.name=p.name+' · חלקים עצמאיים';
 d.values.backgroundImage=null;d.values.backgroundGradient=null;
 d.values.elements=d.values.elements!.filter(e=>!e.id.includes('_prop_')).map(e=>({...e,id:e.id.replace(old,id)}));
 d.values.elements.unshift({...newElement('image'),id:id+'_background',name:'רקע '+p.name,image:`/new-shul-assets/${id.replace('_','-')}-background.png`,x:0,y:0,width:100,height:100,crop:{x:0,y:0,width:100,height:100}});
 for(const e of d.values.elements){
  if(['title','clock','date','parasha','footer'].includes(e.binding??''))e.color=p.ink;
  if(e.binding==='title'){e.x=40;e.y=7;e.width=52;}
  if(e.binding==='clock'){e.x=10;e.y=7;e.width=20;}
  if(e.binding==='date'){e.x=55;e.y=15;e.width=37;}
  if(e.binding==='parasha'){e.x=10;e.y=16;e.width=30;}
 }
 return d;
});
