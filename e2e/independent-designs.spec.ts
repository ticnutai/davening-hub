import {test,expect} from '@playwright/test';
import {localBoard} from './readOnlyBoard';
import {writeFile} from 'node:fs/promises';

test('complete boxes regroup and exchange positions with frames and live content',async({page})=>{
  await page.setViewportSize({width:1920,height:1080});
  await page.goto('/new-shul.html');
  await page.getByTestId('builtin-designs').getByRole('button',{name:/^קשתות ירושלים — ארבע קשתות ·/}).click();
  await page.getByRole('tab',{name:'פריסה',exact:true}).click();
  const editor=page.getByTestId('elements-editor'),canvas=editor.getByTestId('elements-canvas');
  const positions=()=>canvas.locator('[data-element-id]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.getAttribute('data-element-id'),{x:parseFloat((n as HTMLElement).style.left),y:parseFloat((n as HTMLElement).style.top)}])));
  const before=await positions();
  for(const [key,label,x] of [['prayers','זמני תפילות',67],['notices','הודעות',36],['lessons','שיעורי תורה',36]] as const){
    await editor.getByRole('button',{name:`מילוי ${label}`,exact:true}).click();
    for(const prefix of ['מסגרת','כותרת','תוכן'])await editor.getByRole('button',{name:`${prefix} ${label}`,exact:true}).click({modifiers:['Shift']});
    await editor.getByRole('button',{name:'קיבוץ',exact:true}).click();
    await editor.getByLabel('מיקום אופקי',{exact:true}).fill(String(x));
    const after=await positions();
    for(const part of ['fill','frame','heading','content']){
      const id=`jerusalemfour_${key}_${part}`;
      expect(after[id].x-before[id].x).toBeCloseTo(key==='prayers'?31:-31);
      expect(after[id].y).toBe(before[id].y);
    }
  }
  const el=canvas.locator('[data-element-id=jerusalemfour_lessons_content]');
  await el.scrollIntoViewIfNeeded();const box=(await el.boundingBox())!;
  const prior=await positions();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+10,box.y+box.height/2,{steps:4});await page.mouse.up();
  const dragged=await positions(),delta=dragged.jerusalemfour_lessons_content.x-prior.jerusalemfour_lessons_content.x;
  expect(delta).toBeGreaterThan(0);
  for(const part of ['fill','frame','heading','content'])expect(dragged[`jerusalemfour_lessons_${part}`].x-prior[`jerusalemfour_lessons_${part}`].x).toBeCloseTo(delta);
  await canvas.getByTestId('board-elements').press('ArrowLeft');
  const nudged=await positions();
  for(const part of ['fill','frame','heading','content'])expect(nudged[`jerusalemfour_lessons_${part}`].x).toBeCloseTo(dragged[`jerusalemfour_lessons_${part}`].x-.25);
  await page.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();await page.reload();
  const config=(await localBoard(page)).tv_config[0].config;
  for(const key of ['prayers','notices','lessons']){
    const parts=config.elements.filter((e:any)=>e.id.startsWith(`jerusalemfour_${key}_`));
    expect(parts).toHaveLength(4);expect(new Set(parts.map((e:any)=>e.group)).size).toBe(1);expect(parts[0].group).toBeTruthy();
    for(const part of parts)expect(part.x).toBeCloseTo(nudged[part.id].x);
  }
});

test('Jerusalem prayer content supports drag arrows resize and persists without moving frame',async({page})=>{
  await page.setViewportSize({width:1920,height:1080});
  await page.goto('/new-shul.html');
  await expect(page.getByTestId('builtin-designs')).toBeVisible();
  const board=await localBoard(page);
  board.tv_config[0].config.alerts={...board.tv_config[0].config.alerts,enabled:false};
  await localBoard(page,{tv_config:board.tv_config});await page.reload();
  await page.getByTestId('builtin-designs').getByRole('button',{name:/^קשתות ירושלים · חלקים עצמאיים/}).click();
  await page.getByRole('tab',{name:'פריסה',exact:true}).click();
  const editor=page.getByTestId('elements-editor');
  const canvas=editor.getByTestId('elements-canvas');
  const el=canvas.locator('[data-element-id=jerusalemarches_prayers_content]');
  const frame=canvas.locator('[data-element-id=jerusalemarches_prayers_frame]');
  const originalFrame=await frame.getAttribute('style');
  const left=()=>el.evaluate(e=>parseFloat((e as HTMLElement).style.left));
  const x=await left();
  await el.scrollIntoViewIfNeeded();const box=(await el.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2,{steps:5});await page.mouse.up();
  expect(await left()).toBeGreaterThan(x);
  const moved=await left();
  await canvas.getByTestId('board-elements').press('ArrowRight');expect(await left()).toBeCloseTo(moved+.25);
  await canvas.getByTestId('board-elements').press('Shift+ArrowLeft');expect(await left()).toBeCloseTo(moved+.25-2.5);
  await editor.getByLabel('רוחב האלמנט',{exact:true}).fill('18');
  await editor.getByLabel('מיקום אופקי',{exact:true}).fill('41');
  expect(await frame.getAttribute('style')).toBe(originalFrame);
  await page.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();
  await page.reload();
  const saved=(await localBoard(page)).tv_config[0].config.elements.find((e:any)=>e.id==='jerusalemarches_prayers_content');
  expect(saved.x).toBe(41);expect(saved.width).toBe(18);
  await page.goto('/new-shul.html?display=1');
  const content=page.locator('[data-content-binding=prayers]');await expect(content).toContainText('שחרית');
  const bounds=(await content.boundingBox())!;
  const frameBounds=(await page.locator('[data-element-id=jerusalemarches_prayers_frame]').boundingBox())!;
  expect(bounds.x-frameBounds.x).toBeGreaterThan(80);
  expect(frameBounds.x+frameBounds.width-bounds.x-bounds.width).toBeGreaterThan(80);
  await page.screenshot({path:'../outputs/jerusalem-prayers-narrowed.png'});
});

test('quick add live times and parasha to original masked theme persists independent parts',async({page})=>{
  await page.setViewportSize({width:1920,height:1080});
  await page.goto('/new-shul.html');
  await page.getByTestId('builtin-designs').getByRole('button',{name:/^שיש מואר · המקור בשכבות/}).click();
  await page.getByRole('tab',{name:'פריסה',exact:true}).click();
  const editor=page.getByTestId('elements-editor');
  const before=await page.locator('.tv-root [data-element-id]').count();
  await editor.getByRole('button',{name:'הוספת תיבת זמני היום',exact:true}).click();
  await expect(page.locator('.tv-root [data-element-id]')).toHaveCount(before+4);
  await expect(page.locator('.tv-root [data-content-binding=zmanim] > div')).toHaveCount(13);
  await editor.getByRole('button',{name:'הוספת פרשת השבוע',exact:true}).click();
  await expect(page.locator('.tv-root [data-content-binding=parasha]')).not.toBeEmpty();
  for(const [button,binding] of [['הוספת תיבת תפילות','prayers'],['הוספת תיבת שיעורים','lessons'],['הוספת תיבת הודעות','announcements']]){
    const count=await page.locator(`.tv-root [data-content-binding=${binding}]`).count();
    const layers=await page.locator('.tv-root [data-element-id]').count();
    await editor.getByRole('button',{name:button,exact:true}).click();
    await expect(page.locator('.tv-root [data-element-id]')).toHaveCount(layers+4);
    await expect(page.locator(`.tv-root [data-content-binding=${binding}]`)).toHaveCount(count+1);
  }
  await page.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();
  await page.reload();
  await expect(page.locator('.tv-root [data-content-binding=zmanim] > div')).toHaveCount(13);
  await expect(page.locator('.tv-root svg[data-source-mask]')).toHaveCount(19);
  await expect(page.locator('.tv-root [data-content-binding=announcements]')).toHaveCount(1);
  await expect(page.locator('.tv-root [data-content-binding=parasha]')).not.toBeEmpty();
});

const newCollection=[['dailyjerusalem','לוח היום — בוקר ירושלמי'],['dailystudy','לוח היום — בית מדרש אגוז'],['salonivory','שבת — סלון פנינה'],['salonwalnut','שבת — סלון אגוז'],['shavuotcomplete','שבועות — פריחה וביכורים'],['pesachcomplete','פסח — ליל הסדר'],['hanukkahgold','חנוכה — זהב ופיסטוק'],['shabbatrose','שבת — חלות וכסף'],['shabbatcomplete','שבת — שולחן כסף'],['challotcomplete','חלות — ברכת הבית'],['hanukkahcomplete','חנוכה — אור ומתיקות'],['sukkotcomplete','סוכות — ארבעת המינים'],['roshcomplete','ראש השנה — שנה מתוקה'],['torahcomplete','תורה — כתר של כסף'],['walnutsilver','שבת כסף ואגוז'],['pearlgold','שיש פנינה וזהב'],['azuregallery','תכלת גאומטרי'],['scrollstudy','קלף וספר'],['garnetcourt','רימוני ארגמן'],['bronzegates','שערי נחושת'],['shabbatpeace','שבת של שלום'],['chanukahlight','אור החנוכה'],['pesachfreedom','פסח של חירות'],['shofarvoice','קול שופר'],['shavuottorah','מתן תורה'],['purimjoy','שמחת פורים']];
for(const [id,name] of [...newCollection,['ivorylight','אבן ואור'],['sukkotroyal','סוכות מלכותי'],['sukkahwarm','סוכה ירושלמית'],['stonecenter','קשתות ירושלים — קטנות במרכז'],['woodcenter','קשתות עץ — קטנות במרכז'],['jerusalemfour','קשתות ירושלים — ארבע קשתות'],['vitrail','ויטראז׳ ושושנה'],['artdeco','אר־דקו מניפת זהב'],['ancientwood','היכל עץ עתיק'],['jerusalemarches','קשתות ירושלים'],['midnightwide','כחול לילה מודרני'],['copperscroll','קלף ונחושת'],['forestgold','יער וזהב'],['pearlrose','פנינה ורוזה'],['copperhall','היכל נחושת'],['platinumnight','לילה ופלטינה'],['lightminimal','אור מינימלי']]){
  test(`${id} editable parts export import preserve content and remain independent`,async({page,browser})=>{
    test.setTimeout(60000);
    await page.goto('/new-shul.html');
    await page.getByTestId('builtin-designs').getByRole('button',{name:new RegExp(`^${name} · חלקים עצמאיים`)}).click();
    await page.getByRole('button',{name:'ייבוא / ייצוא',exact:true}).first().click();
    const download=page.waitForEvent('download');
    await page.getByRole('button',{name:'ייצוא ערכה בלבד',exact:true}).click();
    await (await download).saveAs(`../outputs/${id}-editable.zip`);
    const context=await browser.newContext({viewport:{width:1920,height:1080},locale:'he-IL',timezoneId:'Asia/Jerusalem'});
    try{
      const target=await context.newPage();const errors:string[]=[];target.on('pageerror',e=>errors.push(e.message));
      await target.goto('/new-shul.html');
      await expect(target.getByTestId('builtin-designs')).toBeVisible();
      const before=await localBoard(target);
      const festival=['ivorylight','sukkotroyal','sukkahwarm'].includes(id);
      const collection=newCollection.some(([key])=>key===id);
      if(festival||collection){
        before.shiurim=[{id:'festival-demo-lesson',community_id:'new-shul-local',title:'דף יומי — דוגמה',teacher:'הרב לדוגמה',time_text:'18:30',schedule_type:'daily',days:[0,1,2,3,4,5,6],active:true,sort_order:1}];
      }
      // Appearance tests must not change with the real clock or replace prayers
      // with a valid deadline countdown. Alerts have their own timed E2E suite.
      before.tv_config[0].config.alerts={...before.tv_config[0].config.alerts,enabled:false};
      await localBoard(target,{tv_config:before.tv_config,...(festival||collection?{shiurim:before.shiurim}:{})});
      await target.reload();
      await target.getByRole('button',{name:'ייבוא / ייצוא',exact:true}).first().click();
      await target.getByLabel('ייבוא חבילת לוח',{exact:true}).setInputFiles(`../outputs/${id}-editable.zip`);
      await target.getByRole('button',{name:'החלת העיצוב בלבד — שמירת תוכן הלוח',exact:true}).click();
      await target.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
      await expect(target.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled({timeout:20000});
      await target.reload();
      const after=await localBoard(target);
      for(const table of ['settings','minyanim','shiurim','announcements'])expect(after[table]).toEqual(before[table]);
      const config=after.tv_config[0].config;
      await writeFile(`../outputs/${id}-example-config.json`,JSON.stringify({format:'new-shul-board',version:4,config},null,2));
      expect(config.elements.some((e:any)=>e.sourceMask)).toBe(false);
      await target.goto('/new-shul.html?display=1');
      const root=target.locator('.tv-root');
      await expect(root).toHaveClass(/is-layout-composition/);
      await expect(root.locator('.tv-panel')).toHaveCount(0);
      await expect(root.locator('[data-content-binding=prayers]')).toContainText('שחרית');
      await expect(root.locator('[data-content-binding=announcements]')).toContainText('ברוכים הבאים');
      await expect(root.locator('[data-content-binding=zmanim] > div')).toHaveCount(13);
      for(const label of ['סוף זמן ק״ש — מג״א 72 דק׳','סוף זמן ק״ש — הגר״א','סוף זמן תפילה — מג״א 72 דק׳','סוף זמן תפילה — הגר״א'])await expect(root.locator('[data-content-binding=zmanim]')).toContainText(label);
      await expect(root.locator('[data-content-binding=title]')).not.toBeEmpty();
      await expect(root.locator('[data-content-binding=parasha]')).not.toBeEmpty();
      if(collection)await expect(root.locator('[data-content-binding=lessons]')).toContainText('דף יומי — דוגמה');
      if(festival){
        await expect(root.locator('[data-content-binding=lessons]')).toContainText('דף יומי — דוגמה');
        await target.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.tv-root img')].map(img=>(img as HTMLImageElement).decode()));});
        // A missing atlas or a flattened opaque centre must fail, not merely look loaded.
        const alpha=await root.locator(`[data-element-id=${id}_prayers_frame] img`).evaluate(async image=>{
          const img=image as HTMLImageElement,c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
          const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);
          return ctx.getImageData(Math.floor(c.width*.25),Math.floor(c.height*.3),1,1).data[3];
        });
        expect(alpha).toBe(0);
      }
      await target.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('[data-art-frame]')].map(async e=>{const src=getComputedStyle(e).borderImageSource.match(/url\(["']?(.*?)["']?\)/)?.[1];if(src){const image=new Image();image.src=src;await image.decode();}}));});
      await target.screenshot({path:`../outputs/${id}-board.png`,style:'.tv-alert-backdrop,.tv-alert-chip{visibility:hidden!important}'});
      await target.goto('/new-shul.html');
      await target.getByRole('tab',{name:'פריסה',exact:true}).click();
      const editor=target.getByTestId('elements-editor');
      await editor.getByRole('button',{name:'תוכן זמני היום',exact:true}).click();
      await editor.getByTestId('element-zmanim-picker').getByRole('checkbox',{name:'סוף זמן ק״ש — מג״א 72 דק׳',exact:true}).uncheck();
      await expect(target.locator('.tv-root [data-content-binding=zmanim] > div')).toHaveCount(12);
      await target.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
      await expect(target.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();
      await target.reload();
      await expect(target.locator('.tv-root [data-content-binding=zmanim] > div')).toHaveCount(12);
      await target.getByRole('tab',{name:'פריסה',exact:true}).click();
      await editor.getByRole('button',{name:'תוכן זמני היום',exact:true}).click();
      await editor.getByRole('button',{name:'הצגת כל זמני היום יחד',exact:true}).click();
      await expect(target.locator('.tv-root [data-content-binding=zmanim] > div')).toHaveCount(13);
      await editor.getByRole('button',{name:'הסתרת מסגרת זמני תפילות',exact:true}).click();
      await expect(target.locator(`.tv-root [data-element-id=${id}_prayers_frame]`)).toBeHidden();
      await expect(target.locator(`.tv-root [data-element-id=${id}_prayers_fill]`)).toBeVisible();
      await expect(target.locator('.tv-root [data-content-binding=prayers]')).toBeVisible();
      await editor.getByRole('button',{name:'תוכן זמני תפילות',exact:true}).click();
      await editor.getByLabel('מיקום אופקי',{exact:true}).fill('52');
      expect(await target.locator(`.tv-root [data-element-id=${id}_prayers_content]`).evaluate(e=>(e as HTMLElement).style.left)).toBe('52%');
      expect(errors).toEqual([]);
      console.log(id,'layers',config.elements.length);
    }finally{await context.close();}
  });
}
