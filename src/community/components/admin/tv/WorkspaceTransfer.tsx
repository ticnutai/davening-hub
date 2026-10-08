import { useState } from 'react';
import { getFontEmbedCSS, toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { TvConfig } from '@/tv/config';
import { downloadFile, exportWorkspace, importWorkspace, exportAppearance, applyAppearance } from '@/tv/workspaceTransfer';
import { backgroundElementIds, exportForExistingSite } from '@/tv/legacyExport';
import { EXPORTABLE_FRAMES, exportFramePng } from '@/tv/frameExport';

export function WorkspaceTransfer({ config, onImport }: { config: TvConfig; onImport: (c: TvConfig) => void }) {
  const [busy, setBusy] = useState(false);
  const [incoming, setIncoming] = useState<TvConfig | null>(null);
  const [resolution, setResolution] = useState(1920);
  const [compatibleName, setCompatibleName] = useState('עיצוב מ־New Shul');
  const [frameId, setFrameId] = useState('carved-gold');
  const [includeLayout, setIncludeLayout] = useState(false);
  const exportFrame = EXPORTABLE_FRAMES.find(f => f.id === frameId)!;
  const run = async (job: () => Promise<void>) => { setBusy(true); try { await job(); } catch (e) { toast.error(e instanceof Error ? e.message : 'הפעולה נכשלה'); } finally { setBusy(false); } };
  const picture = async (backgroundOnly = false) => {
    const artIds = backgroundOnly ? backgroundElementIds(config) : null;
    const board = [...document.querySelectorAll<HTMLElement>('.tv-frame .tv-root')].find(e => e.getBoundingClientRect().width > 0);
    if (!board) throw new Error('פתחו את התצוגה המקדימה לפני הייצוא');
    await document.fonts.ready;
    const fontEmbedCSS = await getFontEmbedCSS(board);
    return toPng(board, { pixelRatio: 1, canvasWidth: resolution, canvasHeight: Math.round(resolution * board.offsetHeight / board.offsetWidth), fontEmbedCSS, style: { transform: "none" }, filter: node => {
      if (!(node instanceof HTMLElement)) return true;
      if (node.matches('.tv-bf-handle, [data-edit-ui], .tv-paused')) return false;
      if (artIds && node.dataset.elementId) return artIds.has(node.dataset.elementId);
      return true;
    } });
  };
  return <div data-testid="workspace-transfer" className="space-y-3 rounded-xl border p-4">
    <p className="text-sm">להעברת עיצוב ללוח עם תוכן קיים: ייצאו ערכה בלבד, ייבאו את הקובץ ובחרו „החלת העיצוב בלבד”. נדרשת תמיכה בשכבות במערכת המקבלת; האתר הישן עדיין אינו תומך בחבילה.</p>
    <Button disabled={busy} onClick={() => run(async () => { downloadFile(await exportAppearance(config), 'new-shul-appearance.zip'); })}>ייצוא ערכה בלבד</Button>
    <h3 className="font-semibold">חבילת לוח וייצוא תמונה</h3>
    <p className="text-sm text-muted-foreground">ZIP כולל הגדרות לוח, שכבות ותמונות, גם מהערכות המובנות, לעריכה חוזרת במערכת תואמת. מסכות דורשות פורמט לוח 3 ומעלה; בחירת זמני יום ומקורות פרשה ולימוד נפרדים דורשים פורמט 4. האתר הישן ו־APK קודם אינם מקבלים תמיכה אוטומטית. נתוני תפילות חיים וגופנים אינם נכללים. PNG ו־HTML הם צילום קבוע, ללא שכבות לעריכה.</p>
    <div className="flex flex-wrap items-center gap-2">
      <Button disabled={busy} onClick={() => run(async () => { downloadFile(await exportWorkspace(config), 'new-shul-board.zip'); toast.success('החבילה מוכנה. השלימו את שמירת הקובץ'); })}>ייצוא חבילת ZIP</Button>
      <label className="cursor-pointer rounded border px-3 py-2 text-sm">ייבוא לוח<input type="file" aria-label="ייבוא חבילת לוח" disabled={busy} className="sr-only" accept=".zip,.json" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void run(async () => setIncoming(await importWorkspace(f))); }} /></label>
      <select aria-label="איכות הייצוא" className="rounded border p-2 text-sm" value={resolution} onChange={e => setResolution(Number(e.target.value))}><option value={1920}>Full HD</option><option value={3840}>4K</option></select>
      <Button variant="outline" disabled={busy} onClick={() => run(async () => { const data = await picture(); downloadFile(await (await fetch(data)).blob(), 'new-shul-board.png'); })}>ייצוא PNG</Button>
      <Button variant="outline" disabled={busy} onClick={() => run(async () => { const data = await picture(); downloadFile(new Blob([`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><title>New Shul</title><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0;background:#101827;display:grid;min-height:100vh;place-items:center"><img alt="צילום לוח New Shul — תוכן קבוע" style="width:100%;height:100vh;object-fit:contain" src="${data}"></body></html>`], { type: 'text/html' }), 'new-shul-board.html'); })}>ייצוא HTML קבוע</Button>
    </div>
    <details className="rounded border p-3 space-y-3" data-testid="legacy-compatible-export">
      <summary className="cursor-pointer font-semibold">ייצוא לאתר shul-hub.lovable.app</summary>
      <div className="space-y-2 rounded border p-3" data-testid="sapphire-modular-export">
        <h4 className="font-semibold">ספיר ופלטינה — נבנתה מחלקים עצמאיים</h4>
        <p className="text-sm">רקע אבן כחולה, מסגרת חיצונית שקופה, מסגרות שקופות לתיבות, מילוי תיבות וטקסט חי. אפשר להחליף כל חלק בנפרד. הערכה זמינה גם בגלריית הערכות.</p>
        <div className="flex flex-wrap gap-3">
          {['background','outer-frame','panel-frame'].map(part=><img key={part} src={`/new-shul-assets/sapphire-modular-${part}.png`} alt={part==='background'?'רקע ספיר':part==='outer-frame'?'מסגרת חיצונית נפרדת':'מסגרת תיבות נפרדת'} className="h-24 rounded bg-slate-900" />)}
        </div>
        <div className="flex flex-wrap gap-2">
          {([['background','ספיר: ייצוא רקע'],['outer-frame','ספיר: ייצוא מסגרת חיצונית'],['panel-frame','ספיר: ייצוא מסגרת לתיבות']] as const).map(([part,label])=><Button key={part} disabled={busy} variant="outline" onClick={()=>run(async()=>{
            const response=await fetch(`/new-shul-assets/sapphire-modular-${part}.png`);
            if(!response.ok) throw new Error('קובץ הערכה לא זמין');
            downloadFile(await response.blob(),`sapphire-modular-${part}.png`);
          })}>{label}</Button>)}
        </div>
        <p className="text-sm">למניעת ערבוב עם העיצוב הקודם באתר: התחילו ב„לוח ריק — בוחרים מה יופיע”, בחרו את התכנים הרצויים ואז העלו כל חלק בבקרה המתאימה: רקע, מסגרת הלוח ומסגרת התיבות. פעולה זו משנה גם את סידור המסכים בטיוטה; אין ללחוץ „שמור ושדר” בזמן ניסיון. התוכן והלוגואים נשמרים.</p>
      </div>
      <div className="space-y-2 rounded border p-3" data-testid="emerald-modular-export">
        <h4 className="font-semibold">אמרלד — הרכבה נקייה ב־New Shul</h4>
        <p className="text-sm">בחרו בגלריה „אמרלד · הרכבה נקייה ועצמאית” וייצאו חבילת ZIP לעריכה ב־New Shul. שני העמודים, שלוש המסגרות, המילויים והטקסטים הם שכבות נפרדות. האתר הישן אינו מייבא את ההרכבה הזו; העלאת תמונת רקע אליו אינה תחליף.</p>
        <div className="flex flex-wrap gap-3">
          <img src="/new-shul-assets/emerald-independent-column.png" alt="עמוד אמרלד עצמאי ושקוף" className="h-24 rounded" />
          <img src="/new-shul-assets/emerald-modular-frame.png" alt="מסגרת זהב עצמאית עם מרכז שקוף" className="h-24 rounded bg-emerald-950" />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['column','frame'] as const).map(part=><Button key={part} disabled={busy} variant="outline" onClick={()=>run(async()=>{
            const filename=part==='column'?'emerald-independent-column.png':'emerald-modular-frame.png';
            const response=await fetch(`/new-shul-assets/${filename}`);
            if(!response.ok) throw new Error('קובץ הערכה לא זמין');
            downloadFile(await response.blob(),filename);
          })}>{part==='column'?'אמרלד: ייצוא עמוד':'אמרלד: ייצוא מסגרת'}</Button>)}
        </div>
        <p className="text-sm">הרקע החדש הוא מעבר צבע נקי, ללא ציור של קורות או מסגרות. הורדת חלק בודד אינה כוללת את התוכן או את מיקומי השכבות.</p>
      </div>
      <p className="text-sm">האתר הקיים מקבל צבעים ופריסה בסיסית בקובץ JSON, רקע בהעלאת תמונה ומסגרת לתיבות בהעלאה נפרדת. הורידו את החלקים שאתם צריכים; אין להעלות אליו את חבילת ה־ZIP של New Shul.</p>
      <label className="block text-sm">שם הצבעים באתר היעד<input aria-label="שם הייצוא לאתר הקיים" className="block rounded border p-2" maxLength={40} value={compatibleName} onChange={e=>setCompatibleName(e.target.value)} /></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={includeLayout} onChange={e=>setIncludeLayout(e.target.checked)} />לכלול גם מבנה בסיסי — משנה את הרקע, הפינות והמרווחים באתר. אינו מעביר את מיקומי השכבות. כברירת מחדל הפריסה והרקע של האתר נשמרים.</label>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={()=>run(async()=>{
          downloadFile(new Blob([JSON.stringify(exportForExistingSite(config, compatibleName, includeLayout),null,2)],{type:'application/json'}),'shul-hub-design.json');
        })}>1. ייצוא JSON תואם</Button>
        <Button variant="outline" disabled={busy || config.screenLayout!=='composition'} onClick={()=>run(async()=>{
          downloadFile(await (await fetch(await picture(true))).blob(),'shul-hub-background.png');
        })}>2. ייצוא רקע ללא טקסט</Button>
      </div>
      <div className="space-y-2 rounded border p-3" data-testid="compatible-frame-export">
        <h4 className="font-medium">מסגרת נפרדת לתיבות באתר</h4>
        <p className="text-sm">מסגרת וקטורית עם מרכז שקוף, ללא רקע וללא טקסט. אינה חילוץ של המסגרות מתוך ציורי הערכות.</p>
        <div className="flex flex-wrap items-center gap-3">
          <img src={exportFrame.url} alt={`תצוגת מסגרת: ${exportFrame.name}`} className="size-20 bg-slate-800 p-1" />
          <select aria-label="מסגרת לייצוא לאתר" value={frameId} onChange={e=>setFrameId(e.target.value)} className="max-w-full rounded border p-2">
            {EXPORTABLE_FRAMES.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <Button variant="outline" disabled={busy} onClick={()=>run(async()=>{
            downloadFile(await exportFramePng(frameId), 'shul-hub-frame.png');
          })}>3. ייצוא מסגרת שקופה</Button>
        </div>
        <p className="text-sm">באתר: עיצוב ← מסגרות ← מסגרת לתיבות ← העלאת מסגרת. לתיבה מלבנית או מעוגלת; בצורות חתוכות האתר אינו מציג מסגרת תמונה. נקודת התחלה לכוונון: חיתוך {exportFrame.slice}% ועובי {exportFrame.width}. אפשר לשנות את העובי ולהחליף את המסגרת בלי להחליף את הרקע או הטקסט.</p>
      </div>
      <ol className="list-decimal ps-5 space-y-1 text-sm">
        <li>באתר היעד: גבאי ← תצוגות ← כלים ← ייבוא וייצוא. בחרו את shul-hub-design.json.</li>
        <li>הצבעים נשמרים בקובץ ובמאגר האתר, אך אינם מוחלים אוטומטית. בגרסה שנבדקה אין בורר גלוי לצבעים שיובאו; התאימו צבעים דרך „עיצוב” ← „טקסט” וכלי הרקע.</li>
        <li>בכלי הרקע של האתר העלו את shul-hub-background.png. ייתכן שתצטרכו להתאים את התיבות והמיקומים בכלי האתר.</li>
        <li>בדקו את התצוגה לפני „שמור ושדר למסכים”.</li>
      </ol>
      <p className="text-sm text-amber-800 dark:text-amber-200">התמונה כוללת את הרקע והקישוטים יחד, ללא טקסטים, שעון או זמני תפילה. התוכן החי נשאר של אתר היעד. טקסטים חופשיים, מיקומי השכבות וגופנים אינם עוברים במסלול זה. לעריכה מלאה ב־New Shul שמרו גם ZIP.</p>
    </details>
    {busy && <p role="status" className="text-sm">מכין את הקובץ…</p>}
    {incoming && <div className="space-y-2 rounded border border-amber-400 bg-amber-50 p-3 text-sm" role="alert">
      <Button onClick={() => { onImport(applyAppearance(config, incoming)); setIncoming(null); toast.success('העיצוב נטען לטיוטה; תוכן הלוח וההגדרות נשמרו'); }}>החלת העיצוב בלבד — שמירת תוכן הלוח</Button>
      <p>החבילה כוללת {incoming.elements.length} אלמנטים ו־{incoming.screens?.length ?? 0} מסכים. החלתה תחליף את טיוטת העיצוב הנוכחית. אפשר לבטל בצעד אחורה; השמירה נשארת מפורשת.</p>
      <Button onClick={() => { onImport(incoming); setIncoming(null); toast.success('הלוח נטען כטיוטה'); }}>החלת הלוח המיובא</Button> <Button variant="outline" onClick={() => setIncoming(null)}>ביטול הייבוא</Button>
    </div>}
  </div>;
}
