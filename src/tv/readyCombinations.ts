import {newElement,type BoardElement,type ElementBinding} from './elements';
import {READY_ELEMENTS} from './readyElements';
const text=(name:string,binding:ElementBinding|undefined,x:number,y:number,width:number,height:number,fontSize=3):BoardElement=>({...newElement('text'),name,binding,text:binding?'':name,x,y,width,height,fontSize,color:'#382719'});
function panel(label:string,binding:ElementBinding,x:number,y:number,w:number,h:number):BoardElement[]{
 return [
  {...newElement('box'),name:`מילוי ${label}`,x,y,width:w,height:h,fill:'#fff4dc'},
  {...newElement('frame'),name:`מסגרת ${label}`,x,y,width:w,height:h,color:'#b48b3c'},
  text(`כותרת ${label}`,undefined,x+2,y+2,w-4,5,2.5),
  text(`תוכן ${label}`,binding,x+3,y+8,w-6,h-11,2.2),
 ].map(e=>({...e,text:e.name.startsWith('כותרת ')?label:e.text}));
}
const prop=(id:string,x:number,y:number,w:number,h:number)=>{
 const e=READY_ELEMENTS.find(p=>p.id===id)?.elements[0];
 return e?[{...structuredClone(e),x,y,width:w,height:h}]:[];
};
export const READY_COMBINATIONS:{id:string;name:string;description:string;elements:BoardElement[]}[]=[
 {id:'welcome',name:'כותרת ושעון',description:'שם בית הכנסת, תאריך ושעון חיים',elements:[text('שם בית הכנסת','title',30,4,62,8,4),text('תאריך','date',32,13,56,5,2),text('שעון','clock',5,4,22,10,5)]},
 {id:'prayers',name:'פינת תפילות',description:'מסגרת, מילוי, כותרת ומניינים חיים',elements:panel('זמני תפילות','prayers',35,24,30,48)},
 {id:'zmanim',name:'פינת זמני היום',description:'מסגרת ותוכן המחובר לזמני היום',elements:panel('זמני היום','zmanim',3,24,30,62)},
 {id:'learning',name:'פינת לימוד',description:'שיעורים חיים וספר נפרד להזזה',elements:[...panel('שיעורי תורה','lessons',35,24,32,42),...prop('ready_book',59,57,12,19)]},
 {id:'notice',name:'פינת הודעות',description:'כותרת, מילוי, מסגרת והודעות הלוח',elements:panel('הודעות','announcements',35,24,34,38)},
 {id:'shabbat',name:'פינת שבת',description:'פמוטים, חלה וברכת שבת — שלושה חלקים',elements:[...prop('ready_silver_candles',30,60,12,25),...prop('ready_holiday_challah',45,68,18,17),text('שבת שלום',undefined,30,52,36,8,4)]},
];
