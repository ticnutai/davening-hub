import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
let bundle:string;
test.beforeAll(async()=>{const result=await build({stdin:{contents:`
import React,{useState,useRef} from 'react';import {createRoot} from 'react-dom/client';
import {ZMAN_DISPLAY_KEYS,ZMAN_LABELS} from '@/community/lib/zmanim';
import {ROSH_CHODESH_DESIGNS as RC} from '@/tv/roshChodeshDesigns';import {HALL_DESIGNS} from '@/tv/hallDesigns';const ROSH_CHODESH_DESIGNS=[...RC,...HALL_DESIGNS];import {normalizeTvConfig} from '@/tv/config';
import {ElementsEditor} from '@/community/components/admin/tv/ElementsEditor';import {ElementEditingContext} from '@/tv/elementEditing';import {BoardElements} from '@/tv/BoardElements';
const demo={now:new Date('2026-10-11T15:30:00Z'),title:'בית הכנסת אור הלבנה',date:'ראש חודש · תצוגה לדוגמה',prayers:[['שחרית','07:00'],['מנחה','17:45'],['ערבית','18:30']],lessons:[['שיעור הלכות ראש חודש','20:00']],announcements:['חודש טוב ומבורך','שיעור חגיגי לאחר תפילת ערבית','הציבור מוזמן'].join(String.fromCharCode(10)),parasha:'תצוגת הדגמה — הזמנים להמחשה בלבד',zmanKeys:[...ZMAN_DISPLAY_KEYS],zmanim:ZMAN_DISPLAY_KEYS.map((k,i)=>[ZMAN_LABELS[k],['05:20','05:45','06:30','08:50','09:25','10:05','10:30','12:25','12:55','16:55','17:35','18:15','18:35'][i]||'18:45'])};
function App(){const [c,set]=useState(()=>normalizeTvConfig(JSON.parse(localStorage.getItem('rc')||'null')||ROSH_CHODESH_DESIGNS[0].values));const [selected,select]=useState([]);const [draft,setDraft]=useState(null);const api=useRef(null);api.current={elements:c.elements,commit:elements=>set(x=>({...x,elements}))};return <ElementEditingContext.Provider value={{api,selected,select,draft,setDraft,enabled:true,setEnabled:()=>{},snap:false,setSnap:()=>{}}}><div dir="rtl">{ROSH_CHODESH_DESIGNS.map(d=><button onClick={()=>{set(normalizeTvConfig(d.values));select([])}}>{d.name}</button>)}<button onClick={()=>localStorage.setItem('rc',JSON.stringify(c))}>שמירת בדיקה</button><div data-testid="preview" style={{position:'relative',width:'100%',aspectRatio:'16/9',containerType:'size'}}><BoardElements elements={c.elements} data={demo}/></div><ElementsEditor config={c} onEdit={(_,fn)=>set(fn)}/><output data-testid="state">{JSON.stringify(c.elements)}</output></div></ElementEditingContext.Provider>};createRoot(document.getElementById('root')).render(<App/>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},alias:{'@':path.resolve('src'),'@community':path.resolve('src/community')},loader:{'.css':'empty'}});bundle=result.outputFiles[0].text;});
test('all Rosh Chodesh layouts support real editor text changes, deletion and persistence',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async r=>{const u=new URL(r.request().url());if(u.pathname.startsWith('/new-shul-assets/'))return r.fulfill({body:readFileSync('public'+u.pathname),contentType:u.pathname.endsWith('.svg')?'image/svg+xml':'image/png'});return r.fulfill({body:'<html dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div></html>',contentType:'text/html'});});
 await page.goto('https://qa.invalid/rc');await page.addStyleTag({content:readdirSync('dist/assets').filter(f=>/^index-.*\.css$/.test(f)).map(f=>readFileSync('dist/assets/'+f,'utf8')).join('\n')});await page.addScriptTag({content:bundle});
 for(const name of ['לבנה מלכותית','אור פנינה','ירושלים בלילה','שחר של חודש','היכל הלבנה','כסף השמים','שערי הלבנה','ספריית אגוז מלכותית · חלקים עצמאיים','בוקר ירושלמי מוזהב · חלקים עצמאיים','היכל שנהב וזהב · חלקים עצמאיים']){
  await page.getByRole('button',{name:name.includes('חלקים עצמאיים')?name:'ראש חודש · '+name,exact:true}).click();
  await expect(page.getByTestId('state')).toContainText(name.includes('חלקים עצמאיים')?'כותרת הודעות':'ראש חודש מבורך');
  await page.getByTestId('preview').locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  await page.getByTestId('preview').screenshot({path:info.outputPath(name+'.png')});
  await page.getByRole('button',{name:name.includes('חלקים עצמאיים')?'כותרת הודעות':'ברכת ראש חודש',exact:true}).click();
  await page.getByLabel('תוכן האלמנט',{exact:true}).fill('חודש טוב לקהילה');
  await expect(page.getByTestId('state')).toContainText('חודש טוב לקהילה');
  await page.getByRole('button',{name:'מחיקת הבחירה',exact:true}).click();
  await expect(page.getByTestId('state')).not.toContainText('חודש טוב לקהילה');
 }
 await page.getByRole('button',{name:'שמירת בדיקה'}).click();const before=await page.getByTestId('state').textContent();await page.reload();await page.addStyleTag({content:readdirSync('dist/assets').filter(f=>/^index-.*\.css$/.test(f)).map(f=>readFileSync('dist/assets/'+f,'utf8')).join('\n')});await page.addScriptTag({content:bundle});await expect(page.getByTestId('state')).toHaveText(before!);expect(errors).toEqual([]);
 await page.getByTestId('preview').screenshot({path:info.outputPath('rosh-chodesh-preview.png')});
});
