import {test,expect} from '@playwright/test';
import {build} from 'esbuild';
import path from 'node:path';
let bundle:string;
test.beforeAll(async()=>{
 const mocks:Record<string,string>={
  '@community/lib/data':'export function useMinyanim(){return {data:[{id:"m",label:"מנחה",active:true,day_type:"weekday"}]}}',
  '@/community/lib/community':'export function communityId(){return "a"} export const useCommunityId=communityId;',
  '@community/lib/minyan-time':'export const DAY_TYPE_LABEL={weekday:"חול"};export function jerusalemDateKey(){return "2026-10-10"}',
  '@community/integrations/supabase/client':`let rows=[{id:'o',minyan_id:'m',on_date:'2026-10-10',at_time:'13:15:00',cancelled:false,note:'הערה קיימת'}]; export const supabase={from(){const c={then(resolve){return Promise.resolve({data:rows,error:null}).then(resolve)},upsert(row){window.saved=row;rows=[{id:'o',...row}];return c}};for(const m of ['select','eq','gte','order','delete'])c[m]=()=>c;return c}};`,
 };
 const out=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import {MinyanOverridesAdmin} from '@/community/components/admin/MinyanOverridesAdmin';createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><MinyanOverridesAdmin/></QueryClientProvider>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},alias:{'@':path.resolve('src'),'@community':path.resolve('src/community')},plugins:[{name:'isolated',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}}]});bundle=out.outputFiles[0].text;
});
test('editing one-day override retains time while changing note',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<html dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div></html>'}));
 await page.goto('https://qa.invalid/overrides');await page.addScriptTag({content:bundle});
 await page.getByRole('button',{name:'עריכת השינוי',exact:true}).click();
 await expect(page.getByLabel('השעה ביום הזה')).toHaveValue('13:15');
 await page.getByLabel('הערה (לא חובה)').fill('מקום חדש');
 await page.getByRole('button',{name:'עדכון השינוי הקיים'}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).saved)).toMatchObject({at_time:'13:15:00',note:'מקום חדש',community_id:'a'});
 await expect(page.getByRole('button',{name:'שמירת השינוי',exact:true})).toBeDisabled();expect(errors).toEqual([]);
});
