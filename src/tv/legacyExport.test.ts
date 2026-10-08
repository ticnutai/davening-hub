import { describe,it,expect } from 'vitest';
import { DEFAULT_TV_CONFIG, normalizeTvConfig } from './config';
import { PREMIUM_DESIGNS } from './premiumDesigns';
import { exportForExistingSite, backgroundElementIds } from './legacyExport';
import { parseImport } from './transfer';
import { newCustomThemeId, newGradientId } from './themes';
describe('Existing-site export',()=>{
  it('includes the active palette even with no saved custom themes, in the original parser format',()=>{
    const c=normalizeTvConfig({...structuredClone(DEFAULT_TV_CONFIG),...PREMIUM_DESIGNS[1].values,themeOverrides:{'--tv-text':'#123456'}});
    const file=exportForExistingSite(c,'ערכת בדיקה',true);
    const parsed=parseImport(JSON.stringify(file),newCustomThemeId,newGradientId);
    expect(parsed.themes).toHaveLength(1);
    expect(parsed.themes[0].vars['--tv-text']).toBe('#123456');
    expect(parsed.themes[0].name).toBe('ערכת בדיקה');
    expect(parsed.board).toBeTruthy();
    expect(parsed.board?.title).toBeNull();
    expect(parsed.illustrations).toEqual([]);
    expect(JSON.stringify(file)).not.toContain('elements');
  });
  it('preserves destination layout and background unless explicitly requested',()=>{
    const file=exportForExistingSite(structuredClone(DEFAULT_TV_CONFIG),'צבעים בלבד');
    expect(file.board).toBeUndefined();
    expect(parseImport(JSON.stringify(file),newCustomThemeId,newGradientId).board).toBeNull();
  });
  it('exports only visible artwork, excluding every free text and live binding for all ornate themes',()=>{
    for(const d of PREMIUM_DESIGNS){
      const c=normalizeTvConfig({...structuredClone(DEFAULT_TV_CONFIG),...d.values});
      const ids=backgroundElementIds(c);
      expect(ids.size).toBeGreaterThanOrEqual(8);
      expect(c.elements.filter(e=>ids.has(e.id)).every(e=>e.kind!=='text'&&!e.hidden)).toBe(true);
    }
    expect(()=>backgroundElementIds(structuredClone(DEFAULT_TV_CONFIG))).toThrow();
  });
});
