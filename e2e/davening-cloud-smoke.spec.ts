import { test, expect } from '@playwright/test';

test('new cloud community loads and guest can open login', async ({ page }) => {
  test.skip(!process.env.E2E_BASE_URL?.includes('davening-hub.lovable.app'), 'Explicit new deployment only');
  const wrongHosts: string[] = [];
  const errors: string[] = [];
  const failedApi: string[] = [];
  page.on('request', r => {
    const u = new URL(r.url());
    if (u.hostname.endsWith('.supabase.co') && u.hostname !== 'akmafwvxecexweqktgmw.supabase.co') wrongHosts.push(u.hostname);
  });
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => {
    if (r.url().includes('.supabase.co/rest/v1/') && r.status() >= 400) failedApi.push(r.url().split('?')[0] + ':' + r.status());
  });
  const communities = page.waitForResponse(r => r.url().includes('/rest/v1/communities') && r.status() === 200);
  await page.goto('/community');
  expect((await communities).ok()).toBeTruthy();
  await expect(page.getByTestId('account-entry')).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('לא נמצא בית כנסת פעיל.', { exact: false })).toHaveCount(0);
  await page.getByTestId('account-entry').click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByLabel('סיסמה', { exact: true })).toBeVisible();
  expect(wrongHosts).toEqual([]);
  expect(failedApi).toEqual([]);
  expect(errors).toEqual([]);
});

test('public community pages keep distinct readable entry points', async ({ page }) => {
  test.skip(!process.env.E2E_BASE_URL?.includes('davening-hub.lovable.app'), 'Explicit new deployment only');
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [url, heading] of [
    ['/community/announcements', 'מודעות לציבור'],
    ['/community/shiurim', 'שיעורי תורה'],
    ['/community/chavrutot', 'חברותות'],
    ['/community/contact', 'הודעה לגבאי'],
  ]) {
    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1, name: heading, exact: true })).toBeVisible({ timeout: 30000 });
  }
  await expect(page.getByLabel('תוכן ההודעה')).toBeVisible();
  await expect(page.getByRole('button', { name: 'שליחת הודעה', exact: true })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('published catalogue includes lunar and hall themes with reachable assets', async ({page})=>{
 test.skip(!process.env.E2E_BASE_URL?.includes('davening-hub.lovable.app'),'Explicit new deployment only');
 test.setTimeout(90000);
 await page.goto('/community');
 const catalogue=await page.evaluate(async()=>{const r=await fetch('/new-shul-catalog.json?release=333a502',{cache:'no-store'});if(!r.ok)throw new Error('catalog HTTP '+r.status);return r.json();});
 expect(catalogue.designs).toHaveLength(77);
 expect(catalogue.parts).toHaveLength(849);
 const added=catalogue.designs.filter((d:any)=>d.id.startsWith('d_rc_')||d.id.startsWith('d_hall_'));
 expect(added).toHaveLength(10);
 for(const d of added)expect(catalogue.parts.filter((p:any)=>p.designId===d.id)).toHaveLength(d.values.elements.length);
 const assets=[...new Set<string>(added.flatMap((d:any)=>d.values.elements.map((e:any)=>e.image).filter(Boolean)))];
 const decoded=await page.evaluate(async(urls)=>Promise.all(urls.map(async src=>{const img=new Image();img.src=src;await img.decode();return {src,width:img.naturalWidth,height:img.naturalHeight};})),assets);
 expect(decoded.every(i=>i.width>0&&i.height>0)).toBe(true);
 console.log(JSON.stringify({themes:catalogue.designs.length,parts:catalogue.parts.length,newThemes:added.length,decodedAssets:decoded.length}));
});
