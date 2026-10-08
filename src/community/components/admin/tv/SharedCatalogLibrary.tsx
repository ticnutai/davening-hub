import {useEffect,useState} from 'react';
import type {TvConfig} from '@/tv/config';
import {applyDesign} from '@/tv/designs';
import {importElementSet,exportElementSet,MAX_ELEMENTS} from '@/tv/elements';
import {BoardElements} from '@/tv/BoardElements';
import {findBackdrop} from '@/tv/backdrops';
import {loadSharedCatalog,type SharedCatalog} from '@/tv/sharedCatalog';

/** Global read-only choices. Never saves or changes a board merely by opening it. */
export function SharedCatalogLibrary({mode,config,onEdit,onSelect}:{
 mode:'designs'|'parts';config:TvConfig;
 onEdit:(key:string,update:(c:TvConfig)=>TvConfig)=>void;onSelect?:(ids:string[])=>void;
}){
 const [catalog,setCatalog]=useState<SharedCatalog>();
 const [error,setError]=useState('');const [search,setSearch]=useState('');
 const [source,setSource]=useState('standalone');const [limit,setLimit]=useState(12);
 const [attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setError('');loadSharedCatalog(attempt>0).then(c=>{if(active)setCatalog(c);}).catch(()=>{if(active)setError('לא ניתן לטעון את הקטלוג המשותף. העיצוב השמור בלוח לא השתנה.');});return()=>{active=false;};},[attempt]);
 const designs=catalog?.designs.filter(d=>d.name.includes(search.trim()))??[];
 const parts=catalog?.parts.filter(p=>p.designId===source&&p.name.includes(search.trim()))??[];
 const total=mode==='designs'?designs.length:parts.length;
 return <section className="space-y-3 rounded-lg border p-3" data-testid={`shared-catalog-${mode}`} dir="rtl">
  <h3 className="font-semibold">{mode==='designs'?'ערכות משותפות לכל בתי הכנסת':'חלקים משותפים מכל הערכות'}</h3>
  <p className="text-xs">זמין בכל לוח, גם חדש. בחירה משנה טיוטה בלבד; הפרסום משתמש בשמירה הרגילה של הלוח.</p>
  {!catalog&&!error&&<p role="status">טוען קטלוג משותף…</p>}
  {error&&<div role="alert">{error}<button type="button" onClick={()=>setAttempt(a=>a+1)}>ניסיון נוסף</button></div>}
  {catalog&&<>
   <label>חיפוש בקטלוג המשותף<input className="rounded border p-2" value={search} onChange={e=>{setSearch(e.target.value);setLimit(12);}}/></label>
   {mode==='parts'&&<label>חלקים מאיזו ערכה<select className="rounded border p-2" value={source} onChange={e=>{setSource(e.target.value);setSearch('');setLimit(12);}}>
    <option value="standalone">פריטים עצמאיים מהספרייה</option>
    {catalog.designs.filter(d=>catalog.parts.some(p=>p.designId===d.id)).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
   </select></label>}
   <p data-testid="shared-count" className="text-xs">{total} {mode==='designs'?'ערכות':'חלקים'} זמינים</p>
   <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {mode==='designs'?designs.slice(0,limit).map(d=><article key={d.id} className="rounded border p-2">
     <img loading="lazy" alt="" className="aspect-video w-full object-cover" src={d.values.elements?.find(e=>e.image)?.image||findBackdrop(d.values.backgroundImage??null)?.thumb||d.values.backgroundImage||undefined}/>
     <p>{d.name}</p>
     {d.id.startsWith('d_premium_')&&<p className="text-xs">אזורי ציור עם רקע מחובר; הטקסט והשעון נפרדים</p>}
     <button type="button" className="underline" onClick={()=>onEdit(`shared-design:${d.id}`,c=>applyDesign(c,d))} aria-label={`החלת ערכה משותפת ${d.name}`}>בחירת הערכה</button>
    </article>):parts.slice(0,limit).map(p=><article key={p.id} className="rounded border p-2">
     <div className="relative h-24 bg-slate-100" style={{containerType:'size'}}><BoardElements elements={p.elements.map(e=>({...e,x:5,y:5,width:90,height:90}))}/></div>
     <p>{p.name}</p><p className="text-xs">{p.note}</p>
     <button type="button" className="underline disabled:opacity-40" disabled={config.elements.length+p.elements.length>MAX_ELEMENTS} aria-label={`הוספת חלק משותף ${p.name}`} onClick={()=>{
      const added=importElementSet(exportElementSet(p.elements)).map(e=>({...e,hidden:false,locked:false}));
      onEdit(`shared-part:${p.id}`,c=>c.elements.length+added.length>MAX_ELEMENTS?c:{...c,elements:[...c.elements,...added]});onSelect?.(added.map(e=>e.id));
     }}>הוספת חלק</button>
    </article>)}
   </div>
   {limit<total&&<button type="button" className="underline" onClick={()=>setLimit(n=>n+12)}>הצגת עוד</button>}
   {!total&&<p>לא נמצאו תוצאות</p>}
  </>}
 </section>;
}
