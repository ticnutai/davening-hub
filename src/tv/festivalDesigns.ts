import type {SavedDesign} from './designs';
import {newElement,type BoardElement} from './elements';
import {EMERALD_COMPOSITION} from './emeraldComposition';
import {ZMAN_DISPLAY_KEYS} from '@/community/lib/zmanim';

type Rect=readonly [number,number,number,number];
// Atlas coordinates are percentages. Each instance remains independently editable;
// export packages the shared atlas once, retaining every crop and live binding.
const presets=[
  {id:'ivorylight',name:'אבן ואור',ink:'#493b28',accent:'#8c6b38',arch:[5.7,.5,37.3,49.8],wide:[49.2,15,50.8,27],prop:[0,57,52,42],prop2:null},
  {id:'sukkotroyal',name:'סוכות מלכותי',ink:'#fff2c9',accent:'#e2bf72',arch:[4.5,0,40.5,49.6],wide:[49,7.5,51,39],prop:[0,49.8,50,49.5],prop2:[50.5,55,49.5,42]},
  {id:'sukkahwarm',name:'סוכה ירושלמית',ink:'#48321e',accent:'#805321',arch:[2,0,41,49.5],wide:[44,3.5,56,46],prop:[0,54,50,43],prop2:[50,55,50,43]},
] as const;

export const FESTIVAL_DESIGNS:SavedDesign[]=presets.map(p=>{
  const elements:BoardElement[]=[];
  const add=(key:string,kind:BoardElement['kind'],name:string,r:Rect,extra:Partial<BoardElement>={})=>{
    const [x,y,width,height]=r;
    elements.push({...newElement(kind),id:`${p.id}_${key}`,name,x,y,width,height,fill:'transparent',color:p.accent,...extra});
  };
  const text=(key:string,name:string,r:Rect,size:number,extra:Partial<BoardElement>)=>add(key,'text',name,r,{fontSize:size,color:p.ink,...extra});
  const art=(key:string,name:string,r:Rect,c:Rect)=>add(key,'image',name,r,{image:`/new-shul-assets/${p.id}-atlas.png`,crop:{x:c[0],y:c[1],width:c[2],height:c[3]}});
  const panel=(key:string,label:string,r:Rect,binding:BoardElement['binding'],arch:boolean)=>{
    const [x,y,w,h]=r;
    add(key+'_fill','image','מילוי '+label,r,{image:`/new-shul-assets/${p.id}-${arch?'arch':'wide'}-fill.png`,crop:{x:0,y:0,width:100,height:100}});
    art(key+'_frame','מסגרת '+label,r,arch?p.arch:p.wide);
    const top=arch?(p.id==='sukkahwarm'?22:15):6;
    const inset=arch?(p.id==='sukkahwarm'?8.4:p.id==='sukkotroyal'?5.4:4):(p.id==='sukkahwarm'?6:4);
    text(key+'_heading','כותרת '+label,[x+4,y+top,w-8,4],2.8,{text:label});
    text(key+'_content','תוכן '+label,[x+inset,y+top+6,w-inset*2,h-top-11],binding==='zmanim'?(p.id==='ivorylight'?1.65:1.45):binding==='prayers'?2.6:1.85,
      {binding,rowsPerPage:binding==='zmanim'?13:binding==='prayers'?6:2,...(binding==='zmanim'?{zmanKeys:[...ZMAN_DISPLAY_KEYS]}:{})});
  };
  text('title','שם בית הכנסת',p.id==='sukkahwarm'?[38,4,48,6]:[25,4,68,6],3.8,{binding:'title'});
  text('clock','שעון חי',p.id==='sukkahwarm'?[20,4,17,7]:[7,4,17,7],5.5,{binding:'clock',color:p.accent});
  text('date','תאריך עברי',[30,11,40,4],1.9,{binding:'date'});
  text('parasha','פרשת השבוע',[36,17,28,4],2,{binding:'parasha'});
  if(p.id!=='ivorylight')text('greeting','ברכת החג',[31,23,38,6],4,{text:'חג סוכות שמח',color:p.accent});
  panel('zmanim','זמני היום',p.id==='sukkahwarm'?[3,23,30,66]:[6,23,27,66],'zmanim',true);
  panel('prayers','זמני תפילות',p.id==='sukkahwarm'?[67,23,30,66]:[67,23,27,66],'prayers',true);
  panel('notices','הודעות',[35,32,30,27],'announcements',false);
  panel('lessons','שיעורי תורה',[35,62,30,27],'lessons',false);
  // Small foreground objects sit outside the text regions, never inside a time row.
  art('prop_left',p.id==='ivorylight'?'ספר וענפי זית':'אתרוג ולולב',[1,81,14,17],p.prop);
  if(p.prop2)art('prop_right',p.id==='sukkotroyal'?'קופסת אתרוג מכסף':'שולחן החג',[86,81,13,17],p.prop2);
  text('footer','פרשה ולימוד יומי',[17,94,66,4],1.5,{binding:'footer'});
  return {id:`d_${p.id}`,name:`${p.name} · חלקים עצמאיים`,theme:p.id==='sukkotroyal'?'navy':'stone',parts:['background','frames','text','layout'],
    colours:{'--tv-text':p.ink,'--tv-accent':p.accent},values:{...structuredClone(EMERALD_COMPOSITION.values),elements,font:'traditional',backgroundGradient:null,backgroundImage:`/new-shul-assets/${p.id}-background.png`}};
});
