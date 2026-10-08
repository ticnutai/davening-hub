/** Cloud connections are restricted to the new project; local studio bypasses cloud entirely. */
export const APPROVED_SUPABASE_HOST = "akmafwvxecexweqktgmw.supabase.co";
export function assertApprovedSupabase(raw: string | undefined): asserts raw is string {
 let url: URL;
 try { url = new URL(raw ?? ''); } catch { throw new Error('Missing or invalid new project URL'); }
 if (url.protocol !== 'https:' || url.hostname !== APPROVED_SUPABASE_HOST || url.port || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
  throw new Error('Refusing connection outside the approved new Supabase project');
 }
}
export const assertShulHubSupabase: typeof assertApprovedSupabase = assertApprovedSupabase;
