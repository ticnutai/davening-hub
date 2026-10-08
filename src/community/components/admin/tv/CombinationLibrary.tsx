import type {TvConfig} from '@/tv/config';
import {READY_COMBINATIONS} from '@/tv/readyCombinations';
import {elementId,exportElementSet,importElementSet,MAX_ELEMENTS} from '@/tv/elements';
import {BoardElements} from '@/tv/BoardElements';
export function CombinationLibrary({config,onEdit,onSelect}:{config:TvConfig;onEdit:(key:string,fn:(c:TvConfig)=>TvConfig)=>void;onSelect:(ids:string[])=>void}){
 return <section data-testid="combination-library" className="space-y-2 rounded border p-3">
  <h3 className="font-semibold">שילובים מוכנים — חלקים עצמאיים</h3>
  <p className="text-xs">השילוב נוסף לקיים, כקבוצה נבחרת להזזה. אפשר לפרק קבוצה ולערוך כל חלק. התוכן החי מגיע מהלוח; לאחר ההוספה מקמו אותו באזור פנוי ושמרו.</p>
  {config.screenLayout!=='composition'&&<p className="text-xs">מתאים לפריסה חופשית: עברו לפריסה זו לפני הוספת שילוב.</p>}
  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{READY_COMBINATIONS.map(item=><button key={item.id} type="button" aria-label={`הוספת שילוב ${item.name}`} disabled={config.screenLayout!=='composition'||config.elements.length+item.elements.length>MAX_ELEMENTS} className="rounded border bg-background p-2 text-right disabled:opacity-40" onClick={()=>{
   const group=elementId();
   const added=importElementSet(exportElementSet(item.elements)).map(e=>({...e,group,locked:false,hidden:false}));
   onEdit(`combination:${group}`,c=>c.elements.length+added.length>MAX_ELEMENTS?c:{...c,elements:[...c.elements,...added]});onSelect(added.map(e=>e.id));
  }}><div className="relative aspect-video bg-stone-100" style={{containerType:'size'}}><BoardElements elements={item.elements}/></div><strong className="block text-sm">{item.name}</strong><span className="text-xs">{item.description} · {item.elements.length} חלקים</span></button>)}</div>
 </section>;
}
