import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  rows: [] as unknown[], pending: false, mutate: vi.fn(), remove: vi.fn(), upload: vi.fn(),
}));
vi.mock("@/newShul/localStore", () => ({ LOCAL_STUDIO: false }));
vi.mock("@community/lib/data", () => ({
  DAYS_HE: [], useAnnouncements: () => ({data:state.rows}),
  useChavrutot: () => ({data:[]}), useShiurim: () => ({data:[]}), useShiurCategories: () => ({data:[]}),
}));
vi.mock("@community/lib/admin", () => ({
  useSaveRow: () => ({isPending:state.pending, mutate:state.mutate}),
  useDeleteRow: () => ({mutate:vi.fn()}),
}));
vi.mock("@/community/lib/community", () => ({communityId: () => "qa-community"}));
vi.mock("@community/integrations/supabase/client", () => ({supabase:{storage:{from:()=>({
  upload:state.upload, remove:state.remove, getPublicUrl:()=>({data:{publicUrl:"https://qa.invalid/image.png"}}),
})}}}));
import { AnnouncementsAdmin } from "./ContentAdmin";
beforeEach(()=>{vi.stubGlobal("ResizeObserver",class { observe(){} unobserve(){} disconnect(){} });vi.clearAllMocks();state.pending=false;state.rows=[];state.remove.mockResolvedValue({error:null});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function Demo(){return <QueryClientProvider client={new QueryClient()}><AnnouncementsAdmin/></QueryClientProvider>}
it("blocks cancel and replacement during save, before and after pending renders",async()=>{
  const {container,rerender}=render(<Demo/>);
  fireEvent.click(screen.getByRole("button",{name:"מודעה חדשה"}));
  fireEvent.submit(container.querySelector("form")!);
  expect(state.mutate).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button",{name:"ביטול"}));
  expect(container.querySelector("form")).not.toBeNull();
  expect(state.remove).not.toHaveBeenCalled();
  state.pending=true;rerender(<Demo/>);
  expect(screen.getByRole("button",{name:"ביטול"})).toBeDisabled();
  expect(screen.getByRole("button",{name:"מודעה חדשה"})).toBeDisabled();
  act(()=>{const callbacks=state.mutate.mock.calls[0][1];callbacks.onSuccess();callbacks.onSettled();});
  expect(container.querySelector("form")).toBeNull();
});
it("preserves text edited while image upload completes",async()=>{
  let finish!:(value:unknown)=>void;
  state.upload.mockReturnValue(new Promise(resolve=>{finish=resolve;}));
  const {container}=render(<Demo/>);
  fireEvent.click(screen.getByRole("button",{name:"מודעה חדשה"}));
  fireEvent.change(screen.getByTestId("announcement-image-input"),{target:{files:[new File(["image"],"demo.png",{type:"image/png"})]}});
  await waitFor(()=>expect(state.upload).toHaveBeenCalledOnce());
  const input=screen.getAllByRole("textbox")[0];
  fireEvent.change(input,{target:{value:"כותרת חדשה בזמן העלאה"}});
  expect(screen.getByRole("button",{name:"ביטול"})).toBeDisabled();
  await act(async()=>finish({error:null}));
  expect(input).toHaveValue("כותרת חדשה בזמן העלאה");
  fireEvent.submit(container.querySelector("form")!);
  expect(state.mutate.mock.calls[0][0]).toMatchObject({title:"כותרת חדשה בזמן העלאה",image_url:"https://qa.invalid/image.png"});
});
