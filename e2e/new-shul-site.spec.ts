import {test,expect} from '@playwright/test';
const pageErrors=new WeakMap<object,string[]>();

test.beforeEach(async({page})=>{
  const errors:string[]=[];pageErrors.set(page,errors);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
    const u=new URL(route.request().url());
    if(['http:','https:'].includes(u.protocol)&&u.hostname!=='127.0.0.1')return route.abort();
    return route.continue();
  });
});
test.afterEach(async({page})=>{expect(pageErrors.get(page)).toEqual([]);});

test('existing prayer layout link opens the local board editor',async({page})=>{
  await page.goto('/new-shul.html');
  await page.getByTestId('builtin-designs').getByRole('button',{name:/^שיש מואר · המקור בשכבות/}).click();
  await page.getByRole('navigation',{name:'ניווט New Shul'}).getByRole('link',{name:'ניהול מניינים',exact:true}).click();
  await page.getByRole('link',{name:'הלוח בבית הכנסת נקבע בנפרד, בעורך הלוח'}).click();
  await expect(page).toHaveURL(/#\/\?panel=layout/);
  await expect(page.getByRole('tab',{name:'פריסה',exact:true})).toHaveAttribute('data-state','active');
  await expect(page.locator('.tv-root svg[data-source-mask]')).toHaveCount(19);
  await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeEnabled();
});

test('a one-day prayer change replaces its earlier value and restores the regular time when deleted',async({page})=>{
  await page.goto('/new-shul.html#/manage/minyanim');
  const overrides=page.getByTestId('minyan-overrides');
  await expect(overrides.getByLabel('בחירת מניין',{exact:true})).toBeVisible();
  await overrides.getByLabel('בחירת מניין',{exact:true}).click();
  await page.getByRole('option',{name:/שחרית/}).click();
  await overrides.getByLabel('השעה ביום הזה',{exact:true}).fill('08:11');
  await overrides.getByRole('button',{name:'שמירת השינוי',exact:true}).click();
  await expect(overrides.locator('li')).toHaveCount(1);
  await overrides.getByLabel('השעה ביום הזה',{exact:true}).fill('08:22');
  await overrides.getByRole('button',{name:'שמירת השינוי',exact:true}).click();
  await expect(overrides.locator('li')).toHaveCount(1);
  await expect(overrides.locator('li')).toContainText('08:22');
  await page.reload();
  await expect(overrides.locator('li')).toHaveCount(1);
  await expect(overrides.locator('li')).toContainText('08:22');
  await page.getByRole('navigation',{name:'ניווט New Shul'}).getByRole('link',{name:'האתר לציבור',exact:true}).click();
  await expect(page.getByText('08:22',{exact:true})).toBeVisible();
  await page.getByRole('navigation',{name:'ניווט New Shul'}).getByRole('link',{name:'ניהול מניינים',exact:true}).click();
  await overrides.getByRole('button',{name:'ביטול השינוי',exact:true}).click();
  await expect(overrides.locator('li')).toHaveCount(0);
  await page.goto('/new-shul.html#/community');
  await expect(page.getByText('08:22',{exact:true})).toHaveCount(0);
  await expect(page.getByText('07:00',{exact:true})).toBeVisible();
});

test('synagogue details and local logos save, reload and cancel safely',async({page})=>{
  await page.goto('/new-shul.html#/manage/settings');
  await page.getByRole('button',{name:'עריכת פרטי בית הכנסת'}).click();
  const dialog=page.getByTestId('synagogue-details');
  await dialog.getByLabel('שם בית הכנסת',{exact:true}).fill('בית הכנסת בדיקת פרטים');
  await dialog.getByLabel('כתובת',{exact:true}).fill('רחוב הבדיקה 10');
  await dialog.getByLabel('העלאת לוגו').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')});
  await expect(dialog.locator('img[src^="data:image"]')).toHaveCount(1);
  await dialog.getByTestId('syn-save').click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(page.getByTestId('local-shul-name')).toHaveText('בית הכנסת בדיקת פרטים');
  await page.getByRole('button',{name:'עריכת פרטי בית הכנסת'}).click();
  await expect(dialog.getByLabel('כתובת',{exact:true})).toHaveValue('רחוב הבדיקה 10');
  await expect(dialog.locator('img[src^="data:image"]')).toHaveCount(1);
  await dialog.getByLabel('שם בית הכנסת',{exact:true}).fill('לא לשמור');
  await dialog.getByRole('button',{name:'ביטול',exact:true}).click();
  await page.getByRole('navigation',{name:'ניווט New Shul'}).getByRole('link',{name:'האתר לציבור',exact:true}).click();
  await expect(page.getByText('בית הכנסת בדיקת פרטים',{exact:true}).first()).toBeVisible();
  await expect(page.getByText('לא לשמור',{exact:true})).toHaveCount(0);
});

test('chavruta create edit deactivate and delete persist across public and admin pages',async({page})=>{
  await page.goto('/new-shul.html#/manage/chavrutot');
  await page.getByRole('button',{name:'חברותא חדשה',exact:true}).click();
  const form=page.locator('form');
  await form.locator('input[required]').fill('חברותא לבדיקת עריכה');
  await form.getByRole('button',{name:'שמירה',exact:true}).click();
  await expect(form).toBeHidden();
  await page.getByRole('button',{name:'עריכה',exact:true}).click();
  await form.locator('input[required]').fill('חברותא מעודכנת');
  await form.getByRole('button',{name:'שמירה',exact:true}).click();
  await page.goto('/new-shul.html#/community/chavrutot');
  await expect(page.getByText('חברותא מעודכנת',{exact:true})).toBeVisible();
  await page.goto('/new-shul.html#/manage/chavrutot');
  await page.getByRole('button',{name:'עריכה',exact:true}).click();
  await form.getByRole('switch',{name:'מוצג באתר',exact:true}).click();
  await form.getByRole('button',{name:'שמירה',exact:true}).click();
  await expect(form).toBeHidden();
  await page.goto('/new-shul.html#/community/chavrutot');
  await expect(page.getByText('חברותא מעודכנת',{exact:true})).toHaveCount(0);
  await page.goto('/new-shul.html#/manage/chavrutot');
  await page.getByRole('button',{name:'מחיקה',exact:true}).click();
  await expect(page.getByText('חברותא מעודכנת',{exact:true})).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('אין חברותות.',{exact:true})).toBeVisible();
});

test('local contact message can be read marked and deleted without sending externally',async({page})=>{
  await page.goto('/new-shul.html#/community/contact');
  await page.getByLabel('שם',{exact:true}).fill('בודק מקומי');
  await page.getByLabel('נושא',{exact:true}).fill('פנייה לבדיקה');
  await page.getByLabel('תוכן ההודעה',{exact:true}).fill('הודעה מקומית בלבד');
  await page.getByRole('button',{name:'שליחת הודעה',exact:true}).click();
  await expect(page.getByLabel('תוכן ההודעה',{exact:true})).toHaveValue('');
  await page.getByRole('navigation',{name:'ניווט New Shul'}).getByRole('link',{name:'פניות לגבאי',exact:true}).click();
  await expect(page.getByText('הודעה מקומית בלבד',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'סימון כנקרא'}).click();
  await expect(page.getByRole('button',{name:'סימון כנקרא'})).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('הודעה מקומית בלבד',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'סימון כנקרא'})).toHaveCount(0);
  await page.getByRole('button',{name:'מחיקה',exact:true}).click();
  await expect(page.getByText('אין הודעות.',{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByText('אין הודעות.',{exact:true})).toBeVisible();
});

test('local site content forms persist and feed the public site and layered board',async({page})=>{
  test.setTimeout(90000);
  const errors:string[]=[];const external:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(['http:','https:'].includes(url.protocol)&&url.hostname!=='127.0.0.1') {external.push(url.origin);return route.abort();}
    return route.continue();
  });
  await page.goto('/new-shul.html');
  await page.getByTestId('builtin-designs').getByRole('button',{name:/^שיש מואר · המקור בשכבות/}).click();
  const nav=page.getByRole('navigation',{name:'ניווט New Shul'});
  await nav.getByRole('link',{name:'ניהול מניינים',exact:true}).click();
  await page.getByRole('button',{name:'מניין חדש',exact:true}).click();
  await page.getByPlaceholder('שחרית א׳').fill('מניין בדיקה מקומי');
  await page.locator('form input[type=time]').fill('08:15');
  await page.locator('form').getByRole('button',{name:'שמירה',exact:true}).click();
  await expect(page.getByPlaceholder('שחרית א׳')).toBeHidden();
  await nav.getByRole('link',{name:'ניהול הודעות',exact:true}).click();
  await page.getByRole('button',{name:'מודעה חדשה',exact:true}).click();
  await page.getByPlaceholder('מזל טוב למשפחת…').fill('הודעה מקומית לבדיקה');
  await page.locator('[data-testid=announcement-image-editor] input[type=file]').setInputFiles({name:'local-pixel.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=','base64')});
  await page.locator('form textarea').first().fill('תוכן הודעה שנשמר במערכת החדשה');
  await page.locator('form').getByRole('button',{name:'שמירה',exact:true}).click();
  await expect(page.getByPlaceholder('מזל טוב למשפחת…')).toBeHidden();
  await nav.getByRole('link',{name:'ניהול שיעורים',exact:true}).click();
  await page.getByRole('button',{name:'שיעור חדש',exact:true}).click();
  const form=page.locator('form').filter({has:page.locator('input[required]')});
  await form.locator('input[required]').fill('שיעור מקומי לבדיקה');
  await form.getByRole('combobox').nth(1).click();
  await page.getByRole('option',{name:'בכל יום',exact:true}).click();
  await page.getByPlaceholder('20:30 / אחרי מנחה').fill('20:30');
  await form.getByRole('button',{name:'שמירה',exact:true}).click();
  await expect(page.getByPlaceholder('20:30 / אחרי מנחה')).toBeHidden();
  await page.reload();
  await expect(page.getByText('שיעור מקומי לבדיקה',{exact:true})).toBeVisible();
  await nav.getByRole('link',{name:'האתר לציבור',exact:true}).click();
  await expect(page.getByText('מניין בדיקה מקומי',{exact:true})).toBeVisible();
  await page.getByRole('navigation',{name:'ניווט קהילתי'}).getByRole('link',{name:'מודעות',exact:true}).click();
  await expect(page.getByText('הודעה מקומית לבדיקה',{exact:true})).toBeVisible();
  await expect(page.locator('img[src^="data:image/png"]').last()).toBeVisible();
  await page.getByRole('navigation',{name:'ניווט קהילתי'}).getByRole('link',{name:'שיעורים',exact:true}).click();
  await expect(page.getByText('שיעור מקומי לבדיקה',{exact:true})).toBeVisible();
  await page.screenshot({path:'../outputs/new-shul-public-lessons.png'});
  await nav.getByRole('link',{name:'עיצוב הלוח',exact:true}).click();
  // Select the design again after reload; content rows must remain untouched.
  await page.getByTestId('builtin-designs').getByRole('button',{name:/^שיש מואר · המקור בשכבות/}).click();
  await page.getByRole('tab',{name:'פריסה',exact:true}).click();
  const editor=page.getByTestId('elements-editor');
  await editor.getByRole('button',{name:'כותרת מרכזית',exact:true}).click();
  await editor.getByLabel('מקור תוכן האלמנט').selectOption('announcements');
  await page.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled({timeout:20000});
  await nav.getByRole('link',{name:'תצוגת הלוח',exact:true}).click();
  const board=page.locator('.tv-root:visible');
  await expect(board.locator('[data-content-binding=lessons]')).toContainText('שיעור מקומי לבדיקה');
  await expect(board.locator('[data-content-binding=announcements]')).toContainText('הודעה מקומית לבדיקה');
  await expect(board.locator('[data-content-binding=prayers]')).toContainText('מניין בדיקה מקומי',{timeout:20000});
  await page.screenshot({path:'../outputs/new-shul-site-content-board.png'});
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
