import { CombinationLibrary } from './CombinationLibrary';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { BoardElements } from '@/tv/BoardElements';
import type { TvConfig } from '@/tv/config';
import { elementId, exportElementSet, importElementSet, MAX_ELEMENTS, MAX_ELEMENT_SETS } from '@/tv/elements';
import {READY_ELEMENTS,READY_ELEMENT_SHEET,READY_LIBRARY_SETS} from '@/tv/readyElements';
import {exportWorkspace,downloadFile} from '@/tv/workspaceTransfer';
import {normalizeTvConfig} from '@/tv/config';

export function ElementLibrary({ config, selected, onEdit, onSelect }: {
  config: TvConfig; selected: string[]; onSelect: (ids: string[]) => void;
  onEdit: (key: string, update: (c: TvConfig) => TvConfig) => void;
}) {
  const [name, setName] = useState('');
  const [search,setSearch]=useState('');
  const [category,setCategory]=useState('ריאליסטיים');
  const [exporting,setExporting]=useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const chosen = config.elements.filter(e => selected.includes(e.id));
  return <section data-testid="element-library" className="space-y-3 rounded-lg border bg-muted/20 p-3">
    <CombinationLibrary config={config} onEdit={onEdit} onSelect={onSelect}/>
    <h3 className="font-semibold">אלמנטים מוכנים — {READY_ELEMENTS.length} חלקים</h3>
    <p className="text-xs text-muted-foreground">לחיצה מוסיפה עותק עצמאי ללוח. המסגרות שקופות; המילויים נפרדים. אפשר להזיז, לשנות גודל, לשמור בספרייה ולייצא.</p>
    <div className="flex flex-wrap gap-2">
      <input aria-label="חיפוש אלמנטים מוכנים" value={search} onChange={e=>setSearch(e.target.value)} placeholder="חיפוש מסגרת, ספר, רימון…" className="min-w-0 flex-1 rounded border bg-background px-2 py-1 text-sm"/>
      <select aria-label="סוג אלמנטים מוכנים" value={category} onChange={e=>setCategory(e.target.value)} className="rounded border bg-background text-sm">{['ריאליסטיים','איורים אמנותיים','הכול','מסגרות','מילויים','עיטורים','עמודים','שבת וחגים'].map(c=><option key={c}>{c}</option>)}</select>
      <Button size="sm" variant="outline" disabled={exporting} onClick={async()=>{setExporting(true);try{
        const board=normalizeTvConfig({screenLayout:'composition',elements:READY_ELEMENT_SHEET.slice(0,MAX_ELEMENTS),elementLibrary:READY_LIBRARY_SETS,backgroundGradient:'linear-gradient(120deg,#e7e0d1,#fff9ed)'});
        downloadFile(await exportWorkspace(board),'new-shul-ready-elements.zip');
      }catch(e){toast.error(e instanceof Error?e.message:'ייצוא הספרייה נכשל');}finally{setExporting(false);}}}>ייצוא ספריית האלמנטים</Button>
    </div>
    {READY_ELEMENTS.length>MAX_ELEMENTS&&<p className="text-xs text-muted-foreground">הייצוא כולל את כל {READY_ELEMENTS.length} החלקים בספרייה. דף התצוגה מציג עד {MAX_ELEMENTS}; את השאר מוסיפים מתוך הספרייה לאחר פינוי מקום בלוח.</p>}
    <div data-testid="ready-elements" className="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto">
      {READY_ELEMENTS.filter(item=>(category==='הכול'||item.category===category)&&item.name.includes(search.trim())).map(item=><button key={item.id} type="button" aria-label={`הוספת ${item.name} המוכן`} disabled={config.elements.length+item.elements.length>MAX_ELEMENTS} className="rounded border bg-background p-2 text-xs disabled:opacity-40" onClick={()=>{
        const added=importElementSet(exportElementSet(item.elements));
        onEdit(`ready-elements:${elementId()}`,c=>({...c,elements:[...c.elements,...added].slice(0,MAX_ELEMENTS)}));onSelect(added.map(e=>e.id));
      }}><div className="relative mx-auto h-20 w-20 rounded bg-slate-200" style={{containerType:'size'}}><BoardElements elements={[{...item.elements[0],x:5,y:5,width:90,height:90}]}/></div><span>{item.name}</span></button>)}
    </div>
    {!READY_ELEMENTS.some(item=>(category==='הכול'||item.category===category)&&item.name.includes(search.trim()))&&<p className="text-xs">לא נמצאו אלמנטים התואמים לחיפוש.</p>}
    <h3 className="font-semibold">האלמנטים שלי</h3>
    <p className="text-xs text-muted-foreground">שומרים בחירה פעם אחת ומוסיפים עותקים לכל לוח. הספרייה נכללת בשמירה המקומית ובחבילת ה־ZIP.</p>
    <div className="flex flex-wrap gap-2">
      <input aria-label="שם פריט בספרייה" maxLength={80} placeholder="למשל: זוג עמודים מוזהבים" className="min-w-0 flex-1 rounded border bg-background px-2 py-1 text-sm" value={name} onChange={e => setName(e.target.value)} />
      <Button size="sm" disabled={!chosen.length || !name.trim() || config.elementLibrary.length >= MAX_ELEMENT_SETS} onClick={() => {
        const entry = { id: elementId(), name: name.trim(), elements: structuredClone(chosen) };
        onEdit(`element-library:add:${entry.id}`, c => ({ ...c, elementLibrary: [...c.elementLibrary, entry].slice(0, MAX_ELEMENT_SETS) }));
        setName(''); toast.success('הפריט נוסף לטיוטת הספרייה. שמרו את הלוח כדי לשמור גם אותו.');
      }}>שמירת הבחירה בספרייה</Button>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {config.elementLibrary.map(item => <article key={item.id} className="overflow-hidden rounded border bg-background">
        <div className="relative aspect-video bg-slate-900" style={{ containerType: 'size' }}><BoardElements elements={item.elements} /></div>
        <div className="space-y-2 p-2">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" aria-label={`הוספת ${item.name} מהספרייה`} disabled={config.elements.length + item.elements.length > MAX_ELEMENTS} onClick={() => {
              const added = importElementSet(exportElementSet(item.elements)).map(e => ({ ...e, locked: false, hidden: false }));
              onEdit(`element-library:insert:${elementId()}`, c => ({ ...c, elements: [...c.elements, ...added].slice(0, MAX_ELEMENTS) }));
              onSelect(added.map(e => e.id));
            }}>הוספת עותק</Button>
            <button type="button" className="text-xs underline" aria-label={`הסרת ${item.name} מהספרייה`} onClick={() => setRemoving(item.id)}>הסרה</button>
          </div>
          {removing === item.id && <div className="text-xs" role="alert">להסיר את הפריט מהספרייה? עותקים שעל הלוח יישארו.<div className="flex gap-3">
            <button type="button" onClick={() => { onEdit(`element-library:remove:${item.id}`, c => ({ ...c, elementLibrary: c.elementLibrary.filter(x => x.id !== item.id) })); setRemoving(null); }}>אישור הסרה</button>
            <button type="button" onClick={() => setRemoving(null)}>ביטול</button>
          </div></div>}
        </div>
      </article>)}
    </div>
    {!config.elementLibrary.length && <p className="text-xs text-muted-foreground">בחרו אלמנט או קבוצה כדי לשמור את הפריט הראשון.</p>}
  </section>;
}
