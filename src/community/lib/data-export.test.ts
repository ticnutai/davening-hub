import { describe, it, expect, vi } from 'vitest';
import ExcelJS from 'exceljs';
import { parseJsonFile, parseExcelFile, EXPORTABLE_TABLES } from './data-export';
vi.mock('@community/integrations/supabase/client',()=>({supabase:{}}));

describe('Original site-data compatibility',()=>{
  it('rejects a design file instead of silently treating it as an empty site backup',async()=>{
    await expect(parseJsonFile({text:async()=>JSON.stringify({format:'design-tokens',version:1,themes:[]})} as File)).rejects.toThrow(/גיבוי נתוני אתר/);
    expect(EXPORTABLE_TABLES).not.toContain('tv_config');
    expect(EXPORTABLE_TABLES).not.toContain('minyan_categories');
  });
  it('restores nested arrays and objects serialized into Excel by the original exporter',async()=>{
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('settings');
    sheet.addRow(['id','options','days','name']);
    sheet.addRow(['default','{"enabled":true}','[1,3,5]','בית כנסת']);
    const bytes=await workbook.xlsx.writeBuffer();
    const result=await parseExcelFile({arrayBuffer:async()=>bytes} as File);
    expect(result.settings).toEqual([{id:'default',options:{enabled:true},days:[1,3,5],name:'בית כנסת'}]);
  });
});
