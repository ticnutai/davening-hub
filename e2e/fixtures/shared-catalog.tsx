import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SharedCatalogLibrary} from '../../src/community/components/admin/tv/SharedCatalogLibrary';
import {normalizeTvConfig} from '../../src/tv/config';
import '../../src/index.css';
function Fixture(){
 const key='catalog-fixture-'+new URLSearchParams(location.search).get('board');
 const [config,setConfig]=useState(()=>normalizeTvConfig(JSON.parse(localStorage.getItem(key)||'{}')));
 const edit=(_key,fn)=>setConfig(c=>fn(c));
 return <main className="mx-auto max-w-6xl space-y-6 p-6">
  <button onClick={()=>localStorage.setItem(key,JSON.stringify(config))}>שמירת בדיקה</button>
  <output data-testid="state">{JSON.stringify({ids:config.elements.map(e=>e.id),elements:config.elements.length,designs:config.designs.length})}</output>
  <SharedCatalogLibrary mode="designs" config={config} onEdit={edit}/>
  <SharedCatalogLibrary mode="parts" config={config} onEdit={edit}/>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
