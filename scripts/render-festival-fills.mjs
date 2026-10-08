// Code-native vector fills, separate from the generated transparent frames.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:600,height:900},deviceScaleFactor:1});
  for(const [id,light,dark] of [['ivorylight','#fffdf5','#f5e7cc'],['sukkotroyal','#173e30','#08291f'],['sukkahwarm','#fff6df','#dfc69a']]){
    for(const shape of ['arch','wide']){
      const arch=id==='sukkahwarm'?'M21 98V34C21 20 34 12 50 12S79 20 79 34V98Z':id==='sukkotroyal'?'M5 96V29Q8 22 23 18Q25 8 50 8Q75 8 77 18Q92 22 95 29V96Z':'M5 98V32C5 12 24 3 50 3S95 12 95 32V98Z';
      const path=shape==='arch'?arch:id==='ivorylight'?'M4 94V44C4 15 25 6 50 6S96 15 96 44V94Z':'M5 12H95V90H5Z';
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><radialGradient id="fill"><stop stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs><path d="${path}" fill="url(#fill)"/></svg>`;
      await writeFile(`public/new-shul-assets/${id}-${shape}-fill.svg`,svg);
      await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`);
      await page.screenshot({path:`public/new-shul-assets/${id}-${shape}-fill.png`,omitBackground:true});
    }
  }
}finally{await browser.close();}
