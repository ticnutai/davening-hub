import { renderHook, act, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useSaveRow, useDeleteRow } from './admin';
const db = vi.hoisted(() => ({ calls: [] as unknown[][], error: null as null | Error }));
vi.mock('@community/integrations/supabase/client', () => ({ supabase: { from: (table:string) => {
 db.calls.push(['table',table]);
 const chain:any={ then:(resolve:any)=>Promise.resolve({error:db.error}).then(resolve) };
 for(const method of ['update','insert','delete','eq']) chain[method]=(...args:unknown[])=>{db.calls.push([method,...args]);return chain};
 return chain;
} } }));
vi.mock('@/community/lib/community', () => ({communityId:()=> 'selected-community'}));
vi.mock('sonner', () => ({toast:{success:vi.fn(),error:vi.fn()}}));
afterEach(cleanup);beforeEach(()=>{db.calls=[];db.error=null});
function wrapper({children}:{children:React.ReactNode}){return <QueryClientProvider client={new QueryClient({defaultOptions:{mutations:{retry:false}}})}>{children}</QueryClientProvider>}
it('creates in selected community even if stale draft contains another community', async()=>{
 const {result}=renderHook(()=>useSaveRow('shiurim','shiurim'),{wrapper});
 await act(()=>result.current.mutateAsync({title:'demo',community_id:'other'}));
 expect(db.calls).toContainEqual(['insert',{title:'demo',community_id:'selected-community'}]);
});
it('scopes edits and deletes by both id and community',async()=>{
 const {result}=renderHook(()=>({save:useSaveRow('shiurim','shiurim'),remove:useDeleteRow('shiurim','shiurim')}),{wrapper});
 await act(()=>result.current.save.mutateAsync({id:'row',title:'demo'}));
 expect(db.calls).toContainEqual(['eq','community_id','selected-community']);
 db.calls=[];await act(()=>result.current.remove.mutateAsync('row'));
 expect(db.calls).toContainEqual(['eq','id','row']);expect(db.calls).toContainEqual(['eq','community_id','selected-community']);
});
it('propagates a failed save so the editor keeps the draft',async()=>{
 db.error=new Error('denied');const {result}=renderHook(()=>useSaveRow('shiurim','shiurim'),{wrapper});
 await act(async()=>{await expect(result.current.mutateAsync({title:'demo'})).rejects.toThrow('denied')});
});
