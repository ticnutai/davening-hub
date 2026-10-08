import {test,expect} from '@playwright/test';
import {localBoard} from './readOnlyBoard';
test('three art assets load, insert independently and persist',async({page})=>{
 await page.setViewportSize({width:1920,height:1080});await page.goto('/new-shul.html');
 await expect(page.getByTestId('builtin-designs')).toBeVisible();
 await page.getByTestId('builtin-designs').getByRole('button',{name:/^שבת — סלון פנינה ·/}).click();
 await page.getByRole('tab',{name:'פריסה',exact:true}).click();
 await page.getByLabel('סוג אלמנטים מוכנים').selectOption('איורים אמנותיים');
 const shelf=page.getByTestId('ready-elements');await expect(shelf.getByRole('button')).toHaveCount(3);
 await shelf.locator('img').evaluateAll(async imgs=>{await Promise.all(imgs.map(i=>(i as HTMLImageElement).decode()));});
 for(const b of await shelf.getByRole('button').all())await b.click();
 await page.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();await page.reload();
 const all=(await localBoard(page)).tv_config[0].config.elements;
 const added=all.filter(e=>e.image.includes('/art-'));expect(added).toHaveLength(3);expect(new Set(added.map(e=>e.id)).size).toBe(3);
 expect(added.every(e=>!e.locked)).toBe(true);
 await page.getByRole('tab',{name:'פריסה',exact:true}).click();await page.getByLabel('סוג אלמנטים מוכנים').selectOption('איורים אמנותיים');
 await shelf.screenshot({path:'../outputs/art-collection-library.png'});
});
