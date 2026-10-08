import type {SavedDesign} from './designs';
import {newElement,type BoardElement} from './elements';
import {EMERALD_COMPOSITION} from './emeraldComposition';
import {ZMAN_DISPLAY_KEYS} from '@/community/lib/zmanim';

type Rect=readonly [number,number,number,number];
const presets=[
  {id:'jerusalemfour',name:'קשתות ירושלים — ארבע קשתות',asset:'stonearch',ink:'#443e32',accent:'#8d7350',dark:false,bg:'linear-gradient(145deg, #e2d8c6, #faf5e9 50%, #d8c9ad)',prayers:[36,27,28,64],zmanim:[5,27,28,64],notices:[67,27,28,31],lessons:[67,62,28,29]},
  {id:'ancientwood',name:'היכל עץ עתיק',asset:'woodarch',ink:'#422919',accent:'#d5ad6a',dark:true,bg:'linear-gradient(90deg, #21150f, #513626 30%, #322117 65%, #20160f)',prayers:[68,27,25,64],zmanim:[7,27,25,64],notices:[35,35,30,37],lessons:[35,75,30,16]},
  {id:'jerusalemarches',name:'קשתות ירושלים',asset:'stonearch',ink:'#443e32',accent:'#8d7350',dark:false,bg:'linear-gradient(145deg, #e2d8c6, #faf5e9 50%, #d8c9ad)',prayers:[36,27,28,64],zmanim:[5,27,28,64],notices:[67,27,28,31],lessons:[67,62,28,29]},
  {id:'midnightwide',name:'כחול לילה מודרני',asset:'',ink:'#e6effb',accent:'#67d5da',dark:true,bg:'linear-gradient(135deg, #14283b, #081524 65%, #153448)',prayers:[36,27,32,59],zmanim:[5,27,28,59],notices:[71,27,24,27],lessons:[71,58,24,28]},
  {id:'copperscroll',name:'קלף ונחושת',asset:'copperparchment',ink:'#523a27',accent:'#ad7044',dark:false,bg:'linear-gradient(135deg, #d7c7ac, #f1e7d6 50%, #c8b594)',prayers:[68,29,27,62],zmanim:[5,29,27,62],notices:[35,29,30,44],lessons:[35,77,30,14]},
] as const;

export const ARCHITECTURAL_DESIGNS:SavedDesign[]=presets.map(p=>{
  const elements:BoardElement[]=[];
  const add=(key:string,kind:BoardElement['kind'],name:string,r:Rect,extra:Partial<BoardElement>={})=>{
    const [x,y,width,height]=r;
    elements.push({...newElement(kind),id:`${p.id}_${key}`,name,x,y,width,height,color:p.accent,fill:'transparent',...extra});
  };
  const text=(key:string,name:string,r:Rect,size:number,extra:Partial<BoardElement>)=>add(key,'text',name,r,{fontSize:size,color:p.ink,...extra});
  const panel=(key:string,label:string,r:Rect,binding:BoardElement['binding'])=>{
    const [x,y,w,h]=r,arch=!!p.asset&&(h>35||p.id==='jerusalemfour');
    add(key+'_fill',arch?'image':'box','מילוי '+label,r,arch?{image:`/new-shul-assets/${p.asset}-fill.png`,crop:{x:0,y:0,width:100,height:100}}:{fill:p.dark&&p.id==='midnightwide'?'#102b40':'#fff4dc',color:'transparent'});
    add(key+'_frame',arch?'image':'frame','מסגרת '+label,r,arch?{image:`/new-shul-assets/${p.asset}-frame.png`,crop:{x:0,y:0,width:100,height:100}}:{});
    const top=arch?(p.asset==='copperparchment'?4:p.id==='jerusalemfour'?h*12/64:12):2;
    text(key+'_heading','כותרת '+label,[x+2,y+top,w-4,4],2.6,{text:label,color:arch?p.ink:p.id==='midnightwide'?p.accent:p.ink});
    const inset=p.id==='jerusalemfour'&&binding==='prayers'?5:p.asset==='copperparchment'?3.7:2.4;
    text(key+'_content','תוכן '+label,[x+inset,y+top+6,w-inset*2,Math.max(3,h-top-10)],binding==='zmanim'?1.65:binding==='prayers'?2.3:1.7,
      {binding,rowsPerPage:binding==='zmanim'?13:binding==='prayers'?6:2,...(binding==='zmanim'?{zmanKeys:[...ZMAN_DISPLAY_KEYS]}:{})});
  };
  if(p.id==='ancientwood'){
    add('column_left','column','עמוד עץ שמאל',[1,6,4.5,89],{color:'#bd8c53'});
    add('column_right','column','עמוד עץ ימין',[94.5,6,4.5,89],{color:'#bd8c53'});
    add('crown','ornament','עיטור עליון',[37,1,26,5]);
  }
  if(p.id==='midnightwide')add('header','box','פס כותרת',[3,3,94,18],{fill:'#17394f',color:'transparent'});
  text('title','שם בית הכנסת',[27,5,66,7],4.2,{binding:'title',color:p.dark?'#f9e7c3':p.ink});
  text('date','תאריך עברי',[30,14,60,4],2.1,{binding:'date',color:p.dark?'#d8dce0':p.ink});
  text('clock','שעון חי',[6,5,19,9],6.8,{binding:'clock',color:p.accent});
  text('parasha','פרשת השבוע',[34,21,32,5],2.4,{binding:'parasha',color:p.dark?'#f9e7c3':p.ink});
  panel('prayers','זמני תפילות',p.prayers,'prayers');
  panel('zmanim','זמני היום',p.zmanim,'zmanim');
  panel('notices','הודעות',p.notices,'announcements');
  panel('lessons','שיעורי תורה',p.lessons,'lessons');
  text('footer','פרשה ולימוד יומי',[6,94,88,4],1.7,{binding:'footer',color:p.dark?'#f9e7c3':p.ink});
  return {id:`d_${p.id}`,name:`${p.name} · חלקים עצמאיים`,theme:p.dark?'navy':'stone',parts:['background','frames','text','layout'],colours:{'--tv-text':p.ink,'--tv-accent':p.accent},
    values:{...structuredClone(EMERALD_COMPOSITION.values),elements,backgroundImage:null,backgroundGradient:p.bg,font:p.id==='midnightwide'?'classic':'traditional'}};
});

// Layout variants reuse the actual independent artwork, not flattened screenshots.
for(const id of ['stonecenter','woodcenter']) {
  const design=structuredClone(ARCHITECTURAL_DESIGNS.find(d=>d.id==='d_jerusalemfour')!);
  const wood=id==='woodcenter';
  design.id=`d_${id}`;
  design.name=`${wood?'קשתות עץ':'קשתות ירושלים'} — קטנות במרכז · חלקים עצמאיים`;
  design.values.elements=design.values.elements!.map(e=>{
    const key=e.id.replace('jerusalemfour_','');
    const x=e.x+(key.startsWith('prayers_')?31:key.startsWith('notices_')||key.startsWith('lessons_')?-31:0);
    return {...e,id:`${id}_${key}`,x,image:wood?e.image.replace('stonearch','woodarch'):e.image,
      ...(wood&&['title','date','clock','parasha','footer'].includes(key)?{color:'#f5dfb5'}:{})};
  });
  if(wood){design.theme='navy';design.values.backgroundGradient='linear-gradient(125deg, #251911, #59402b 45%, #241810)';}
  ARCHITECTURAL_DESIGNS.push(design);
}
