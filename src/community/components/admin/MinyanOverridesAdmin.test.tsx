import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const db=vi.hoisted(()=>({payload:null as any, error:null as Error|null, rows:[{id:"override",minyan_id:"minyan",on_date:"2026-10-10",at_time:"13:15:00",cancelled:false,note:"מקום קודם"}]}));
vi.mock("@/community/lib/community",()=>({communityId:()=>"a",useCommunityId:()=>"a"}));
vi.mock("@community/lib/data",()=>({useMinyanim:()=>({data:[{id:"minyan",label:"מנחה",active:true,day_type:"weekday",fixed_time:"13:00"}]})}));
vi.mock("@community/lib/minyan-time",()=>({DAY_TYPE_LABEL:{weekday:"חול"},jerusalemDateKey:()=>"2026-10-10"}));
vi.mock("@community/integrations/supabase/client",()=>({supabase:{from:()=>{
  const chain:any={then:(resolve:any)=>Promise.resolve({data:db.rows,error:db.error}).then(resolve)};
  for(const m of ["select","eq","gte","order","delete"])chain[m]=()=>chain;
  chain.upsert=(value:any)=>{db.payload=value;return chain;};return chain;
}}}));
import {MinyanOverridesAdmin} from "./MinyanOverridesAdmin";
beforeEach(()=>{db.payload=null;db.error=null;localStorage.clear();vi.stubGlobal("ResizeObserver",class{observe(){}unobserve(){}disconnect(){}});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function mount(){render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false},mutations:{retry:false}}})}><MinyanOverridesAdmin/></QueryClientProvider>);}
it("loads existing values and retains its time when editing only the note",async()=>{
  mount();fireEvent.click(await screen.findByRole("button",{name:"עריכת השינוי"}));
  expect(screen.getByLabelText("השעה ביום הזה")).toHaveValue("13:15");
  fireEvent.change(screen.getByLabelText("הערה (לא חובה)"),{target:{value:"מקום חדש"}});
  fireEvent.click(screen.getByRole("button",{name:"עדכון השינוי הקיים"}));
  await waitFor(()=>expect(db.payload).toMatchObject({minyan_id:"minyan",at_time:"13:15:00",note:"מקום חדש",community_id:"a"}));
  await waitFor(()=>expect(screen.queryByRole("button",{name:"עדכון השינוי הקיים"})).toBeNull());
});
it("does not represent a failed read as no overrides and blocks saving",async()=>{
  db.error=new Error("network");mount();
  expect(await screen.findByRole("alert")).toHaveTextContent("טעינת השינויים נכשלה");
  expect(screen.queryByText("אין שינויים. הלוח הרגיל תקף בכל יום.")).toBeNull();
  expect(screen.getByRole("button",{name:"שמירת השינוי"})).toBeDisabled();
});
