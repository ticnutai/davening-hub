import {newElement,type BoardElement,type SavedElementSet} from './elements';
import {REALISTIC_PARTS} from './realisticDesigns';
import {SEPARATE_PARTS} from './separateParts';

const parts=[
 ['azure-frame','מסגרת תכלת גאומטרית','מסגרות'],['scroll-frame','מסגרת קלף מגולגל','מסגרות'],['garnet-frame','מסגרת כתר ארגמן','מסגרות'],['bronze-frame','מסגרת שער נחושת','מסגרות'],
 ['azure-fill','מילוי תכלת','מילויים'],['scroll-fill','מילוי קלף','מילויים'],['garnet-fill','מילוי ארגמן','מילויים'],['bronze-fill','מילוי שנהב','מילויים'],
 ['book','ספר פתוח','עיטורים'],['pomegranate','רימון ארגמן','עיטורים'],['olive','ענף זית','עיטורים'],['crown','כתר זהב','עיטורים'],
 ['candles','פמוטי שבת','עיטורים'],['cup','גביע קידוש','עיטורים'],['torah','ספר תורה','עיטורים'],['diamond','מעוין תכלת','עיטורים'],
 ['rosette','שושנת ויטראז׳','עיטורים'],['corner','פינת עלים','עיטורים'],['divider','מפריד מעוין','עיטורים'],['plaque','לוחית כותרת','עיטורים'],
 ['column','עמוד מחורץ','עמודים'],['lattice','סבכת זהב','עמודים'],['fan','מניפת קווים','עיטורים'],['star','מגן דוד','עיטורים'],
] as const;
export const READY_ELEMENTS:(SavedElementSet&{category:string})[]=parts.map(([id,name,category])=>({
 id:'ready_'+id,name,category,elements:[{...newElement('image'),id:'part_'+id,name,image:`/new-shul-assets/collection-${id}.png`,x:38,y:28,width:24,height:43,crop:{x:0,y:0,width:100,height:100}}],
}));
for(const [id,name] of [['shofar','שופר'],['honey','תפוח ודבש'],['lulav','לולב הדסים וערבות'],['etrog','אתרוג'],['sukkah','סוכה'],['matzah','מצה'],['seder','קערת הסדר'],['chanukiah','חנוכייה'],['dreidel','סביבון'],['megillah','מגילה'],['hamentashen','אוזן המן'],['wheat','שיבולת'],['tablets','לוחות הברית'],['challah','חלה'],['havdalah','נר ובשמים להבדלה'],['wreath','זר זית']]){
 READY_ELEMENTS.push({id:'ready_holiday_'+id,name,category:'שבת וחגים',elements:[{...newElement('image'),id:'holiday_'+id,name,image:`/new-shul-assets/holiday-${id}.png`,x:38,y:28,width:24,height:43,crop:{x:0,y:0,width:100,height:100}}]});
}
/** A contact sheet is a portable editable board, not a flattened image. */
READY_ELEMENTS.unshift(...SEPARATE_PARTS,...REALISTIC_PARTS);
for(const [id,name,w,h] of [
 ['art-jerusalem-watercolor','ירושלים — צבעי מים',44,32],
 ['art-study-walnut','ספר פתוח — עץ אגוז ריאליסטי',28,33.18],
 ['art-olive-enamel','ענף זית — זהב ושנהב',34,30.22],
] as const){
 READY_ELEMENTS.unshift({id:'ready_'+id,name,category:'איורים אמנותיים',elements:[{...newElement('image'),id:'part_'+id,name,image:`/new-shul-assets/${id}.png`,x:30,y:32,width:w,height:h,crop:{x:0,y:0,width:100,height:100}}]});
}
const rowHeight=96/Math.ceil(READY_ELEMENTS.length/8);
export const READY_ELEMENT_SHEET:BoardElement[]=READY_ELEMENTS.map((item,i)=>({...item.elements[0],x:3+(i%8)*12,y:2+Math.floor(i/8)*rowHeight,width:10,height:rowHeight-2}));
// Category sets stay within existing importers' 24-set limit; every part travels.
export const READY_LIBRARY_SETS:SavedElementSet[]=[...new Set(READY_ELEMENTS.map(e=>e.category))].map((category,i)=>({id:'ready_category_'+i,name:category,elements:READY_ELEMENT_SHEET.filter(e=>READY_ELEMENTS.find(item=>item.elements[0].id===e.id)?.category===category)}));
