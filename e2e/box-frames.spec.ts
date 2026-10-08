import {test,expect} from '@playwright/test';
import {localBoard} from './readOnlyBoard';
test('all four live boxes choose different frames and retain their content after save and reload',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});await page.goto('/new-shul.html');
 await expect(page.getByTestId('builtin-designs')).toBeVisible();
 const board=await localBoard(page);board.tv_config[0].config.alerts={...board.tv_config[0].config.alerts,enabled:false};
 await localBoard(page,{tv_config:board.tv_config});await page.reload();
 await page.getByTestId('builtin-designs').getByRole('button',{name:/^שבת — סלון פנינה ·/}).click();
 await page.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
 await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();
 const before=(await localBoard(page)).tv_config[0].config.elements;
 await page.getByRole('tab',{name:'פריסה',exact:true}).click();
 const editor=page.getByTestId('elements-editor'),picker=page.getByTestId('box-frame-picker');
 await expect(picker.getByRole('button')).toHaveCount(9);
 for(const [key,label,style] of [['prayers','זמני תפילות','קשת עץ מגולף'],['zmanim','זמני היום','קשת אבן וזהב'],['notices','הודעות','מסגרת כסף נקייה'],['lessons','שיעורי תורה','אר דקו זהב']]){
  await editor.getByRole('button',{name:`תוכן ${label}`,exact:true}).click();
  await expect(picker.getByLabel('התיבה להחלפת מסגרת')).toHaveValue(`salonivory_${key}_frame`);
  await picker.getByRole('button',{name:`החלפת המסגרת ל${style}`,exact:true}).click();
 }
 await page.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
 await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();await page.reload();
 const after=(await localBoard(page)).tv_config[0].config.elements;
 expect(after).toHaveLength(before.length);
 for(const e of before){const a=after.find(n=>n.id===e.id);for(const k of ['x','y','width','height','binding','text'])expect(a[k]).toEqual(e[k]);if(!/_(frame|fill|heading|content)$/.test(e.id))expect(a).toEqual(e);}
 expect(after.find(e=>e.id==='salonivory_lessons_heading').color).toBe('#fff1cb');
 expect(after.find(e=>e.id==='salonivory_prayers_frame').image).toContain('woodarch-frame.png');
 expect(after.find(e=>e.id==='salonivory_notices_frame').color).toBe('#8593a1');
 await page.goto('/new-shul.html?display=1');
 await expect(page.locator('.tv-root [data-content-binding=prayers]')).toContainText('שחרית');
 await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.tv-root img')].map(e=>(e as HTMLImageElement).decode()));});
 await page.screenshot({path:'../outputs/box-frames-mixed.png'});
});
