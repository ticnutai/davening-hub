import type {SavedDesign} from './designs';
import {newElement, type BoardElement} from './elements';
import {EMERALD_COMPOSITION} from './emeraldComposition';
import {ZMAN_DISPLAY_KEYS} from '@/community/lib/zmanim';

/** Original silhouettes and compositions, not palette variants of an existing preset. */
export const SIGNATURE_DESIGNS: SavedDesign[] = ['vitrail', 'artdeco'].map(id => {
  const glass = id === 'vitrail';
  const ink = glass ? '#f6eedc' : '#f8ecd4';
  const accent = glass ? '#d8b974' : '#d8b67b';
  const elements: BoardElement[] = [];
  const add = (key: string, kind: BoardElement['kind'], name: string, r: number[], extra: Partial<BoardElement> = {}) => {
    const [x,y,width,height] = r;
    elements.push({...newElement(kind),id:`${id}_${key}`,name,x,y,width,height,color:accent,fill:'transparent',...extra});
  };
  const text = (key: string, name: string, r: number[], fontSize: number, extra: Partial<BoardElement>) =>
    add(key,'text',name,r,{fontSize,color:ink,...extra});
  const art = (key: string,name: string,r: number[],asset: string) => add(key,'image',name,r,{image:`/new-shul-assets/${asset}.png`,crop:{x:0,y:0,width:100,height:100}});
  const panel = (key: string,label: string,r: number[],binding: BoardElement['binding'],arched = false) => {
    const [x,y,w,h] = r;
    const top = arched ? 17 : Math.max(4, h * .15);
    const asset = arched ? 'vitrail' : 'artdeco';
    art(key+'_fill','מילוי '+label,r,asset+'-fill');
    art(key+'_frame','מסגרת '+label,r,asset+'-frame');
    text(key+'_heading','כותרת '+label,[x+3,y+top,w-6,4],2.7,{text:label,color:accent});
    text(key+'_content','תוכן '+label,[x+3,y+top+6,w-6,h-top-6-(arched?5:Math.max(5,h*.15))],binding==='zmanim'?1.65:binding==='prayers'?2.4:1.8,
      {binding,rowsPerPage:binding==='zmanim'?13:binding==='prayers'?6:2,...(binding==='zmanim'?{zmanKeys:[...ZMAN_DISPLAY_KEYS]}:{})});
  };
  if(glass) {
    art('rose','חלון שושנה עצמאי',[44,0,12,32],'vitrail-rose');
    text('title','שם בית הכנסת',[57,6,39,7],3.8,{binding:'title'});
    text('date','תאריך עברי',[60,16,33,4],2,{binding:'date'});
    text('clock','שעון חי',[5,6,30,10],7,{binding:'clock'});
    text('parasha','פרשת השבוע',[5,19,30,5],2.5,{binding:'parasha'});
    panel('zmanim','זמני היום',[3,28,29,65],'zmanim',true);
    panel('prayers','זמני תפילות',[68,28,29,65],'prayers',true);
    panel('notices','הודעות',[35,33,30,31],'announcements');
    panel('lessons','שיעורי תורה',[35,67,30,26],'lessons');
  } else {
    art('sunburst','מניפת זהב עצמאית',[1,1,98,24],'deco-fan');
    text('title','שם בית הכנסת',[28,7,44,7],4.4,{binding:'title'});
    text('clock','שעון חי',[5,7,21,10],6.3,{binding:'clock'});
    text('date','תאריך עברי',[73,7,22,5],1.8,{binding:'date'});
    text('parasha','פרשת השבוע',[32,20,36,5],2.4,{binding:'parasha'});
    panel('zmanim','זמני היום',[4,30,29,62],'zmanim');
    panel('prayers','זמני תפילות',[36,30,31,62],'prayers');
    panel('notices','הודעות',[70,30,26,34],'announcements');
    panel('lessons','שיעורי תורה',[70,67,26,25],'lessons');
  }
  text('footer','פרשה ולימוד יומי',[5,95,90,3],1.65,{binding:'footer'});
  return {id:`d_${id}`,name:`${glass?'ויטראז׳ ושושנה':'אר־דקו מניפת זהב'} · חלקים עצמאיים`,theme:'navy',parts:['background','frames','text','layout'],colours:{'--tv-text':ink,'--tv-accent':accent},
    values:{...structuredClone(EMERALD_COMPOSITION.values),elements,backgroundImage:null,font:'traditional',backgroundGradient:glass?'radial-gradient(ellipse at 50% 10%, #24374b, #101e30 50%, #090f1f)':'linear-gradient(140deg, #183935, #091c1b 65%, #102d29)'}};
});
