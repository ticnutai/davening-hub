import { cleanup, renderHook, act } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { TvConfig } from "@/tv/config";
import { useDraftSync } from "./tvDraftChannel";
const state = vi.hoisted(() => ({ id: "a" }));
vi.mock("@/community/lib/community", () => ({ useCommunityId: () => state.id }));
class Channel {
  static all: Channel[] = [];
  onmessage: ((e: { data: unknown }) => void) | null = null;
  postMessage = vi.fn();
  close = vi.fn();
  constructor(public name: string) { Channel.all.push(this); }
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); Channel.all=[]; state.id="a"; });
it("scopes channel and rejects foreign or legacy messages while accepting newer same-community drafts", () => {
  vi.stubGlobal("BroadcastChannel", Channel);
  const receive = vi.fn(); const saved = vi.fn();
  const config = {} as TvConfig;
  const { result } = renderHook(() => useDraftSync(config, 5, { onRemoteDraft: receive, onSaved: saved }));
  const c = Channel.all[0];
  expect(c.name).toBe("shul-tv-draft:a:tv_config");
  act(() => {
    c.onmessage?.({data:{type:"draft",communityId:"b",config,editedAt:10}});
    c.onmessage?.({data:{type:"draft",config,editedAt:10}});
    c.onmessage?.({data:{type:"draft",communityId:"a",config,editedAt:4}});
    c.onmessage?.({data:{type:"saved",communityId:"b"}});
  });
  expect(receive).not.toHaveBeenCalled(); expect(saved).not.toHaveBeenCalled();
  act(() => c.onmessage?.({data:{type:"draft",communityId:"a",config,editedAt:10}}));
  expect(receive).toHaveBeenCalledWith(config,10);
  act(() => result.current.announceSaved());
  expect(c.postMessage).toHaveBeenLastCalledWith({type:"saved",communityId:"a"});
});
it("closes the old channel without broadcasting the previous community draft after a scope change", () => {
  vi.stubGlobal("BroadcastChannel", Channel);
  const { rerender } = renderHook(() => useDraftSync({} as TvConfig, 5));
  const c=Channel.all[0]; c.postMessage.mockClear();
  state.id="b"; rerender();
  expect(c.close).toHaveBeenCalledOnce();
  expect(c.postMessage).not.toHaveBeenCalled();
  expect(Channel.all).toHaveLength(1);
});
