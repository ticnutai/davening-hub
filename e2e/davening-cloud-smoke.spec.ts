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
