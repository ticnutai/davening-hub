import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {readOnlyBoard,localBoard} from './readOnlyBoard';
if(process.env.NEW_SHUL_READ_LIVE==='1')test.use({trace:'off',video:'off'});
const designCapture={style:'.tv-alert-backdrop,.tv-alert-chip{visibility:hidden!important}'};

test('Composition layout tab edits the actual artwork and live content, then persists',async({page})=>{
  await page.setViewportSize({width:1920,height:1080});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/new-shul.html');
  await page.getByTestId('builtin-designs').getByRole('button',{name:/^שיש מואר · המקור בשכבות/}).click();
  await page.getByRole('tab',{name:'פריסה',exact:true}).click();
  await expect(page.getByTestId('composition-layout-notice')).toBeVisible();
  await expect(page.getByTestId('content-layouts')).toBeHidden();
  const editor=page.getByTestId('elements-editor');
  await editor.getByRole('button',{name:'מסגרת תפילות מהמקור',exact:true}).click();
  await editor.getByLabel('מיקום אופקי',{exact:true}).fill('12');
  await editor.getByLabel('רוחב האלמנט',{exact:true}).fill('22');
  const frame=page.locator('.tv-root [data-element-id=original_ivory_left_frame]');
  await expect(frame).toHaveCSS('left',/px$/);
  expect(await frame.evaluate(e=>(e as HTMLElement).style.left)).toBe('12%');
  expect(await frame.evaluate(e=>(e as HTMLElement).style.width)).toBe('22%');
  await editor.getByRole('button',{name:'תפילות היום',exact:true}).click();
  await editor.getByLabel('שורות בכל עמוד באלמנט').fill('1');
  await expect(page.locator('.tv-root [data-content-binding=prayers] > div')).toHaveCount(1);
  await page.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled({timeout:20000});
  await page.reload();
  await page.getByRole('tab',{name:'פריסה',exact:true}).click();
  await expect(page.getByTestId('composition-layout-notice')).toBeVisible();
  await editor.getByRole('button',{name:'מסגרת תפילות מהמקור',exact:true}).click();
  await expect(editor.getByLabel('מיקום אופקי',{exact:true})).toHaveValue('12');
  await expect(editor.getByLabel('רוחב האלמנט',{exact:true})).toHaveValue('22');
  await editor.getByRole('button',{name:'תפילות היום',exact:true}).click();
  await expect(editor.getByLabel('שורות בכל עמוד באלמנט')).toHaveValue('1');
  await page.goto('/new-shul.html?display=1');
  await expect(page.locator('[data-content-binding=prayers] > div')).toHaveCount(1);
  expect(await page.locator('[data-element-id=original_ivory_left_frame]').evaluate(e=>(e as HTMLElement).style.left)).toBe('12%');
  expect(errors).toEqual([]);
});

for(const style of [{id:'luminous-ivory',key:'ivory',name:'שיש מואר'},{id:'royal-sapphire',key:'sapphire',name:'ספיר מלכותי'}]){
  test(`Original layers ${style.id} keep source appearance and survive export import`,async({page,browser})=>{
    test.setTimeout(120000);
    await page.setViewportSize({width:1920,height:1080});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/new-shul.html');
    await page.getByTestId('builtin-designs').getByRole('button',{name:new RegExp(`^${style.name} · המקור בשכבות`)}).click();
    await page.getByRole('button',{name:'ייבוא / ייצוא',exact:true}).first().click();
    const downloading=page.waitForEvent('download');
    await page.getByRole('button',{name:'ייצוא ערכה בלבד',exact:true}).click();
    await (await downloading).saveAs(`../outputs/${style.id}-editable-original.zip`);
    await page.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
    await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();
    await page.goto('/new-shul.html?display=1');
    await expect(page.locator('.tv-root')).toHaveClass(/is-layout-composition/);
    await expect(page.locator('svg[data-source-mask]')).toHaveCount(style.key==='ivory'?19:20);
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('svg[data-source-mask] image')].map(async e=>{const i=new Image();i.src=e.getAttribute('href')!;await i.decode();}));});
    await page.screenshot({path:`../outputs/${style.id}-layered-board.png`,...designCapture});
    // Render just the art at its true source registration, then compare pixels.
    await page.setViewportSize({width:1672,height:941});
    const hideText=await page.addStyleTag({content:'[data-element-id]:not(:has(svg[data-source-mask])){visibility:hidden!important}'});
    const art=await page.locator('.tv-root').screenshot({path:`../outputs/${style.id}-layered-art.png`,...designCapture});
    await hideText.evaluate(e=>e.remove());
    const source=await (await page.request.get(`/new-shul-assets/${style.id}.png`)).body();
    const metrics=await page.evaluate(async({a,b})=>{
      const images=await Promise.all([a,b].map(async src=>{const i=new Image();i.src='data:image/png;base64,'+src;await i.decode();return i;}));
      const w=1672,h=941;
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d')!;
      const pixels=images.map(i=>{ctx.clearRect(0,0,w,h);ctx.drawImage(i,0,0,w,h);return ctx.getImageData(0,0,w,h).data;});
      let sum=0,changed=0;for(let i=0;i<pixels[0].length;i+=4){let d=0;for(let c=0;c<3;c++){const v=Math.abs(pixels[0][i+c]-pixels[1][i+c]);sum+=v;d=Math.max(d,v);}if(d>12)changed++;}
      return {meanChannelError:sum/(w*h*3),changedPixelPercent:changed/(w*h)*100};
    },{a:source.toString('base64'),b:art.toString('base64')});
    await writeFile(`../outputs/${style.id}-fidelity.json`,JSON.stringify(metrics,null,2));
    console.log(style.id,metrics);
    expect(metrics.meanChannelError).toBeLessThan(.1);
    expect(metrics.changedPixelPercent).toBeLessThan(.01);

    const snapshot=await readOnlyBoard(browser);
    const target=await browser.newContext({viewport:{width:1920,height:1080},locale:'he-IL',timezoneId:'Asia/Jerusalem'});
    try{
      const imported=await target.newPage();imported.on('pageerror',e=>errors.push(e.message));
      await imported.goto('/new-shul.html');
      await expect(imported.getByTestId('builtin-designs')).toBeVisible();
      const before=await localBoard(imported,snapshot);
      await imported.reload();
      await imported.getByRole('button',{name:'ייבוא / ייצוא',exact:true}).first().click();
      await imported.getByLabel('ייבוא חבילת לוח',{exact:true}).setInputFiles(`../outputs/${style.id}-editable-original.zip`);
      await imported.getByRole('button',{name:'החלת העיצוב בלבד — שמירת תוכן הלוח',exact:true}).click();
      await expect(imported.locator('.tv-root svg[data-source-mask]')).toHaveCount(style.key==='ivory'?19:20);
      await expect(imported.locator('.tv-panel:visible')).toHaveCount(0);
      await imported.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
      await expect(imported.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled({timeout:20000});
      await imported.reload();
      await expect(imported.locator('.tv-root svg[data-source-mask] image').first()).toHaveAttribute('href',/^data:image/);
      const after=await localBoard(imported);
      for(const key of ['settings','minyanim','shiurim','announcements','minyan_categories'])expect(after[key],key).toEqual(before[key]);
      for(const key of ['texts','hidden','logos','screens'])if(before.tv_config[0].config[key]!==undefined)expect(after.tv_config[0].config[key],key).toEqual(before.tv_config[0].config[key]);
      await imported.goto('/new-shul.html?display=1');
      await expect(imported.locator(`[data-element-id=original_${style.key}_column_right]`)).toBeVisible();
      await expect(imported.locator('svg[data-source-mask]')).toHaveCount(style.key==='ivory'?19:20);
      if(process.env.NEW_SHUL_READ_LIVE==='1'){
        const lessons=imported.locator('[data-content-binding=lessons]');
        for(const label of ['עמוד היומי','דף יומי']){
          await expect(lessons).toContainText(label,{timeout:22000});
          const fits=await lessons.evaluate(e=>{
            const parent=e.getBoundingClientRect();
            return [...e.children].every(row=>{const r=row.getBoundingClientRect();return r.height<=parent.height/3+1&&[...row.children].every(child=>{const c=child.getBoundingClientRect();return c.height<=r.height+1&&c.left>=r.left-1&&c.right<=r.right+1;});});
          });
          expect(fits,`lesson page ${label} fits original panel`).toBe(true);
        }
      }
      await imported.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('svg[data-source-mask] image')].map(async e=>{const i=new Image();i.src=e.getAttribute('href')!;await i.decode();}));});
      await imported.screenshot({path:`../outputs/${style.id}-imported-board${process.env.NEW_SHUL_READ_LIVE==='1'?'':'-local'}.png`,...designCapture});
      await imported.goto('/new-shul.html');
      const editor=imported.getByTestId('elements-editor');
      await editor.getByRole('button',{name:'הסתרת מסגרת תפילות מהמקור',exact:true}).click();
      await editor.getByRole('button',{name:'הסתרת עמוד שמאל מהמקור',exact:true}).click();
      await expect(imported.locator(`.tv-root [data-element-id=original_${style.key}_left_frame]`)).toBeHidden();
      await expect(imported.locator(`.tv-root [data-element-id=original_${style.key}_left_fill]`)).toBeVisible();
      await expect(imported.locator('.tv-root [data-content-binding=prayers]')).toBeVisible();
      await imported.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
      await expect(imported.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled({timeout:20000});
      await imported.goto('/new-shul.html?display=1');
      await expect(imported.locator(`[data-element-id=original_${style.key}_column_right]`)).toBeVisible();
      await expect(imported.locator('[data-content-binding=prayers]')).toBeVisible();
      await expect(imported.locator('[data-composition-background]')).toHaveAttribute('src',/^data:image/);
      await expect.poll(()=>imported.locator('[data-composition-background]').evaluate((e:HTMLImageElement)=>e.naturalWidth)).toBeGreaterThan(0);
      await expect(imported.locator(`[data-element-id=original_${style.key}_left_frame]`)).toBeHidden();
      await expect(imported.locator(`[data-element-id=original_${style.key}_column_left]`)).toBeHidden();
      await imported.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('svg[data-source-mask] image')].map(async e=>{const i=new Image();i.src=e.getAttribute('href')!;await i.decode();}));});
      await imported.screenshot({path:`../outputs/${style.id}-separate-layers-proof${process.env.NEW_SHUL_READ_LIVE==='1'?'':'-local'}.png`,...designCapture});
    }finally{await target.close();}
    expect(errors).toEqual([]);
  });
}
