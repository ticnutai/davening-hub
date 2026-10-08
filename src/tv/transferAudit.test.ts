import { describe, it, expect } from 'vitest';
import { DEFAULT_TV_CONFIG, normalizeTvConfig } from './config';
import { PREMIUM_DESIGNS } from './premiumDesigns';
import { buildExport, parseImport, applyImport } from './transfer';
import { parseWorkspace, workspaceDocument, applyAppearance } from './workspaceTransfer';
import { applyDesign } from './designs';
import { EMERALD_COMPOSITION } from './emeraldComposition';

describe('Transfer compatibility audit', () => {
  it('version 4 preserves selected times and calendar bindings including nested libraries', () => {
    const input=normalizeTvConfig({elementLibrary:[{id:'zset',name:'זמנים',elements:[{id:'z',kind:'text',binding:'zmanim',zmanKeys:['sof_zman_shma_mga72','sof_zman_shma','invalid','sof_zman_shma'],rowsPerPage:13}]}],elements:[{id:'p',kind:'text',binding:'parasha'}]});
    const doc=workspaceDocument(input);
    expect(doc.version).toBe(4);
    const restored=parseWorkspace(JSON.stringify(doc));
    expect(restored.elementLibrary[0].elements[0].zmanKeys).toEqual(['sof_zman_shma_mga72','sof_zman_shma']);
    expect(restored.elements[0].binding).toBe('parasha');
    expect(workspaceDocument({...input,elements:[]}).version).toBe(4);
  });
  it('appearance adaptation preserves every destination setting outside design keys', async () => {
    const { DESIGN_KEYS } = await import('./designs');
    const destination = normalizeTvConfig({...DEFAULT_TV_CONFIG, texts:{'header.title':'בית הכנסת המקבל'}, hidden:['minyan:kept'], backgroundImage:'/new-shul-assets/ruby-palace.png'});
    const source = applyDesign(normalizeTvConfig({texts:{'header.title':'לא להעביר'}}), EMERALD_COMPOSITION);
    const result = applyAppearance(destination, source);
    for(const key of Object.keys(destination) as (keyof typeof destination)[]) {
      if(!DESIGN_KEYS.includes(key)) expect(result[key], key).toEqual(destination[key]);
    }
    expect(result.elements).toEqual(source.elements);
    expect(result.backgroundImage).toBeNull();
    expect(result.frameStyle.image).toBeNull();
    expect(result.screenLayout).toBe('composition');
    expect(result.texts['header.title']).toBe('בית הכנסת המקבל');
  });
  it('legacy design export round trips colours and gradients but does not carry artwork layers', () => {
    const source = normalizeTvConfig({ ...structuredClone(DEFAULT_TV_CONFIG), ...PREMIUM_DESIGNS[1].values,
      gradients: [{ id:'u_test', name:'בדיקת העברה', value:'linear-gradient(90deg, #123456, #abcdef)' }] });
    const file = buildExport(source, {themes:true,gradients:true,board:true});
    const incoming = parseImport(JSON.stringify(file), ()=>'t_import', ()=>'u_import');
    const target = applyImport(structuredClone(DEFAULT_TV_CONFIG), incoming);
    expect(target.gradients[0].value).toBe(source.gradients[0].value);
    expect(target.elements).toEqual([]);
    expect(source.elements.length).toBeGreaterThan(10);
    expect(JSON.stringify(file)).not.toContain('/new-shul-assets/');
  });
  it('all thirteen ornate presets use one opaque art plate cropped into regions, with separate live text', () => {
    expect(PREMIUM_DESIGNS).toHaveLength(13);
    for (const d of PREMIUM_DESIGNS) {
      const art = d.values.elements!.filter(e=>e.kind==='image');
      expect(new Set(art.map(e=>e.image)).size).toBe(1);
      expect(art.every(e=>e.crop && e.opacity===1)).toBe(true);
      expect(d.values.backgroundImage).toBeNull();
      expect(d.values.elements!.filter(e=>e.kind==='frame')).toHaveLength(0);
      expect(d.values.elements!.some(e=>e.binding==='prayers')).toBe(true);
    }
  });
  it('the original importer rejects a New Shul document, and new importer still accepts v1 backups', () => {
    const doc = workspaceDocument(structuredClone(DEFAULT_TV_CONFIG));
    expect(()=>parseImport(JSON.stringify(doc),()=>'',()=>'' )).toThrow(/design-tokens/);
    expect(parseWorkspace(JSON.stringify({...doc,version:1})).elements).toEqual([]);
    expect(()=>parseWorkspace(JSON.stringify({...doc,assets:{x:{file:'missing'}}}))).toThrow(/ZIP/);
  });
});
