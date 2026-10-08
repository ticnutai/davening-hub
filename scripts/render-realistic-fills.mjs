// Native vector fills remain separate from generated photographic frame cutouts.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:600,height:900},deviceScaleFactor:1});
 for(const id of ['walnutsilver','pearlgold'])for(const shape of ['arch','wide']){
  const path=shape==='arch'?'M10 94V36C10 15 27 6 50 6S90 15 90 36V94Z':'M5 8H95V92H5Z';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><radialGradient id="fill"><stop stop-color="#fffdf5"/><stop offset="1" stop-color="#e8d9b8"/></radialGradient></defs><path d="${path}" fill="url(#fill)"/></svg>`;
  await writeFile(`public/new-shul-assets/${id}-${shape}-fill.svg`,svg);
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`);
  await page.screenshot({path:`public/new-shul-assets/${id}-${shape}-fill.png`,omitBackground:true});
 }
}finally{await browser.close();}
