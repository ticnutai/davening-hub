import type {SavedDesign} from './designs';
import {newElement, type BoardElement} from './elements';
import {EMERALD_COMPOSITION} from './emeraldComposition';
import {ZMAN_DISPLAY_KEYS} from '@/community/lib/zmanim';

const palettes = [
  {id:'royal',name:'לבנה מלכותית',bg:'#08152b',panel:'#10233f',ink:'#fff3d8',gold:'#d8b875',photoX:37},
  {id:'pearl',name:'אור פנינה',bg:'#f3f0e9',panel:'#fffdf7',ink:'#15263f',gold:'#ad8751',photoX:4},
  {id:'jerusalem',name:'ירושלים בלילה',bg:'#082d35',panel:'#0e3a43',ink:'#fff1d3',gold:'#d5b46d',photoX:68},
  {id:'dawn',name:'שחר של חודש',bg:'#eae0ce',panel:'#fff8e9',ink:'#513d27',gold:'#9c753d',photoX:37},
  {id:'amethyst',name:'היכל הלבנה',bg:'#201329',panel:'#321e3f',ink:'#fff2df',gold:'#d4b378',photoX:37},
  {id:'silver',name:'כסף השמים',bg:'#dce8f1',panel:'#f8fcff',ink:'#243c52',gold:'#708da5',photoX:68},
] as const;

/** Real editor objects, not text or frames flattened into a background. */
export const ROSH_CHODESH_DESIGNS:SavedDesign[] = palettes.map(p=>{
  const elements:BoardElement[]=[];
  const add=(id:string,kind:BoardElement['kind'],name:string,x:number,y:number,width:number,height:number,extra:Partial<BoardElement>={})=>{
    elements.push({...newElement(kind),id:'rc_'+p.id+'_'+id,kind,name,x,y,width,height,
      fill:'transparent',color:p.gold,text:'',locked:false,hidden:false,group:null,...extra});
  };
  add('background','box','רקע ראש חודש',0,0,100,100,{fill:p.bg,color:p.bg});
  add('outer','frame','מסגרת חיצונית',1,1.5,98,97);
  add('title','text','שם בית הכנסת',22,3,56,7,{binding:'title',color:p.ink,fontSize:4});
  add('greeting','text','ברכת ראש חודש',30,12,40,6,{text:'ראש חודש מבורך',fontSize:3.3});
  add('clock','text','שעון חי',4,4,17,7,{binding:'clock',fontSize:4.5});
  add('date','text','תאריך עברי',79,5,17,5,{binding:'date',color:p.ink,fontSize:1.8});
  add('photo','image','תמונת סהר וירושלים — צילום משולב',p.photoX,25,22,61,{
    image:'/new-shul-assets/rosh-chodesh-moon.png'});
  add('photo_frame','frame','מסגרת תמונת הסהר',p.photoX-0.5,24.2,23,62.6);
  if(p.id==='amethyst'||p.id==='silver'){
    add('ornament_left','ornament','עיטור ראש חודש שמאל',5,15,22,6);
    add('ornament_right','ornament','עיטור ראש חודש ימין',73,15,22,6);
  }
  const available=[4,37,68].filter(x=>x!==p.photoX);
  const panel=(id:string,label:string,x:number,y:number,h:number,binding:BoardElement['binding'])=>{
    add(id+'_fill','box','מילוי '+label,x,y,28,h,{fill:p.panel,color:'transparent'});
    add(id+'_frame','frame','מסגרת '+label,x,y,28,h);
    add(id+'_heading','text','כותרת '+label,x+3,y+2,22,5,{text:label,fontSize:2.3});
    add(id+'_body','text','תוכן '+label,x+3,y+9,22,h-12,{binding,color:p.ink,
      fontSize:binding==='zmanim'?1.35:2.1,rowsPerPage:binding==='zmanim'?13:4,
      ...(binding==='zmanim'?{zmanKeys:[...ZMAN_DISPLAY_KEYS]}:{})});
  };
  panel('zmanim','זמני היום',available[0],24,63,'zmanim');
  panel('prayers','זמני תפילות',available[1],24,30,'prayers');
  panel('notices','הודעות הקהילה',available[1],57,30,'announcements');
  add('parasha','text','פרשת השבוע',30,89,40,4,{binding:'parasha',color:p.ink,fontSize:2});
  add('footer','text','שיעורי תורה',8,94,84,3,{binding:'lessons',color:p.ink,fontSize:1.5,rowsPerPage:1});
  return {id:'d_rc_'+p.id,name:'ראש חודש · '+p.name,theme:p.id==='royal'||p.id==='jerusalem'?'navy':'stone',
    parts:['background','frames','text','layout'],colours:{'--tv-text':p.ink,'--tv-accent':p.gold},
    values:{...structuredClone(EMERALD_COMPOSITION.values),elements,backgroundGradient:null,backgroundImage:null}};
});
