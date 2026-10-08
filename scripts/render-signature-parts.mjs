import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({viewport:{width:600,height:900},deviceScaleFactor:1});
  const assets=[];
  const pointed='M30 872V275Q35 145 300 28Q565 145 570 275V872Z';
  const stepped='M28 95H70V50H115V28H485V50H530V95H572V805H530V850H485V872H115V850H70V805H28Z';
  for(const [id,path,fill] of [['vitrail',pointed,'#162d41'],['artdeco',stepped,'#122c29']]) {
    assets.push([id+'-fill',`<path d="${path}" fill="${fill}"/>`,255]);
    let details='';
    if(id==='vitrail') {
      const colors=['#257e87','#4b467d','#ab6b43','#38689a','#55867c'];
      for(let i=0;i<5;i++) {
        const x=65+i*94,top=210-Math.sin((i+.5)/5*Math.PI)*110;
        details+=`<path d="M${x} 242L${x} ${top}L${x+39} ${top-25}L${x+78} ${top}V242Z" fill="${colors[i]}" stroke="#c4a568" stroke-width="3"/>`;
      }
    } else {
      details='<path d="M95 110H505M95 790H505M52 150V750M548 150V750" fill="none" stroke="#7e7852" stroke-width="3"/><path d="M268 65L300 42L332 65L300 88Z" fill="#d8b67b"/>';
    }
    assets.push([id+'-frame',`<path d="${path}" fill="none" stroke="#6d5839" stroke-width="25"/><path d="${path}" fill="none" stroke="#e2c58a" stroke-width="5"/>${details}`,0]);
  }
  let petals='';
  for(let i=0;i<12;i++)petals+=`<ellipse cx="300" cy="153" rx="37" ry="110" transform="rotate(${i*30} 300 300)" fill="${['#387c89','#725184','#b27448'][i%3]}" stroke="#d8b974" stroke-width="5"/>`;
  assets.push(['vitrail-rose',`<g transform="translate(0 150)"><circle cx="300" cy="300" r="280" fill="#122435" stroke="#d8b974" stroke-width="10"/>${petals}<circle cx="300" cy="300" r="53" fill="#bfa56c"/><circle cx="300" cy="300" r="29" fill="#233f5a"/></g>`,255]);
  let rays='';
  for(let i=0;i<23;i++) {
    const a=Math.PI+i*Math.PI/22;
    rays+=`<path d="M300 820L${300+275*Math.cos(a)} ${820+775*Math.sin(a)}" stroke="#bb965b" stroke-width="2" opacity=".45"/>`;
  }
  assets.push(['deco-fan',`${rays}<path d="M10 850H590M10 880H590" stroke="#d8b67b" stroke-width="5"/>`,null]);
  for(const [id,body,expected] of assets) {
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900">${body}</svg>`;
    await writeFile(`public/new-shul-assets/${id}.svg`,svg);
    await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`);
    const png=await page.screenshot({path:`public/new-shul-assets/${id}.png`,omitBackground:true});
    const alpha=await page.evaluate(async src=>{const i=new Image();i.src=src;await i.decode();const c=document.createElement('canvas');c.width=600;c.height=900;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(300,450,1,1).data[3];},'data:image/png;base64,'+png.toString('base64'));
    if(expected!==null&&alpha!==expected)throw Error(`${id}: alpha ${alpha}`);
    console.log(id, 'centre alpha', alpha);
  }
} finally {await browser.close();}
