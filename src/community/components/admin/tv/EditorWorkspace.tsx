import type { ReactNode } from 'react';
import './editorWorkspace.css';

export const WORKSPACES = [
  ['classic','העורך הקיים'], ['side','כרטיס בצד'], ['bottom','מגירה תחתונה'],
  ['contextual','בחירה על הלוח'], ['wizard','אשף בשלבים'],
  ['layers','חלקים ומאפיינים'], ['ribbon','סרגל קומפקטי'],
] as const;
export type WorkspaceMode = typeof WORKSPACES[number][0];
export const isWorkspaceMode = (value: unknown): value is WorkspaceMode => WORKSPACES.some(([key])=>key===value);
const SECTIONS = [['design','ערכה ועיצוב'],['layout','חלקים ופריסה'],['content','תוכן'],['occasions','שבת וחגים'],['tools','ייבוא וגרסאות']] as const;

/** Presentation only. All children and callbacks belong to the canonical editor. */
export function EditorWorkspace({mode,preview,controls,inspector,tab,onTab,layers,onSelect,selected}:{
  mode: WorkspaceMode; preview: ReactNode; controls: ReactNode; inspector: ReactNode;
  tab: string; onTab:(tab:string)=>void; layers:{id:string;name:string}[];
  onSelect:(id:string)=>void; selected:string|null;
}){
 const current=SECTIONS.findIndex(([id])=>id===tab);
 return <div className={`editor-workspace ew-${mode}`} data-testid="editor-workspace" data-mode={mode}>
   <div className="ew-navigation" aria-label="שלבי העריכה">
     {SECTIONS.map(([id,label],i)=><button type="button" key={id} aria-pressed={tab===id} onClick={()=>onTab(id)}>{mode==='wizard'?`${i+1}. `:''}{label}</button>)}
     {mode==='wizard'&&<><button type="button" disabled={current<=0} onClick={()=>onTab(SECTIONS[current-1][0])}>שלב קודם</button><button type="button" disabled={current>=SECTIONS.length-1} onClick={()=>onTab(SECTIONS[current+1][0])}>שלב הבא</button></>}
   </div>
   <div className="ew-preview">{preview}</div>
   <section className="ew-controls" aria-label="כלי העריכה">
     <p className="text-xs text-muted-foreground mb-3">{mode==='contextual'?'לחצו על חלק בלוח כדי לערוך אותו. ':''}כל הפריסות עורכות את אותה טיוטה. רק פעולת השמירה מעדכנת את הלוח השמור.</p>
     {inspector}{controls}
   </section>
   {mode==='layers'&&<aside className="ew-layers" aria-label="חלקי הלוח"><h3 className="font-semibold mb-2">חלקי הלוח</h3>{layers.map(layer=><button type="button" key={layer.id} aria-pressed={selected===layer.id} onClick={()=>onSelect(layer.id)}>{layer.name}</button>)}</aside>}
 </div>;
}
