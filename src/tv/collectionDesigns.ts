import type {SavedDesign} from './designs';
import {newElement,type BoardElement} from './elements';
import {EMERALD_COMPOSITION} from './emeraldComposition';
import {ZMAN_DISPLAY_KEYS} from '@/community/lib/zmanim';
type Rect=readonly [number,number,number,number];
const choices=[
 {id:'azuregallery',asset:'azure',name:'תכלת גאומטרי',ink:'#e3f3f3',accent:'#81cbd2',bg:'linear-gradient(125deg,#091927,#183b50 60%,#0c2636)',ornament:'diamond',prayers:[36,28,29,64],zmanim:[4,28,29,64],notices:[68,28,28,30],lessons:[68,62,28,30]},
 {id:'scrollstudy',asset:'scroll',name:'קלף וספר',ink:'#553e2c',accent:'#966631',bg:'radial-gradient(ellipse at 50% 20%,#fff9e9,#d4bb92)',ornament:'book',prayers:[67,26,29,65],zmanim:[4,26,29,65],notices:[36,33,28,27],lessons:[36,64,28,27]},
 {id:'garnetcourt',asset:'garnet',name:'רימוני ארגמן',ink:'#fff0d6',accent:'#e0bb76',bg:'radial-gradient(ellipse at 50% 0%,#6a3855,#261224 75%)',ornament:'pomegranate',prayers:[5,27,28,65],zmanim:[67,27,28,65],notices:[36,33,28,27],lessons:[36,65,28,27]},
 {id:'bronzegates',asset:'bronze',name:'שערי נחושת',ink:'#49351f',accent:'#8c5729',bg:'linear-gradient(125deg,#c8b191,#fbf1dc 55%,#c9bda9)',ornament:'torah',prayers:[66,26,29,66],zmanim:[5,26,29,66],notices:[37,32,26,28],lessons:[37,64,26,28]},
] as const;
export const COLLECTION_DESIGNS:SavedDesign[]=choices.map(p=>{
 const elements:BoardElement[]=[];
 const add=(id:string,kind:BoardElement['kind'],name:string,r:Rect,extra:Partial<BoardElement>={})=>{const [x,y,width,height]=r;elements.push({...newElement(kind),id:p.id+'_'+id,name,x,y,width,height,fill:'transparent',color:p.ink,...extra});};
 const text=(id:string,name:string,r:Rect,fontSize:number,extra:Partial<BoardElement>)=>add(id,'text',name,r,{fontSize,...extra});
 const art=(id:string,name:string,r:Rect,asset:string)=>add(id,'image',name,r,{image:`/new-shul-assets/collection-${asset}.png`,crop:{x:0,y:0,width:100,height:100}});
 const panel=(id:string,label:string,r:Rect,binding:BoardElement['binding'])=>{
  const [x,y,w,h]=r,arched=['bronze','garnet'].includes(p.asset),top=arched?h*.29:Math.max(5,h*.12),inset=p.asset==='scroll'?4.7:3.6;
  art(id+'_fill','מילוי '+label,r,p.asset+'-fill');art(id+'_frame','מסגרת '+label,r,p.asset+'-frame');
  text(id+'_heading','כותרת '+label,[x+inset,y+top,w-2*inset,4],2.5,{text:label});
  text(id+'_content','תוכן '+label,[x+inset,y+top+5,w-2*inset,h-top-(p.asset==='scroll'&&h>40?17:10)],binding==='zmanim'?1.5:binding==='prayers'?2.7:1.7,{binding,rowsPerPage:binding==='zmanim'?13:binding==='prayers'?6:2,...(binding==='zmanim'?{zmanKeys:[...ZMAN_DISPLAY_KEYS]}:{})});
 };
 art('symbol','עיטור ראשי',[44,1,12,19],p.ornament);
 text('title','שם בית הכנסת',[57,4,39,7],3.4,{binding:'title'});
 text('clock','שעון חי',[4,4,26,8],6,{binding:'clock',color:p.accent});
 text('date','תאריך עברי',[58,14,36,4],2,{binding:'date'});
 text('parasha','פרשת השבוע',[5,16,26,4],2.2,{binding:'parasha'});
 panel('prayers','זמני תפילות',p.prayers,'prayers');panel('zmanim','זמני היום',p.zmanim,'zmanim');
 panel('notices','הודעות',p.notices,'announcements');panel('lessons','שיעורי תורה',p.lessons,'lessons');
 art('divider','מפריד עצמאי',[35,19,30,7],'divider');
 text('footer','פרשה ולימוד יומי',[5,95,90,3],1.5,{binding:'footer'});
 return {id:'d_'+p.id,name:p.name+' · חלקים עצמאיים',theme:['azure','garnet'].includes(p.asset)?'navy':'stone',parts:['background','frames','text','layout'],colours:{'--tv-text':p.ink,'--tv-accent':p.accent},values:{...structuredClone(EMERALD_COMPOSITION.values),elements,font:p.asset==='azure'?'classic':'traditional',backgroundImage:null,backgroundGradient:p.bg}};
});

// Holiday editions intentionally share frame families, with independent greetings
// and holiday objects. Applying a holiday is explicit, never calendar-triggered.
for(const [id,name,base,greeting,left,right] of [
 ['shabbatpeace','שבת של שלום','bronzegates','שבת שלום ומבורך','candles','challah'],
 ['chanukahlight','אור החנוכה','azuregallery','חנוכה שמח','chanukiah','dreidel'],
 ['pesachfreedom','פסח של חירות','scrollstudy','חג פסח כשר ושמח','matzah','seder'],
 ['shofarvoice','קול שופר','garnetcourt','לשנה טובה תיכתבו ותיחתמו','shofar','honey'],
 ['shavuottorah','מתן תורה','bronzegates','חג שבועות שמח','tablets','wheat'],
 ['purimjoy','שמחת פורים','garnetcourt','פורים שמח','megillah','hamentashen'],
] as const){
 const design=structuredClone(COLLECTION_DESIGNS.find(d=>d.id==='d_'+base)!);
 design.id='d_'+id;design.name=name+' · חלקים עצמאיים';
 design.values.elements=design.values.elements!.filter(e=>!e.id.endsWith('_symbol')&&!e.id.endsWith('_divider')).map(e=>({...e,id:e.id.replace(base,id)}));
 const elements=design.values.elements;
 const color=design.colours['--tv-text']!;
 elements.push({...newElement('text'),id:id+'_greeting',name:'ברכת המועד',text:greeting,x:32,y:2,width:36,height:7,fontSize:2.8,color});
 for(const [side,asset,x] of [['left',left,1],['right',right,93]] as const){
  const prefix=asset==='candles'?'collection':'holiday';
  elements.push({...newElement('image'),id:id+'_decor_'+side,name:'עיטור '+name+' '+side,image:`/new-shul-assets/${prefix}-${asset}.png`,x,y:87,width:6,height:12,crop:{x:0,y:0,width:100,height:100}});
 }
 // Reserve header centre for the greeting; live title/date keep their own regions.
 const title=elements.find(e=>e.binding==='title')!;title.x=37;title.y=12;title.width=58;title.height=6;
 const date=elements.find(e=>e.binding==='date')!;date.x=38;date.y=20;date.width=56;
 if(id==='shabbatpeace'||id==='shavuottorah'){
  design.values.backgroundGradient=id==='shabbatpeace'?'linear-gradient(125deg,#e1e8ef,#fffdf4 60%,#c6d4e2)':'linear-gradient(125deg,#d9e3c7,#fcf7de 55%,#b3c9ae)';
 }
 COLLECTION_DESIGNS.push(design);
}
