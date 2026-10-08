// Native SVG artwork, rasterized as portable transparent PNG parts.
// Reproducible; no external images, fonts or network services.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:600,height:900},deviceScaleFactor:1});
const arch='M24 876V222C24 90 160 24 300 24S576 90 576 222V876Z';
const scroll='M35 45Q80 10 120 42H480Q530 10 565 45L552 855Q505 895 465 864H135Q90 895 35 855Z';
for(const [id,path,dark,light,fill] of [
  ['woodarch',arch,'#3d1e12','#c99451','#f6e7ca'],
  ['stonearch',arch,'#ad9675','#e8d7b3','#fffaf0'],
  ['copperparchment',scroll,'#855033','#cf9764','#f7e7bf'],
])for(const part of ['frame','fill']){
  const ornament=id==='copperparchment' ? `<path d="M65 90Q95 55 135 75M465 75Q505 55 535 90" fill="none" stroke="${light}" stroke-width="3"/>` : `<path d="M80 250Q135 120 285 102M315 102Q465 120 520 250" fill="none" stroke="${light}" stroke-width="3" opacity=".8"/><path d="M265 82L300 57L335 82L300 107Z" fill="${light}" stroke="${dark}" stroke-width="3"/>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">
  <defs><linearGradient id="edge"><stop stop-color="${dark}"/><stop offset=".2" stop-color="${light}"/><stop offset=".48" stop-color="${dark}"/><stop offset=".7" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
  <radialGradient id="paper"><stop stop-color="#fffdf5"/><stop offset="1" stop-color="${fill}"/></radialGradient></defs>
  ${part==='fill'?`<path d="${path}" fill="url(#paper)"/>`:`<path d="${path}" fill="none" stroke="url(#edge)" stroke-width="40"/><path d="${path}" fill="none" stroke="${light}" stroke-width="2"/>${ornament}`}</svg>`;
  await writeFile(`public/new-shul-assets/${id}-${part}.svg`,svg);
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`);
  const png=await page.screenshot({path:`public/new-shul-assets/${id}-${part}.png`,omitBackground:true});
  const alpha=await page.evaluate(async src=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=600;c.height=900;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(300,450,1,1).data[3];},'data:image/png;base64,'+png.toString('base64'));
  if(alpha!==(part==='frame'?0:255))throw new Error(`${id}-${part}: unexpected centre alpha ${alpha}`);
}
await browser.close();
