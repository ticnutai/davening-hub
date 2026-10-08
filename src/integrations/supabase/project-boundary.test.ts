import {expect,it} from 'vitest';
import {assertApprovedSupabase} from './project-boundary';
it('permits only exact HTTPS new project URL',()=>{
 expect(()=>assertApprovedSupabase('https://akmafwvxecexweqktgmw.supabase.co')).not.toThrow();
 for(const url of [undefined,'https://another-project.supabase.co','http://akmafwvxecexweqktgmw.supabase.co','https://akmafwvxecexweqktgmw.supabase.co.evil.invalid','https://user@akmafwvxecexweqktgmw.supabase.co','https://akmafwvxecexweqktgmw.supabase.co/path'])expect(()=>assertApprovedSupabase(url)).toThrow();
});
