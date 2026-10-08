import type {SavedDesign} from './designs';
import {FESTIVAL_DESIGNS} from './festivalDesigns';
import {newElement,type BoardElement,type SavedElementSet} from './elements';

type Crop=readonly[number,number,number,number];
const presets=[
 {id:'walnutsilver',name:'שבת כסף ואגוז',ink:'#392b20',accent:'#fff5de',arch:[6.4,.7,33.4,44.3],wide:[51,8.8,45.5,31.8],prop:[4.8,46.2,35,51.5],prop2:[44,55,54,44],props:['פמוטי כסף מלוטשים','חלות וגביע כסף']},
 {id:'pearlgold',name:'שיש פנינה וזהב',ink:'#473421',accent:'#76551f',arch:[6,0,37,50],wide:[49.5,11,49,30.5],prop:[3,51,47,46],prop2:[49.5,52,49,47],props:['גביע כסף ומגש זית','ספר וענף זית']},
] as const;
const crop=(r:Crop)=>({x:r[0],y:r[1],width:r[2],height:r[3]});
export const REALISTIC_PARTS:(SavedElementSet&{category:string})[]=[];
for(const p of presets){
 for(const [key,name,c] of [['arch','קשת '+p.name,p.arch],['wide','מסגרת '+p.name,p.wide],['prop',p.props[0],p.prop],['prop2',p.props[1],p.prop2]] as const){
  REALISTIC_PARTS.push({id:`ready_${p.id}_${key}`,name,category:'ריאליסטיים',elements:[{...newElement('image'),id:`part_${p.id}_${key}`,name,image:`/new-shul-assets/${p.id}-atlas.png`,crop:crop(c),x:38,y:28,width:24,height:43}]});
 }
}
for(const [key,name,c] of [['candles','פמוטים מבריקים — קווים נקיים',[10,0,34,49]],['cup','גביע ומגש כסף מבריק',[57,6,37,41]],['etrog','קופסת אתרוג כסף מבריקה',[5,55,43,39]],['spice','מגדל בשמים כסף מבריק',[66,49,21,49]]] as const){
 REALISTIC_PARTS.push({id:`ready_silver_${key}`,name,category:'ריאליסטיים',elements:[{...newElement('image'),id:`part_silver_${key}`,name,image:'/new-shul-assets/polishedsilver-atlas.png',crop:crop(c),x:38,y:28,width:24,height:43}]});
}
for(const [key,name,c] of [['candles','חנוכיית כסף — תשעה נרות',[1,1,47,47]],['oil','חנוכיית שמן וכסף',[51,5,48,43]],['dreidels','סביבוני עץ אגוז וזית',[1,53,48,41]],['cruet','כד שמן זית לחנוכה',[51,52,44,45]]] as const){
 REALISTIC_PARTS.push({id:`ready_hanukkah_${key}`,name,category:'ריאליסטיים',elements:[{...newElement('image'),id:`part_hanukkah_${key}`,name,image:'/new-shul-assets/hanukkahsilver-atlas.png',crop:crop(c),x:38,y:28,width:24,height:43}]});
}
for(const [key,name,c] of [['crystal','חנוכיית קריסטל וכסף',[4,1,42,49]],['brass','חנוכיית שמן מפליז מבריק',[51,16,47,29]],['doughnuts','סופגניות על מגש כסף',[0,59,50,31]],['dreidel','סביבון כסף מעוטר',[63,53,29,39]]] as const){
 REALISTIC_PARTS.push({id:`ready_hanukkah_luxury_${key}`,name,category:'ריאליסטיים',elements:[{...newElement('image'),id:`part_hanukkah_luxury_${key}`,name,image:'/new-shul-assets/hanukkahcrystal-atlas.png',crop:crop(c),x:38,y:28,width:24,height:24*16/9*c[3]/c[2]}]});
}
export const REALISTIC_DESIGNS:SavedDesign[]=presets.map(p=>{
 const d=structuredClone(FESTIVAL_DESIGNS[0]);
 d.id='d_'+p.id;d.name=p.name+' · חלקים עצמאיים';
 d.colours={'--tv-text':p.ink,'--tv-accent':p.accent};
 d.values.backgroundImage=`/new-shul-assets/${p.id}-background.png`;
 const elements=d.values.elements as BoardElement[];
 for(const e of elements){
  e.id=e.id.replace('ivorylight',p.id);e.color=p.ink;
  if(e.id.endsWith('_fill'))e.image=`/new-shul-assets/${p.id}-${e.id.includes('zmanim')||e.id.includes('prayers')?'arch':'wide'}-fill.png`;
  if(e.id.endsWith('_frame')){e.image=`/new-shul-assets/${p.id}-atlas.png`;e.crop=crop(e.id.includes('zmanim')||e.id.includes('prayers')?p.arch:p.wide);}
  if(['title','clock','date','parasha','footer'].some(k=>e.id===`${p.id}_${k}`))e.color=p.accent;
  if(e.id.endsWith('_prop_left')){e.image=`/new-shul-assets/${p.id}-atlas.png`;e.crop=crop(p.prop);e.name=p.props[0];e.x=1;e.y=78;e.width=13;e.height=21;}
  if(e.id.includes('zmanim_content')||e.id.includes('prayers_content')){e.x+=2;e.width-=4;e.height=35;e.fontSize=e.binding==='zmanim'?1.45:2.4;}
  if(e.id.includes('lessons_content')||e.id.includes('notices_content')){e.x+=1;e.width-=2;}
 }
 elements.push({...newElement('image'),id:`${p.id}_prop_right`,name:p.props[1],image:`/new-shul-assets/${p.id}-atlas.png`,crop:crop(p.prop2),x:85,y:82,width:14,height:17});
 return d;
});
