import { test, expect, _android } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import JSZip from 'jszip';

// Opt-in only; never attach to the user's phone or an unrelated emulator.
const serial = process.env.NEW_SHUL_QA_SERIAL;
test('New Shul APK: edit, persist, display and native ZIP export/import', async () => {
  test.skip(serial !== 'emulator-5562', 'Requires the dedicated headless NewShul_QA emulator');
  test.setTimeout(180000);
  const message = 'נבדק באפליקציית Android ' + Date.now();
  const adb = (...args: string[]) => execFileSync('adb', ['-s',serial!,...args], {encoding:'utf8',timeout:20000});
  const tree = () => { try { adb('shell','timeout','8','uiautomator','dump','/sdcard/new-shul-qa.xml'); return adb('shell','cat','/sdcard/new-shul-qa.xml'); } catch { return ''; } };
  const tap = (label: string) => {
    const xml = tree();
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = xml.match(new RegExp(`text="${escaped}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, 'i'));
    if (!match) throw new Error(`Native control missing: ${label}\n${xml.slice(-4000)}`);
    adb('shell','input','tap',String((+match[1]+ +match[3])/2),String((+match[2]+ +match[4])/2));
  };
  const devices = await _android.devices({omitDriverInstall:true});
  const device = devices.find(d=>d.serial()===serial)!;
  expect(device).toBeTruthy();
  try {
    const page = await (await device.webView({pkg:'com.ticnutai.newshul'})).page();
    const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('https://new-shul.local/new-shul.html');
    await page.getByRole('tab', {name:'עיצוב',exact:true}).click();
    await page.getByTestId('builtin-designs').getByRole('button',{name:/^ארמון אמרלד · אוסף חדש/}).click();
    const editor = page.getByTestId('elements-editor');
    await editor.getByLabel('שכבות האלמנטים').getByRole('button',{name:'ברכת קבלת פנים',exact:true}).click();
    await editor.getByLabel('תוכן האלמנט',{exact:true}).fill(message);
    await page.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
    await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();
    tap('הלוח השמור');
    await expect(page.locator('.tv-root').getByText(message,{exact:true})).toBeVisible();
    await page.reload();
    await expect(page.locator('.tv-root').getByText(message,{exact:true})).toBeVisible();
    await page.screenshot({path:'../outputs/new-shul-android-board.png'});
    tap('עריכה');
    await page.getByRole('button',{name:'ייבוא / ייצוא',exact:true}).first().click();
    adb('shell','rm','-f','/sdcard/Download/new-shul-board.zip');
    await page.getByRole('button',{name:'ייצוא חבילת ZIP',exact:true}).click();
    await expect.poll(tree, {timeout:15000}).toContain('com.google.android.documentsui');
    tap('Save');
    await expect.poll(() => Number(adb('shell','stat','-c','%s','/sdcard/Download/new-shul-board.zip').trim())).toBeGreaterThan(100);
    const bytes = execFileSync('adb',['-s',serial!,'exec-out','cat','/sdcard/Download/new-shul-board.zip'],{maxBuffer:40_000_000});
    const bundle = await JSZip.loadAsync(bytes);
    const doc = JSON.parse(await bundle.file('board.json')!.async('string'));
    expect(doc.version).toBe(2);
    expect(Object.keys(doc.assets)).toHaveLength(1);
    expect(doc.config.elements.some((e:{text:string})=>e.text===message)).toBe(true);
    writeFileSync('../outputs/new-shul-android-export.zip',bytes);
    await page.getByText('ייבוא לוח',{exact:true}).click();
    await expect.poll(tree,{timeout:30000}).toContain('new-shul-board.zip');
    tap('new-shul-board.zip');
    await expect(page.getByRole('button',{name:'החלת הלוח המיובא'})).toBeVisible();
    await page.getByRole('button',{name:'החלת הלוח המיובא'}).click();
    await expect(page.locator('.tv-root').getByText(message,{exact:true})).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await device.close(); }
});

test('New Shul APK: cold restart and fullscreen retain saved board', async () => {
  test.skip(serial !== 'emulator-5562', 'Requires the dedicated headless NewShul_QA emulator');
  const adb = (...args:string[]) => execFileSync('adb',['-s',serial!,...args],{encoding:'utf8',timeout:20000});
  adb('shell','am','force-stop','com.ticnutai.newshul');
  adb('shell','am','start','-W','-n','com.ticnutai.newshul/.MainActivity');
  const device = (await _android.devices({omitDriverInstall:true})).find(d=>d.serial()===serial)!;
  try {
    const page = await (await device.webView({pkg:'com.ticnutai.newshul'})).page();
    await page.goto('https://new-shul.local/new-shul.html?display=1');
    await expect(page.locator('.tv-root').getByText(/נבדק באפליקציית Android/)).toBeVisible();
    let xml = '';
    await expect.poll(() => {
      try { adb('shell','timeout','8','uiautomator','dump','/sdcard/new-shul-qa.xml'); xml = adb('shell','cat','/sdcard/new-shul-qa.xml'); }
      catch { xml = ''; }
      return xml;
    }, {timeout:30000}).toContain('מסך מלא');
    const b = xml.match(/text="מסך מלא"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/)!;
    expect(b).toBeTruthy();
    adb('shell','input','tap',String((+b[1]+ +b[3])/2),String((+b[2]+ +b[4])/2));
    await expect.poll(() => page.evaluate(()=>[innerWidth,innerHeight])).toEqual([1920,1080]);
    await page.screenshot({path:'../outputs/new-shul-android-fullscreen.png'});
    // Android may show its first-use immersive-mode tutorial over the app.
    adb('shell','uiautomator','dump','/sdcard/new-shul-qa.xml');
    const tip = adb('shell','cat','/sdcard/new-shul-qa.xml').match(/text="Got it"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (tip) adb('shell','input','tap',String((+tip[1]+ +tip[3])/2),String((+tip[2]+ +tip[4])/2));
    adb('shell','input','keyevent','4');
    await expect.poll(() => page.evaluate(()=>innerHeight)).toBeLessThan(1080);
  } finally { await device.close(); }
});
