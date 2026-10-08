import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
// Authentication and live response bodies must never be recorded in traces.
if(process.env.NEW_SHUL_READ_LIVE==='1')test.use({trace:'off',video:'off'});

test('Appearance ZIP imports into a separate existing board without replacing its content',async({page,browser})=>{
  test.setTimeout(150000);
  const errors:string[]=[];
  await page.goto('/new-shul.html');
  await page.getByTestId('builtin-designs').getByRole('button',{name:/^אמרלד · הרכבה נקייה/}).click();
  const geometry=await page.locator('.tv-root [data-element-id]').evaluateAll(nodes=>nodes.map(n=>({id:(n as HTMLElement).dataset.elementId,style:n.getAttribute('style')})));
  await page.getByRole('button',{name:'ייבוא / ייצוא',exact:true}).first().click();
  const downloading=page.waitForEvent('download');
  await page.getByRole('button',{name:'ייצוא ערכה בלבד',exact:true}).click();
  await (await downloading).saveAs('../outputs/emerald-appearance.zip');

  const snapshot:Record<string,unknown[]>={};
  if(process.env.NEW_SHUL_READ_LIVE==='1'){
    const remote=await browser.newContext();
    remote.setDefaultTimeout(20000);
    try{
      // Read-only board data. Block all content/config/storage writes, including accidental ones.
      await remote.route('**/*',async route=>{
        const r=route.request(),u=new URL(r.url());
        if(r.method()==='POST'&&/^\/rest\/v1\/rpc\/(is_admin|is_platform_admin|my_communities)$/.test(u.pathname))return route.continue();
        if((u.pathname.includes('/rest/v1/')||u.pathname.includes('/storage/v1/'))&&!['GET','HEAD','OPTIONS'].includes(r.method()))return route.abort();
        return route.continue();
      });
      const live=await remote.newPage();
      const pending:Promise<void>[]=[];
      live.on('response',response=>{
        const table=new URL(response.url()).pathname.split('/rest/v1/')[1];
        if(table&&['settings','tv_config','minyanim','minyan_categories','shiurim','announcements','minyan_overrides'].includes(table)&&response.ok()){
          pending.push(response.json().then(rows=>{if(Array.isArray(rows)&&rows.length)snapshot[table]=rows;else if(rows&&typeof rows==='object'&&!Array.isArray(rows))snapshot[table]=[rows];}).catch(()=>{}));
        }
      });
      await live.goto('https://shul-hub.lovable.app/auth');
      await live.getByRole('button',{name:'בית הכנסת אושר של יהודי',exact:true}).click();
      await live.locator('input[type=email]').fill(process.env.NEW_SHUL_READ_EMAIL!);
      await live.locator('input[type=password]').fill(process.env.NEW_SHUL_READ_PASSWORD!);
      await live.getByRole('button',{name:'התחבר',exact:true}).click();
      await live.waitForURL('**/community');
      await live.goto('https://shul-hub.lovable.app/community/admin?tab=tv');
      await live.getByRole('tab',{name:'תצוגות',exact:true}).click();
      await expect.poll(()=>snapshot.tv_config?.length??0).toBeGreaterThan(0);
      await expect.poll(()=>snapshot.minyanim?.length??0).toBeGreaterThan(0);
      await expect.poll(()=>snapshot.settings?.length??0).toBeGreaterThan(0);
      await Promise.all(pending);
    }finally{await remote.close();}
  }
  const target=await browser.newContext({viewport:{width:1920,height:1080},locale:'he-IL',timezoneId:'Asia/Jerusalem'});
  try{
    const boardPage=await target.newPage();
    boardPage.on('pageerror',e=>errors.push(e.message));
    await boardPage.goto('/new-shul.html');
    await expect(boardPage.getByTestId('builtin-designs')).toBeVisible();
    const before=await boardPage.evaluate(async(snapshot)=>{
      const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('new-shul.workspace.v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
      const existing=await new Promise<any>((resolve,reject)=>{const r=db.transaction('workspace').objectStore('workspace').get('board');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
      for(const [table,rows] of Object.entries(snapshot))existing[table]=rows.map((r:any)=>({...r,community_id:'new-shul-local'}));
      if(!Object.keys(snapshot).length)existing.tv_config[0].config={texts:{'header.title':'בית הכנסת המקבל · בדיקת התאמה'},hidden:[],backgroundImage:'/new-shul-assets/ruby-palace.png'};
      await new Promise<void>((resolve,reject)=>{const tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').put(existing,'board');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
      db.close();return existing;
    },snapshot);
    await boardPage.reload();
    await boardPage.getByRole('button',{name:'ייבוא / ייצוא',exact:true}).first().click();
    await boardPage.getByLabel('ייבוא חבילת לוח',{exact:true}).setInputFiles('../outputs/emerald-appearance.zip');
    await boardPage.getByRole('button',{name:'החלת העיצוב בלבד — שמירת תוכן הלוח',exact:true}).click();
    const board=boardPage.locator('.tv-root');
    await expect(board).toHaveClass(/is-layout-composition/);
    await expect(board.locator('.tv-panel:visible')).toHaveCount(0);
    await expect(board.locator('[data-art-frame]')).toHaveCount(3);
    expect(await board.locator('[data-element-id]').evaluateAll(nodes=>nodes.map(n=>({id:(n as HTMLElement).dataset.elementId,style:n.getAttribute('style')})))).toEqual(geometry);
    await boardPage.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
    await expect(boardPage.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();
    await boardPage.reload();
    await expect(boardPage.locator('.tv-root [data-art-frame]')).toHaveCount(3);
    const after=await boardPage.evaluate(()=>new Promise<any>((resolve,reject)=>{const r=indexedDB.open('new-shul.workspace.v1',1);r.onsuccess=()=>{const db=r.result;const q=db.transaction('workspace').objectStore('workspace').get('board');q.onsuccess=()=>{db.close();resolve(q.result)};q.onerror=()=>reject(q.error)};}));
    for(const key of ['settings','minyanim','shiurim','announcements','minyan_categories'])expect(after[key],key).toEqual(before[key]);
    for(const key of ['texts','hidden','logos','screens'])if(before.tv_config[0].config[key]!==undefined)expect(after.tv_config[0].config[key],key).toEqual(before.tv_config[0].config[key]);
    await boardPage.goto('/new-shul.html?display=1');
    await expect(boardPage.locator('[data-content-binding=prayers] > div').first()).toBeVisible();
    await boardPage.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
    await boardPage.screenshot({path:`../outputs/emerald-import-${process.env.NEW_SHUL_READ_LIVE==='1'?'live-content':'demo'}.png`});
    console.log(JSON.stringify({source:process.env.NEW_SHUL_READ_LIVE==='1'?'read-only live snapshot':'demo',layers:geometry.length,prayerRows:await boardPage.locator('[data-content-binding=prayers] > div').count(),lessonRows:await boardPage.locator('[data-content-binding=lessons] > div').count(),oldPanels:await boardPage.locator('.tv-panel:visible').count()}));
    const title=await boardPage.locator('[data-content-binding=title]').innerText();
    const prayers=await boardPage.locator('[data-content-binding=prayers]').innerText();
    await boardPage.goto('/new-shul.html');
    const editor=boardPage.getByTestId('elements-editor');
    await editor.getByRole('button',{name:'הסתרת עמוד שמאל עצמאי',exact:true}).click();
    await editor.getByRole('button',{name:'הסתרת מסגרת זמני היום',exact:true}).click();
    await boardPage.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
    await expect(boardPage.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();
    await boardPage.goto('/new-shul.html?display=1');
    await expect(boardPage.locator('[data-element-id=emerald_left]')).toBeHidden();
    await expect(boardPage.locator('[data-element-id=emerald_right]')).toBeVisible();
    await expect(boardPage.locator('[data-art-frame]:visible')).toHaveCount(2);
    await expect(boardPage.locator('[data-content-binding=title]')).toHaveText(title);
    await expect(boardPage.locator('[data-content-binding=prayers]')).toHaveText(prayers,{useInnerText:true});
    await expect(boardPage.locator('[data-content-binding=zmanim] > div')).toHaveCount(8);
    await boardPage.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
    await boardPage.screenshot({path:`../outputs/emerald-import-layer-proof-${process.env.NEW_SHUL_READ_LIVE==='1'?'live-content':'demo'}.png`});
    expect(errors).toEqual([]);
  }finally{await target.close();}
});

test('Sapphire has independent artwork exports and native frames',async({page})=>{
  await page.goto('/new-shul.html');
  await page.getByTestId('builtin-designs').getByRole('button',{name:/^ספיר ופלטינה/}).click();
  const board=page.locator('.tv-root');
  await expect(board).toHaveClass(/has-frame-image/);
  await expect(board).toHaveAttribute('style',/sapphire-modular-background/);
  await expect(board.locator('.tv-bf-picture')).toBeVisible();
  await page.getByRole('button',{name:'ייבוא / ייצוא',exact:true}).first().click();
  await page.getByTestId('legacy-compatible-export').locator('summary').click();
  for(const [part,label] of [['background','ספיר: ייצוא רקע'],['outer-frame','ספיר: ייצוא מסגרת חיצונית'],['panel-frame','ספיר: ייצוא מסגרת לתיבות']]){
    const wait=page.waitForEvent('download');
    await page.getByRole('button',{name:label,exact:true}).click();
    const download=await wait;
    const bytes=await readFile((await download.path())!);
    expect(bytes).toEqual(await readFile(`public/new-shul-assets/sapphire-modular-${part}.png`));
    await download.saveAs(`../outputs/sapphire-modular-${part}.png`);
    if(part!=='background'){
      const alpha=await page.evaluate(async(src)=>{const i=new Image();i.src=src;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d')!;x.drawImage(i,0,0);return x.getImageData(c.width/2,c.height/2,1,1).data[3]},'data:image/png;base64,'+bytes.toString('base64'));
      expect(alpha).toBe(0);
    }
  }
});

test('Emerald independent column and frame exports match their assets',async({page})=>{
  await page.goto('/new-shul.html');
  await page.getByRole('button',{name:'ייבוא / ייצוא',exact:true}).first().click();
  await page.getByTestId('legacy-compatible-export').locator('summary').click();
  for(const [filename,label] of [['emerald-independent-column.png','אמרלד: ייצוא עמוד'],['emerald-modular-frame.png','אמרלד: ייצוא מסגרת']]){
    const wait=page.waitForEvent('download');
    await page.getByRole('button',{name:label,exact:true}).click();
    const download=await wait;
    await download.saveAs(`../outputs/${filename}`);
    expect(await readFile((await download.path())!)).toEqual(await readFile(`public/new-shul-assets/${filename}`));
  }
});

test('Emerald clean composition replaces legacy panels and preserves independent layers through ZIP',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width:1920,height:1080});
  await page.goto('/new-shul.html');
  await page.getByTestId('builtin-designs').getByRole('button',{name:/^אמרלד · הרכבה נקייה/}).click();
  const board=page.locator('.tv-root');
  await expect(board).toHaveClass(/is-layout-composition/);
  await expect(board.locator('.tv-panel:visible')).toHaveCount(0);
  await expect(board.locator('[data-art-frame]')).toHaveCount(3);
  await expect(board).not.toHaveClass(/has-bg-image|has-board-frame|has-frame-image/);
  await page.getByTestId('elements-editor').getByRole('button',{name:'הסתרת עמוד שמאל עצמאי',exact:true}).click();
  await expect(board.locator('[data-element-id=emerald_left]')).toBeHidden();
  await expect(board.locator('[data-element-id=emerald_right]')).toBeVisible();
  await expect(board.locator('[data-art-frame]:visible')).toHaveCount(3);
  await page.getByTestId('elements-editor').getByRole('button',{name:'הצגת עמוד שמאל עצמאי',exact:true}).click();
  for(const column of ['left','right']){
    const c=await board.locator(`[data-element-id=emerald_${column}]`).boundingBox();
    for(const id of ['prayers','zmanim','lessons']){
      const f=await board.locator(`[data-element-id=emerald_${id}_frame]`).boundingBox();
      expect(c!.x+c!.width<=f!.x||f!.x+f!.width<=c!.x).toBe(true);
    }
  }
  await page.getByRole('button',{name:'ייבוא / ייצוא',exact:true}).first().click();
  const download=page.waitForEvent('download');
  await page.getByRole('button',{name:'ייצוא חבילת ZIP',exact:true}).click();
  const file=await download;
  await file.saveAs('../outputs/emerald-clean-editable.zip');
  await page.getByLabel('ייבוא חבילת לוח',{exact:true}).setInputFiles('../outputs/emerald-clean-editable.zip');
  await page.getByRole('button',{name:'החלת הלוח המיובא',exact:true}).click();
  await expect(board.locator('[data-art-frame]')).toHaveCount(3);
  await expect(board.locator('[data-element-id=emerald_left] img')).toHaveAttribute('src',/^data:image/);
  await page.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();
  await page.reload();
  await expect(page.locator('.tv-root [data-art-frame]')).toHaveCount(3);
  expect(errors).toEqual([]);
});
test('Existing-site export produces original-format JSON and a background independent of edited text',async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width:1920,height:1080});
  await page.goto('/new-shul.html');
  await page.getByTestId('builtin-designs').getByRole('button',{name:/^ארמון אמרלד/}).click();
  const open=async()=>{
    await page.getByRole('button',{name:'ייבוא / ייצוא',exact:true}).first().click();
    await page.getByTestId('legacy-compatible-export').locator('summary').click();
  };
  await open();
  await expect(page.getByLabel('מסגרת לייצוא לאתר').locator('option')).toHaveCount(9);
  const frameWait=page.waitForEvent('download');
  await page.getByRole('button',{name:'3. ייצוא מסגרת שקופה',exact:true}).click();
  const frame=await frameWait;
  await frame.saveAs('../outputs/shul-hub-frame.png');
  const frameBytes=await readFile((await frame.path())!);
  expect(frameBytes.readUInt32BE(16)).toBe(1200);
  const alpha=await page.evaluate(async(data)=>{
    const img=new Image(); img.src=data; await img.decode();
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=1200;
    const ctx=canvas.getContext('2d')!; ctx.drawImage(img,0,0);
    return {center:ctx.getImageData(600,600,1,1).data[3],edge:ctx.getImageData(20,600,1,1).data[3]};
  },'data:image/png;base64,'+frameBytes.toString('base64'));
  expect(alpha.center).toBe(0); expect(alpha.edge).toBeGreaterThan(0);
  await page.getByLabel('שם הייצוא לאתר הקיים').fill('New Shul בדיקת תאימות');
  const jsonWait=page.waitForEvent('download');
  await page.getByRole('button',{name:'1. ייצוא JSON תואם',exact:true}).click();
  const json=await jsonWait; await json.saveAs('../outputs/shul-hub-design.json');
  const file=JSON.parse(await readFile((await json.path())!,'utf8'));
  expect(file.format).toBe('design-tokens'); expect(file.themes[0].name).toBe('New Shul בדיקת תאימות');
  expect(file.board).toBeUndefined();
  const bgWait=page.waitForEvent('download');
  await page.getByRole('button',{name:'2. ייצוא רקע ללא טקסט',exact:true}).click();
  const bg=await bgWait; await bg.saveAs('../outputs/shul-hub-background.png');
  const bytes=await readFile((await bg.path())!); expect(bytes.readUInt32BE(16)).toBe(1920);
  await page.getByRole('tab',{name:'עיצוב',exact:true}).click();
  const editor=page.getByTestId('elements-editor');
  await editor.getByLabel('שכבות האלמנטים').getByRole('button',{name:'ברכת קבלת פנים',exact:true}).click();
  await editor.getByLabel('תוכן האלמנט',{exact:true}).fill('TEXT MUST NOT BE BAKED INTO THE BACKGROUND');
  await open();
  const againWait=page.waitForEvent('download');
  await page.getByRole('button',{name:'2. ייצוא רקע ללא טקסט',exact:true}).click();
  expect(await readFile((await (await againWait).path())!)).toEqual(bytes);
});
