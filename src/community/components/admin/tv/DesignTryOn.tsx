import {useEffect,useState} from 'react';
import type {TvConfig} from '@/tv/config';
import {applyDesign,BUILTIN_DESIGNS} from '@/tv/designs';
import {Button} from '@/components/ui/button';

export function DesignTryOn({config,onPreview,onEdit}:{config:TvConfig;onPreview:(c:Partial<TvConfig>|null)=>void;onEdit:(key:string,fn:(c:TvConfig)=>TvConfig)=>void}){
 const [choice,setChoice]=useState('');
 const [show,setShow]=useState(false);
 useEffect(()=>setShow(false),[config]);
 const design=[...BUILTIN_DESIGNS,...config.designs].find(d=>d.id===choice);
 useEffect(()=>{onPreview(show&&design?applyDesign(config,design):null);return()=>onPreview(null);},[show,design,config,onPreview]);
 return <section data-testid="design-try-on" className="space-y-2 rounded-lg border p-3">
  <h3 className="font-semibold">הדגם לי עם התוכן שלי</h3>
  <p className="text-sm">הערכה מוצגת בתצוגה המקדימה עם נתוני הלוח. הניסוי אינו נשמר; כדי לשמור יש להחיל לטיוטה ואז לשמור כרגיל.</p>
  <select aria-label="ערכה לניסיון" value={choice} onChange={e=>{setChoice(e.target.value);setShow(true);}} className="max-w-full rounded border bg-background p-2"><option value="">בחירת ערכה</option>{[...BUILTIN_DESIGNS,...config.designs].map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
  <div className="flex flex-wrap gap-2">
   <Button type="button" variant="outline" disabled={!design} onClick={()=>setShow(s=>!s)}>{show?'הצגת העיצוב הנוכחי':'הצגת הערכה לניסיון'}</Button>
   <Button type="button" disabled={!design} onClick={()=>{if(design){setShow(false);onPreview(null);onEdit('design-try-apply',c=>applyDesign(c,design));setChoice('');}}}>החלה לטיוטה</Button>
   <Button type="button" variant="ghost" disabled={!choice} onClick={()=>{setChoice('');setShow(false);}}>סיום הניסיון</Button>
  </div>
  <p role="status">{show&&design?`ניסיון בלבד: ${design.name}`:'מוצג העיצוב הנוכחי'}</p>
 </section>;
}
