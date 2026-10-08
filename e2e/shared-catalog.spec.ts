import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('global catalogue supplies all screenshot themes and parts to existing and new boards without auto applying',async({browser})=>{
 test.setTimeout(60000);
 const catalogue=await readFile('public/new-shul-catalog.json','utf8');
 const contexts=[];
 try{
  for(const board of ['existing','new']){
   const context=await browser.newContext({viewport:{width:1600,height:1000}});contexts.push(context);
   await context.route('**/new-shul-catalog.json',r=>r.fulfill({contentType:'application/json',body:catalogue}));
   const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`/e2e/fixtures/shared-catalog.html?board=${board}`);
   const themes=page.getByTestId('shared-catalog-designs'),parts=page.getByTestId('shared-catalog-parts');
   await expect(themes.getByTestId('shared-count')).toHaveText('67 ערכות זמינים');
   expect(JSON.parse(await page.getByTestId('state').innerText()).elements).toBe(0);
   for(const name of ['עץ היכל','אבן ירושלים','ארמון אמרלד','אודם ונחושת','פנינה וכסף','אוניקס וזהב','פסיפס זית','ארז ונחושת','תכלת ופורצלן','אחלמה מלכותית','אלבסטר ורוד']){
    await themes.getByLabel('חיפוש בקטלוג המשותף').fill(name);
    await expect(themes.getByRole('button',{name:/החלת ערכה משותפת/}).first()).toBeVisible();
   }
   await themes.getByLabel('חיפוש בקטלוג המשותף').fill('אבן ירושלים · אוסף');
   await themes.getByRole('button',{name:/החלת ערכה משותפת/}).click();
   const applied=JSON.parse(await page.getByTestId('state').innerText());expect(applied.elements).toBeGreaterThan(10);expect(applied.designs).toBe(0);
   await parts.getByLabel('חלקים מאיזו ערכה').selectOption('d_premium_jerusalem-stone');
   await expect(parts.getByRole('button',{name:/הוספת חלק משותף/})).toHaveCount(8);
   await expect(parts.getByText('אזור מהציור המקורי; הרקע שבתוך החיתוך נשאר מחובר')).toHaveCount(8);
   await parts.getByRole('button',{name:'הוספת חלק משותף עמוד שיש שמאל',exact:true}).click();
   await page.getByRole('button',{name:'שמירת בדיקה',exact:true}).click();await page.reload();
   const saved=JSON.parse(await page.getByTestId('state').innerText());expect(saved.elements).toBe(applied.elements+1);expect(new Set(saved.ids).size).toBe(saved.elements);
   expect(errors).toEqual([]);
  }
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});

test('unavailable shared catalogue leaves saved board untouched',async({page})=>{
 await page.route('**/new-shul-catalog.json',r=>r.fulfill({status:503,body:'offline'}));
 await page.goto('/e2e/fixtures/shared-catalog.html?board=offline');
 await expect(page.getByTestId('shared-catalog-designs').getByRole('alert')).toContainText('העיצוב השמור בלוח לא השתנה');
 expect(JSON.parse(await page.getByTestId('state').innerText()).elements).toBe(0);
});
