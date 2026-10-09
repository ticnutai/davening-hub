import { beforeEach, expect, it, vi } from "vitest";
const db=vi.hoisted(()=>({ scope:"a", calls:[] as unknown[][], existing:[] as {id:string;community_id:string}[] }));
vi.mock("./community",()=>({communityId:()=>db.scope}));
vi.mock("@community/integrations/supabase/client",()=>({supabase:{from:(table:string)=>{
  db.calls.push(["from",table]);
  let lookup=false;
  const chain:any={then:(resolve:any)=>Promise.resolve({data:lookup?db.existing:[],error:null}).then(resolve)};
  for(const method of ["select","eq","in","upsert"]) chain[method]=(...args:unknown[])=>{
    db.calls.push([method,...args]);if(method==="in")lookup=true;return chain;
  };
  return chain;
}}}));
import { fetchAllData, importData, EXPORTABLE_TABLES } from "./data-export";
beforeEach(()=>{db.scope="a";db.calls=[];db.existing=[];});
it("exports only the selected synagogue for every table",async()=>{
  await fetchAllData();
  expect(db.calls.filter(c=>c[0]==="eq")).toEqual(EXPORTABLE_TABLES.map(()=>["eq","community_id","a"]));
});
it("rejects foreign or legacy unscoped rows before writing any table",async()=>{
  for(const row of [{id:"foreign",community_id:"b"},{id:"legacy"}]){
    db.calls=[];
    await expect(importData({settings:[{id:"valid",community_id:"a"}],announcements:[row]},["settings","announcements"])).rejects.toThrow("הייבוא לא התחיל");
    expect(db.calls.some(c=>c[0]==="upsert")).toBe(false);
  }
});
it("rejects an existing ID owned by another synagogue even if the file claims this scope",async()=>{
  db.existing=[{id:"x",community_id:"b"}];
  await expect(importData({announcements:[{id:"x",community_id:"a"}]},["announcements"])).rejects.toThrow("מזהה בקובץ");
  expect(db.calls.some(c=>c[0]==="upsert")).toBe(false);
});
it("restores a valid scoped row and reports the actual attempted table",async()=>{
  const row={id:"x",community_id:"a",title:"demo"};
  expect(await importData({announcements:[row]},["announcements"])).toEqual([{table:"announcements",attempted:1,imported:1}]);
  expect(db.calls).toContainEqual(["upsert",[row],{onConflict:"id"}]);
});
