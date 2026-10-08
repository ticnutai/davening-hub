import {expect,type Browser,type Page} from '@playwright/test';

/** Opt-in live reads only. Credentials/snapshots never go to a file or trace. */
export async function readOnlyBoard(browser:Browser):Promise<Record<string,unknown[]>>{
  const snapshot:Record<string,unknown[]>={};
  if(process.env.NEW_SHUL_READ_LIVE!=='1')return snapshot;
  const remote=await browser.newContext();remote.setDefaultTimeout(20000);
  try{
    await remote.route('**/*',async route=>{
      const r=route.request(),u=new URL(r.url());
      if(r.method()==='POST'&&/^\/rest\/v1\/rpc\/(is_admin|is_platform_admin|my_communities)$/.test(u.pathname))return route.continue();
      if((u.pathname.includes('/rest/v1/')||u.pathname.includes('/storage/v1/'))&&!['GET','HEAD','OPTIONS'].includes(r.method()))return route.abort();
      return route.continue();
    });
    const live=await remote.newPage();const pending:Promise<void>[]=[];
    live.on('response',response=>{
      const table=new URL(response.url()).pathname.split('/rest/v1/')[1];
      if(table&&['settings','tv_config','minyanim','minyan_categories','shiurim','announcements','minyan_overrides'].includes(table)&&response.ok()){
        pending.push(response.json().then(rows=>{if(Array.isArray(rows)&&rows.length)snapshot[table]=rows;else if(rows&&typeof rows==='object'&&!Array.isArray(rows))snapshot[table]=[rows];}).catch(()=>{}));
      }
    });
    await live.goto('https://shul-hub.lovable.app/auth');
    await live.getByRole('button',{name:'בית הכנסת אושר של יהודי',exact:true}).click();
    await live.locator('input[type=email]').fill(process.env.NEW_SHUL_READ_EMAIL!);
    await live.locator('input[type=password]').fill(process.env.NEW_SHUL_READ_PASSWORD!);
    await live.getByRole('button',{name:'התחבר',exact:true}).click();
    await live.waitForURL('**/community');
    await live.goto('https://shul-hub.lovable.app/community/admin?tab=tv');
    await live.getByRole('tab',{name:'תצוגות',exact:true}).click();
    for(const table of ['tv_config','minyanim','settings','shiurim'])await expect.poll(()=>snapshot[table]?.length??0).toBeGreaterThan(0);
    await Promise.all(pending);
    return snapshot;
  }finally{await remote.close();}
}

export async function localBoard(page:Page,snapshot?:Record<string,unknown[]>){
  return page.evaluate(async(snapshot)=>{
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('new-shul.workspace.v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    try{
      const data=await new Promise<Record<string,any[]>>((resolve,reject)=>{const r=db.transaction('workspace').objectStore('workspace').get('board');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
      if(snapshot){
        for(const [table,rows] of Object.entries(snapshot))data[table]=rows.map((r:any)=>({...r,community_id:'new-shul-local'}));
        await new Promise<void>((resolve,reject)=>{const tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').put(data,'board');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
      }
      return data;
    }finally{db.close();}
  },snapshot);
}
