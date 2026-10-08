/** An explicitly local workspace adapter. Never forwards a request to a server. */
export const LOCAL_STUDIO = import.meta.env.VITE_NEW_SHUL_LOCAL === 'true';
export const LOCAL_STORE_KEY = 'new-shul.workspace.v1';
const community = { id: 'new-shul-local', slug: 'new-shul', name: 'New Shul · הלוח שלי', active: true };
type Row = Record<string, unknown>;
type Store = Record<string, Row[]>;
function seed(): Store {
  const initial: Store = {
    communities: [community],
    tv_config: [{ community_id: community.id, config: {}, updated_at: new Date().toISOString() }],
    settings: [{ ...community, id: 'default', address: '', city: 'ירושלים', latitude: 31.778, longitude: 35.235, timezone: 'Asia/Jerusalem', candle_lighting_minutes: 40, havdalah_minutes: 42 }],
    minyan_categories: [{ id: 'local-week', name: 'זמנים לדוגמה', system_key: 'weekday', active: true, sort_order: 0 }],
    minyanim: ['שחרית', 'מנחה', 'ערבית'].map((label, i) => ({ id: `local-${i}`, label, prayer: ['shacharit', 'mincha', 'maariv'][i], day_type: 'weekday', time_mode: 'fixed', fixed_time: ['07:00:00', '18:00:00', '19:00:00'][i], category_id: 'local-week', sort_order: i, active: true })),
    announcements: [{ id: 'local-welcome', title: 'ברוכים הבאים', body: 'לוח מקומי לעריכה · הזמנים והתוכן לדוגמה', active: true, sort_order: 0 }],
    shiurim: [], tv_devices: [], tv_config_versions: [], logo_library: [],
  };
  return Object.fromEntries(Object.entries(initial).map(([table, rows]) => [table, rows.map(row => ({ community_id: community.id, ...row }))]));
}
let database: Promise<IDBDatabase> | undefined;
function db(): Promise<IDBDatabase> {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(LOCAL_STORE_KEY, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('workspace');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function access(value?: Store): Promise<Store | undefined> {
  const connection = await db();
  return new Promise((resolve, reject) => {
    const tx = connection.transaction('workspace', value ? 'readwrite' : 'readonly');
    const store = tx.objectStore('workspace');
    const request = value ? store.put(value, 'board') : store.get('board');
    tx.oncomplete = () => resolve(value ?? request.result);
    tx.onabort = () => reject(tx.error ?? new Error('השמירה המקומית נכשלה'));
    tx.onerror = () => reject(tx.error);
  });
}
let initialized: Promise<void> | undefined;
async function read(): Promise<Store> {
  await (initialized ??= (async () => { if (!(await access())) await access(seed()); })());
  return (await access())!;
}
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
const handleLocalFetch: typeof fetch = async (input, init) => {
  try {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.pathname.includes('/auth/')) return reply({ message: 'Local workspace has no cloud account' }, 401);
    if (!url.pathname.startsWith('/rest/v1/')) return reply({ message: 'Cloud services are disabled in local mode' }, 403);
    const table = url.pathname.split('/').pop()!;
    const store = await read();
    let rows = store[table] ?? [];
    const matches = (row: Row) => [...url.searchParams].every(([k, v]) => {
      if (['select','order','limit','offset','on_conflict'].includes(k)) return true;
      if(v.startsWith('eq.')) return String(row[k])===v.slice(3);
      if(v.startsWith('gte.')) return String(row[k]??'')>=v.slice(4);
      if(v.startsWith('lte.')) return String(row[k]??'')<=v.slice(4);
      return true;
    });
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      if (!['communities', 'tv_config', 'settings', 'minyanim', 'announcements', 'shiurim', 'minyan_categories', 'minyan_overrides', 'shiur_categories', 'chavrutot', 'chavruta_requests', 'admin_messages'].includes(table)) return reply({ message: 'This operation is unavailable locally' }, 403);
      const body = request.method === 'DELETE' ? null : await request.json();
      if (table === 'tv_config' && rows.some(matches)) {
        store.tv_config_versions = [{ id: crypto.randomUUID(), config: rows[0].config, saved_at: rows[0].updated_at, replaced_at: new Date().toISOString() }, ...(store.tv_config_versions ?? [])].slice(0, 40);
      }
      const changed: Row[] = [];
      if (request.method === 'PATCH') rows = rows.map(r => { if (!matches(r)) return r; const next = { ...r, ...body }; changed.push(next); return next; });
      else if (request.method === 'DELETE') rows = rows.filter(r => !matches(r));
      else {
        const added = (Array.isArray(body) ? body : [body]).map(r => ({ id: crypto.randomUUID(), created_at:new Date().toISOString(), ...r }));
        const merge = request.headers.get('prefer')?.includes('resolution=merge-duplicates');
        const conflictKeys=(url.searchParams.get('on_conflict')??'id').split(',');
        for (const row of added) {
          const index = merge ? rows.findIndex(r=>conflictKeys.every(k=>row[k]!==undefined&&r[k]===row[k])) : -1;
          if (index >= 0) rows[index] = { ...rows[index], ...row, id:rows[index].id, created_at:rows[index].created_at };
          else rows.push(row);
          changed.push(index>=0?rows[index]:row);
        }
      }
      store[table] = rows;
      await access(store);
      return reply(changed);
    }
    rows = rows.filter(matches);
    const ordering=(url.searchParams.get('order')??'').split(',').filter(Boolean);
    if(ordering.length) rows.sort((a,b)=>{for(const term of ordering){const [key,direction]=term.split('.');const x=a[key],y=b[key];const comparison=typeof x==='number'&&typeof y==='number'?x-y:String(x??'').localeCompare(String(y??''),'he');if(comparison)return direction==='desc'?-comparison:comparison;}return 0;});
    if (request.headers.get('accept')?.includes('application/vnd.pgrst.object+json')) return reply(rows[0] ?? null);
    return reply(rows);
  } catch (error) { return reply({ message: error instanceof Error ? error.message : 'Local storage failed' }, 500); }
};

// Reordering forms save multiple rows concurrently. Serialize the read/modify/write
// transactions so one successful local update cannot overwrite another.
let queue:Promise<unknown>=Promise.resolve();
export const localFetch:typeof fetch=(input,init)=>{
  const next=queue.then(()=>handleLocalFetch(input,init));
  queue=next.catch(()=>undefined);
  return next;
};
