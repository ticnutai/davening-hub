import {test,expect} from '@playwright/test';
import {localBoard} from './readOnlyBoard';

test('alert mode and MGA72 selection save and survive reload',async({page})=>{
  await page.goto('/new-shul.html');
  await page.getByRole('tab',{name:'תוכן',exact:true}).click();
  const mode=page.getByLabel('אופן התראת זמני היום');
  await expect(mode).toHaveValue('staged');
  const mga=page.getByRole('checkbox',{name:'סוף זמן תפילה — מג״א 72 דק׳',exact:true});
  await expect(mga).toBeChecked();
  await expect(page.getByRole('checkbox',{name:'סוף זמן תפילה — הגר״א',exact:true})).toBeChecked();
  await mga.uncheck();await mode.selectOption('pulse');
  await page.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
  await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();
  await page.reload();await page.getByRole('tab',{name:'תוכן',exact:true}).click();
  await expect(mode).toHaveValue('pulse');await expect(mga).not.toBeChecked();
});

for(const layout of ['composition','dashboard'] as const)for(const event of ['sof_zman_tefila_mga72','sof_zman_tefila'] as const){
  test(`${layout} ${event}: highlight 30, prayer region 20, whole board 10, restore at deadline`,async({page})=>{
    await page.setViewportSize({width:1920,height:1080});
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    // Date-only offset: leave native Intl and browser scheduling untouched.
    // Playwright's full clock shim in this runtime breaks Intl.DateTimeFormat.format.
    await page.addInitScript(`{
      const RealDate=Date;
      window.__realNow=()=>RealDate.now();
      window.__clockOffset=RealDate.parse('2026-10-06T05:00:00Z')-RealDate.now();
      window.Date=class extends RealDate {
        constructor(...args){super(...(args.length?args:[RealDate.now()+window.__clockOffset]));}
        static now(){return RealDate.now()+window.__clockOffset;}
      };
    }`);
    await page.goto('/new-shul.html');
    await page.getByTestId('builtin-designs').getByRole('button',{name:/^היכל נחושת · חלקים עצמאיים/}).click();
    await page.getByRole('button',{name:'שמירה מקומית',exact:true}).first().click();
    await expect(page.getByRole('button',{name:'שמירה מקומית',exact:true}).first()).toBeDisabled();
    const board=await localBoard(page);
    const config=board.tv_config[0].config;
    config.screenLayout=layout;
    if(layout==='dashboard')config.elements=[];
    config.alerts={...config.alerts,enabled:true,mode:'staged',events:[event]};
    await localBoard(page,{tv_config:[{...board.tv_config[0],config}]});
    const deadline=await page.evaluate(async({settings,event})=>{
      const path='/src/community/lib/minyan-time.ts';
      const module=await import(/* @vite-ignore */ path);
      return module.zmanimFor(new Date('2026-10-06T05:00:00Z'),settings)[event].getTime();
    },{settings:board.settings[0],event});
    await page.goto('/new-shul.html?display=1');
    const jump=async(minutes:number)=>{await page.evaluate(target=>{const w=window as any;w.__clockOffset=target-w.__realNow();},deadline-minutes*60000);await page.waitForTimeout(1200);};
    const root=page.locator('.tv-root');
    await jump(31);
    await expect(root.getByTestId('prayer-deadline')).toHaveCount(0);
    await expect(root.getByTestId('board-deadline')).toHaveCount(0);
    await jump(30);
    await expect(root.locator(`[data-zman=${event}]`)).toHaveClass(/tv-zman-warning/);
    await expect(root.getByTestId('board-deadline')).toHaveCount(0);
    await expect(root.getByTestId('prayer-deadline')).toHaveCount(0);
    await jump(20);
    const card=root.getByTestId('prayer-deadline').first();
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-event',event);
    await expect(card).toContainText(event.endsWith('mga72')?'מג״א 72':'הגר״א');
    await expect(root.getByTestId('board-deadline')).toHaveCount(0);
    const bounds=await card.boundingBox();const boardBounds=await root.boundingBox();
    expect(bounds!.width).toBeLessThan(boardBounds!.width*.6);
    await expect(root.locator(`[data-zman=${event}]`)).toBeVisible();
    if(layout==='composition'&&event.endsWith('mga72'))await page.screenshot({path:'../outputs/zman-countdown-prayers.png'});
    const digits=await card.locator('.tv-deadline-digits').textContent();
    await expect(card.locator('.tv-deadline-digits')).not.toHaveText(digits!);
    await jump(10);
    await expect(root.getByTestId('board-deadline')).toBeVisible();
    await expect(root.getByTestId('prayer-deadline')).toHaveCount(0);
    if(layout==='composition'&&event.endsWith('mga72'))await page.screenshot({path:'../outputs/zman-countdown-board.png'});
    await jump(0);
    await expect(root.getByTestId('board-deadline')).toHaveCount(0);
    await expect(root.getByTestId('prayer-deadline')).toHaveCount(0);
    await expect(root.locator(`[data-zman=${event}]`)).not.toHaveClass(/tv-zman-warning/);
    expect(errors).toEqual([]);
  });
}
