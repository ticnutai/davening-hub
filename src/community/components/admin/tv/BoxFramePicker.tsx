import {useEffect,useState} from 'react';
import type {TvConfig} from '@/tv/config';
import {BOX_FRAMES,frameForSelection,isSeparateFrame,replaceBoxFrame} from '@/tv/boxFrames';
export function BoxFramePicker({config,selected,onEdit,assetBase='/new-shul-assets'}:{config:TvConfig;selected:string[];assetBase?:string;onEdit:(key:string,fn:(c:TvConfig)=>TvConfig)=>void}){
 const frames=config.elements.filter(isSeparateFrame);
 const [target,setTarget]=useState('');const [withFill,setWithFill]=useState(true);
 const automatic=frameForSelection(config.elements,selected)?.id;
 useEffect(()=>{if(automatic)setTarget(automatic);},[automatic]);
 const frame=frames.find(e=>e.id===target);
 return <section data-testid="box-frame-picker" className="space-y-2 rounded border p-3">
  <h3 className="font-semibold">החלפת מסגרת לתיבה</h3>
  <label>התיבה לעריכה<select aria-label="התיבה להחלפת מסגרת" className="block rounded border p-2" value={frame?target:''} onChange={e=>setTarget(e.target.value)}><option value="">בחרו תיבה</option>{frames.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
  <label className="flex gap-2"><input type="checkbox" checked={withFill} onChange={e=>setWithFill(e.target.checked)}/>התאמת המילוי וצבע הטקסט למסגרת</label>
  <p className="text-xs">התוכן והמיקום נשמרים. בערכות ציור ישנות מסגרת ורקע מחוברים אינם ניתנים להחלפה נפרדת כאן.</p>
  {frame?.locked&&<p>המסגרת נעולה. שחררו אותה כדי להחליף.</p>}
  <div className="grid grid-cols-3 gap-2">{BOX_FRAMES.map(f=><button type="button" key={f.id} disabled={!frame||frame.locked} aria-label={`החלפת המסגרת ל${f.name}`} className="rounded border p-2 text-xs disabled:opacity-40" onClick={()=>onEdit(`box-frame:${target}`,c=>({...c,elements:replaceBoxFrame(c.elements,target,f.id,withFill,assetBase)}))}>
   {f.asset?<img loading="lazy" src={`${assetBase}/${f.asset}-frame.png`} alt="" className="mx-auto h-16 w-16 object-contain"/>:<span className="mx-auto block h-16 w-16 border-4 border-double" style={{borderColor:f.color}}/>}{f.name}
  </button>)}</div>
 </section>;
}
