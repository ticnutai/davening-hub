import { test, expect } from '@playwright/test';
import { localBoard } from './readOnlyBoard';

test('six workspaces share one draft, one preview and one save', async ({page})=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/new-shul.html');
 await expect(page.getByTestId('builtin-designs')).toBeVisible({timeout:60000});
 await page.getByTestId('builtin-designs').getByRole('button',{name:/^שבת — סלון פנינה ·/}).click();
 await page.getByText('העדפות סביבת העריכה',{exact:true}).click();
 const picker=page.getByLabel('סביבת העריכה',{exact:true});
 for(const mode of ['side','bottom','contextual','wizard','layers','ribbon']){
   await picker.selectOption(mode);
   await expect(page.getByTestId('editor-workspace')).toHaveAttribute('data-mode',mode);
   await expect(page.locator('[data-board-preview]')).toHaveCount(1);
   await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true})).toHaveCount(1);
   await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true})).toBeEnabled();
   await expect(picker).toHaveCount(1);
 }
 await picker.selectOption('layers');
 const layers=page.getByRole('complementary',{name:'חלקי הלוח'});
 await expect(layers.getByRole('button').first()).toBeVisible();
 await layers.getByRole('button').first().click();
 await expect(page.getByTestId('elements-editor')).toBeVisible();
  await page.getByLabel('התיבה להחלפת מסגרת').selectOption('salonivory_prayers_frame');
  await page.getByRole('button',{name:'החלפת המסגרת לקשת עץ מגולף',exact:true}).click();
  await picker.selectOption('wizard');
  await page.getByRole('button',{name:'צעד אחורה (Ctrl+Z)',exact:true}).click();
  await picker.selectOption('side');
  await page.getByRole('button',{name:'צעד קדימה (Ctrl+Y)',exact:true}).click();
  await picker.selectOption('layers');
 await page.getByRole('button',{name:'שמירה מקומית',exact:true}).click();
 await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true})).toBeDisabled();
 const saved=(await localBoard(page)).tv_config[0].config;
  expect(new Set(saved.elements.map(e=>e.id)).size).toBe(saved.elements.length);
  expect(saved.elements.find(e=>e.id==='salonivory_prayers_frame').image).toContain('woodarch-frame.png');
 await page.reload();await page.getByText('העדפות סביבת העריכה',{exact:true}).click();await expect(picker).toHaveValue('layers');
 expect((await localBoard(page)).tv_config[0].config).toEqual(saved);
 await expect(page.locator('[data-board-preview]')).toHaveCount(1);
  await page.screenshot({path:`../outputs/editor-workspaces-${test.info().project.name}.png`});
 await picker.selectOption('classic');await expect(page.getByTestId('editor-workspace')).toHaveCount(0);
 expect(errors).toEqual([]);
});
