import type {SavedDesign} from './designs';
import {REALISTIC_DESIGNS,REALISTIC_PARTS} from './realisticDesigns';
import {SEPARATE_PARTS} from './separateParts';
import {newElement,type BoardElement} from './elements';

const recipes=[
 ['shavuotcomplete','שבועות — פריחה וביכורים','חג שבועות שמח',1,['אלומת חיטה ריאליסטית','פרחים לבנים באגרטל כסף','סל ביכורים ריאליסטי','פרוסת עוגת גבינה']],
 ['pesachcomplete','פסח — ליל הסדר','חג פסח כשר ושמח',1,['מצה שמורה ריאליסטית','כיסוי מצות רקום','הגדה בכריכת שנהב','גביע ליל הסדר']],
 ['hanukkahgold','חנוכה — זהב ופיסטוק','הנרות הללו קודש הם',1,['חנוכיית שמן מפליז מבריק','סופגניית פיסטוק נפרדת','סופגניית שוקולד נפרדת','כד שמן זית לחנוכה']],
 ['shabbatrose','שבת — חלות וכסף','לקראת שבת לכו ונלכה',1,['פמוטים מבריקים — קווים נקיים','חלת כתר חגיגית','חלה עגולה קלועה','גביע ומגש כסף מבריק']],
 ['shabbatcomplete','שבת — שולחן כסף','שבת שלום',0,['פמוט כסף יחיד','חלת שומשום חגיגית','גביע כסף ללא מגש','חלת כתר חגיגית']],
 ['challotcomplete','חלות — ברכת הבית','שבת שלום ומבורך',1,['חלת שומשום חגיגית','חלה עגולה קלועה','חלת פרג קלועה','חלת כתר חגיגית']],
 ['hanukkahcomplete','חנוכה — אור ומתיקות','חנוכה שמח',0,['חנוכיית קריסטל וכסף','סופגניית ריבה נפרדת','לביבת תפוחי אדמה פריכה','סביבון כסף מעוטר']],
 ['sukkotcomplete','סוכות — ארבעת המינים','ושמחת בחגך',1,['אתרוג ריאליסטי נפרד','לולב נפרד','הדסים נפרדים','ערבות נפרדות']],
 ['roshcomplete','ראש השנה — שנה מתוקה','שנה טובה ומתוקה',1,['שופר איל ריאליסטי','חלה עגולה קלועה','צנצנת דבש נפרדת','רימון ריאליסטי נפרד']],
 ['torahcomplete','תורה — כתר של כסף','כי הם חיינו ואורך ימינו',0,['ספר תורה במעיל ללא כתר','כתר תורה כסף נפרד','ספר עור נפרד','אצבע כסף לקריאת התורה']],
] as const;
export const TOPIC_DESIGNS:SavedDesign[]=recipes.map(([id,name,greeting,base,names])=>{
 const d=structuredClone(REALISTIC_DESIGNS[base]);
 d.id='d_'+id;d.name=name+' · חלקים עצמאיים';
 d.values.elements=(d.values.elements as BoardElement[]).filter(e=>!e.id.includes('_prop_')).map(e=>({...e,id:e.id.replace(base?'pearlgold':'walnutsilver',id)}));
 const elements=d.values.elements as BoardElement[];
 // Keep the live content above the decorative shelf; text is never baked into artwork.
 elements.find(e=>e.binding==='footer')!.y=97;
 elements.push({...newElement('text'),id:id+'_greeting',name:'ברכת הנושא',text:greeting,x:34,y:23,width:32,height:6,fontSize:3.5,color:base?'#76551f':'#fff5de',fill:'transparent'});
 for(const [i,partName] of names.entries()){
  const part=[...SEPARATE_PARTS,...REALISTIC_PARTS].find(p=>p.name===partName);
  if(!part)throw new Error('Missing topic asset: '+partName);
  const e=structuredClone(part.elements[0]);
  const ratio=e.width/e.height;
  e.height=Math.min(16,12/ratio);e.width=e.height*ratio;
  e.x=[1,16,72,86][i]+(12-e.width)/2;e.y=96-e.height;e.id=id+'_decoration_'+i;
  elements.push(e);
 }
 return d;
});
