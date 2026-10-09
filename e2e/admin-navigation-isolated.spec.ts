import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
let bundle: string;
let css: string;
test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: `
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {MemoryRouter, useLocation} from 'react-router-dom';
      import {Tabs} from '@/components/ui/tabs';
      import {AdminNavigation} from '@/community/components/admin/AdminNavigation';
      import {QuickAddButton} from '@/community/components/QuickAddButton';
      import {EditorWorkspace} from '@/community/components/admin/tv/EditorWorkspace';
      function EditorDemo(){const [tab,setTab]=React.useState('design');const [draft,setDraft]=React.useState('');
        return <EditorWorkspace mode="side" tab={tab} onTab={setTab} layers={[]} selected={null} onSelect={()=>{}} inspector={null}
          preview={<div data-testid="preview">{draft}</div>}
          controls={<><label>טקסט בדיקה<input aria-label="טקסט בדיקה" value={draft} onChange={e=>setDraft(e.target.value)}/></label><output data-testid="step">{tab}</output></>}/>;
      }
      function App(){ const [tab,setTab]=React.useState('minyanim'); const location=useLocation();
        return <main dir="rtl" style={{padding:12}}><h1>בדיקת ניווט מבודדת</h1>
        <Tabs value={tab} onValueChange={setTab}><AdminNavigation storeApp={false} unread={3}/></Tabs>
        <output data-testid="selected">{tab}</output><output data-testid="location">{location.pathname+location.search}</output>
        <QuickAddButton/></main>;
      }
      createRoot(document.getElementById('root')).render(<MemoryRouter>{window.__editor ? <EditorDemo/> : <App/>}</MemoryRouter>);`,
      resolveDir: process.cwd(), loader: 'tsx',
    }, bundle: true, write: false, format: 'iife', jsx: 'automatic', loader: { '.css': 'empty' },
    alias: { '@': path.resolve('src'), '@community': path.resolve('src/community') },
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'isolated-auth', setup(b) {
      b.onResolve({ filter: /lib\/use-auth$/ }, () => ({ path: 'test-auth', namespace: 'test-auth' }));
      b.onLoad({ filter: /.*/, namespace: 'test-auth' }, () => ({ contents: 'export function useAuth(){return {isAdmin:true,loading:false}}', loader: 'js' }));
    } }],
  });
  bundle = result.outputFiles[0].text;
  css = readdirSync('dist/assets').filter(f => /^index-[^-]+\.css$/.test(f)).map(f => readFileSync(path.join('dist/assets',f),'utf8')).join('\n');
});
test('grouped navigation and shortcuts use one canonical destination', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', r => r.abort()); // Isolated UI: no cloud, no user data.
  await page.setContent('<!doctype html><html lang="he" dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div></body></html>');
  await page.addStyleTag({ content: css });
  expect(await page.evaluate(() => innerWidth)).toBe(page.viewportSize()!.width);
  await page.addScriptTag({ content: bundle });
  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(14);
  for (const [label, value] of [
    ['מניינים','minyanim'],['מודעות לציבור','announcements'],['שיעורים','shiurim'],['חברותות','chavrutot'],
    ['בקשות חברותא','chavruta-requests'],['פניות לגבאי (3)','messages'],['לוחות ומסכים','tv'],['עיצוב דף הבית','widgets'],
    ['משתמשים והרשאות','users'],['גיבוי וייבוא נתונים','data'],['קודי QR','qr'],['הורדת אפליקציות','apps'],['עוזר חכם','ai'],['מפתח העוזר החכם','api'],
  ]) {
    await page.getByRole('tab', { name: label, exact: true }).click();
    await expect(page.getByTestId('selected')).toHaveText(value);
    await expect(page.getByRole('tab', { selected: true })).toHaveCount(1);
  }
  for (const [label, destination] of [['מודעה','announcements'],['שיעור','shiurim'],['חברותא','chavrutot'],['מניין','minyanim']]) {
    await page.getByRole('button', { name: 'הוספה מהירה' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('form')).toHaveCount(0);
    await page.getByRole('button', { name: new RegExp('^'+label+' ') }).click();
    await expect(page.getByTestId('location')).toHaveText('/community/admin?tab='+destination);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `../outputs/admin-navigation-${testInfo.project.name}.png` });
});


test('workspace hides only its replacement navigation, not nested tools', async ({ page }) => {
  await page.setContent('<div class="ew-controls"><div role="tablist" data-editor-main-tabs>primary</div><div role="tablist" aria-label="כלי פנימי"><button role="tab">אפשרות פנימית</button></div></div>');
  await page.addStyleTag({ content: readFileSync('src/community/components/admin/tv/editorWorkspace.css', 'utf8') });
  await expect(page.locator('[data-editor-main-tabs]')).toBeHidden();
  await expect(page.getByRole('tab', { name: 'אפשרות פנימית' })).toBeVisible();
});


test('four primary editor steps retain draft when advanced tools open', async({page})=>{
  await page.setContent('<html lang="he" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div></html>');
  await page.evaluate(()=>{(window as any).__editor=true});
  await page.addStyleTag({content:css+'\n'+readFileSync('src/community/components/admin/tv/editorWorkspace.css','utf8')});
  await page.addScriptTag({content:bundle});
  await page.getByLabel('טקסט בדיקה').fill('טיוטה שלא נשמרה');
  for(const [name,id] of [['ערכה','design'],['חלקים ומיקום','layout'],['תוכן','content'],['בדיקה ושידור','review']]){
    await page.getByRole('button',{name,exact:true}).click();
    await expect(page.getByTestId('step')).toHaveText(id);
    await expect(page.getByTestId('preview')).toHaveText('טיוטה שלא נשמרה');
    await expect(page.getByTestId('preview')).toHaveCount(1);
  }
  await expect(page.getByRole('button',{name:'ייבוא וגרסאות',exact:true})).toBeHidden();
  await page.getByText('כלים נוספים',{exact:true}).click();
  await page.getByRole('button',{name:'ייבוא וגרסאות',exact:true}).click();
  await expect(page.getByTestId('step')).toHaveText('tools');
  await page.getByRole('button',{name:'תוכן',exact:true}).click();
  await expect(page.getByLabel('טקסט בדיקה')).toHaveValue('טיוטה שלא נשמרה');
});
