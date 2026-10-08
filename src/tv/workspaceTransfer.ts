import JSZip from 'jszip';
import { normalizeTvConfig, type TvConfig } from './config';
import { applyDesign, captureDesign, DESIGN_PARTS } from './designs';

/** Transfer appearance without replacing destination content or scheduling. */
export function applyAppearance(destination: TvConfig, source: TvConfig): TvConfig {
  return applyDesign(destination, captureDesign(source, 'ערכה מיובאת', [...DESIGN_PARTS]));
}
export function exportAppearance(config: TvConfig): Promise<Blob> {
  return exportWorkspace(applyAppearance(normalizeTvConfig({}), config));
}

export const WORKSPACE_FORMAT = 'new-shul-board';
const MAX_BYTES = 30_000_000;
export function workspaceDocument(config: TvConfig) {
  const { _records: _pending, ...clean } = normalizeTvConfig(config);
  const serialized = JSON.stringify(clean);
  return { format: WORKSPACE_FORMAT, version: /"zmanKeys":|"binding":"(?:parasha|dafYomi|amudYomi|seasonal)"/.test(serialized) ? 4 : serialized.includes('"sourceMask":') ? 3 : 2, config: clean };
}
export function parseWorkspace(text: string): TvConfig {
  if (text.length > MAX_BYTES) throw new Error('הקובץ גדול מדי (עד 30MB)');
  const raw = JSON.parse(text);
  if (raw.assets && Object.keys(raw.assets).length) throw new Error('הקובץ מפנה לתמונות בחבילה. יש לייבא את קובץ ה־ZIP המלא');
  return readDocument(raw);
}
function readDocument(raw: ReturnType<typeof workspaceDocument>): TvConfig {
  if (raw?.format !== WORKSPACE_FORMAT || ![1, 2, 3, 4].includes(raw?.version) || !raw.config || typeof raw.config !== 'object' || Array.isArray(raw.config)) throw new Error('קובץ הלוח אינו נתמך או נוצר בגרסה אחרת');
  // No imported pending writes to content tables.
  return normalizeTvConfig({ ...raw.config, _records: [] });
}
export async function exportWorkspace(config: TvConfig): Promise<Blob> {
  const doc = workspaceDocument(config);
  const original = JSON.stringify(doc);
  // A portable package must never quietly depend on an old cloud image.
  if (/https?:\/\//.test(original)) throw new Error('הלוח כולל קישור חיצוני. החליפו תמונות חיצוניות בתמונות מקומיות לפני יצירת חבילה עצמאית');
  const zip = new JSZip();
  const sources = new Set<string>();
  JSON.stringify(doc, (_, value) => {
    if (typeof value === 'string' && (/^\/new-shul-assets\/[\w.-]+$/.test(value) || /^data:image\/(png|jpeg|webp);base64,/.test(value))) sources.add(value);
    return value;
  });
  const replacements = new Map<string, string>();
  const assets: Record<string, { file: string; type: string }> = {};
  let total = 0;
  for (const source of sources) {
    const response = await fetch(source);
    if (!response.ok) throw new Error('תמונה לא נטענה. הייצוא בוטל כדי למנוע חבילה חסרה');
    const blob = await response.blob();
    const type = blob.type.split(';')[0];
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(type) || blob.size > 4_400_000) throw new Error('תמונה אינה נתמכת או גדולה מדי לייצוא');
    total += blob.size;
    if (total > MAX_BYTES) throw new Error('העיצוב גדול מדי. הקטינו תמונות לפני הייצוא');
    const extension = type.split('/')[1];
    const ref = `/new-shul-assets/embedded-${replacements.size}.${extension}`;
    const file = `assets/${replacements.size}.${extension}`;
    replacements.set(source, ref); assets[ref] = { file, type };
    zip.file(file, await blob.arrayBuffer());
  }
  const text = JSON.stringify({ ...doc, assets }, (_, value) => typeof value === 'string' ? replacements.get(value) ?? value : value, 2);
  if (total + new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('העיצוב גדול מדי. הקטינו תמונות לפני הייצוא');
  zip.file('board.json', text);
  zip.file('README.txt', `New Shul editable board v${doc.version} with embedded raster assets. Version 3 requires source-pixel mask support. Version 4 additionally supports selected daily times and separate parasha, dafYomi, amudYomi and seasonal bindings. Requires the current compatible layer renderer and installed New Shul fonts. Older APKs may not support all live content bindings. Not compatible with the legacy design-tokens or site-data importer. Live prayer data is not included.`);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}
export async function importWorkspace(file: File): Promise<TvConfig> {
  if (file.size > MAX_BYTES) throw new Error('הקובץ גדול מדי (עד 30MB)');
  if (!file.name.toLowerCase().endsWith('.zip')) return parseWorkspace(await file.text());
  const zip = await JSZip.loadAsync(file);
  const entry = zip.file('board.json');
  if (!entry) throw new Error('חסר קובץ board.json בחבילה');
  // Bound inflation as well as compressed file size before collecting its text.
  const readEntry = async (entry: JSZip.JSZipObject, budget: number) => new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Uint8Array[] = []; let length = 0;
    const stream = (entry as typeof entry & { internalStream(type: 'uint8array'): JSZip.JSZipStreamHelper<Uint8Array> }).internalStream('uint8array');
    stream.on('data', chunk => { length += chunk.length; if (length > budget) { stream.pause(); reject(new Error('תוכן החבילה גדול מדי')); return; } chunks.push(chunk); })
      .on('error', reject).on('end', () => { const out = new Uint8Array(length); let at = 0; chunks.forEach(c => { out.set(c, at); at += c.length; }); resolve(out); }).resume();
  });
  const bytes = await readEntry(entry, MAX_BYTES);
  const raw = JSON.parse(new TextDecoder().decode(bytes));
  readDocument(raw); // Validate the document before reading referenced assets.
  if (!raw.assets) return readDocument(raw); // Older ZIP files remain readable.
  if (typeof raw.assets !== 'object' || Array.isArray(raw.assets)) throw new Error('רשימת התמונות בחבילה אינה תקינה');
  const replacements = new Map<string, string>();
  let total = bytes.length;
  for (const [ref, value] of Object.entries(raw.assets)) {
    const asset = value as { file?: string; type?: string } | null;
    if (!/^\/new-shul-assets\/embedded-\d+\.(png|jpeg|webp)$/.test(ref) || !asset || !/^assets\/\d+\.(png|jpeg|webp)$/.test(asset.file ?? '') || !['image/png','image/jpeg','image/webp'].includes(asset.type ?? '')) throw new Error('הפניה לתמונה בחבילה אינה תקינה');
    const image = zip.file(asset.file!);
    if (!image) throw new Error('תמונה חסרה בחבילה');
    const data = await readEntry(image, Math.min(4_400_000, MAX_BYTES - total)); total += data.length;
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject;
      reader.readAsDataURL(new Blob([new Uint8Array(data)], {type: asset.type}));
    });
    replacements.set(ref, url);
  }
  // Rehydrate after the bounded archive read; identical regions share one image value.
  const config = JSON.parse(JSON.stringify(raw.config), (_, value) => {
    if (typeof value === 'string' && value.startsWith('/new-shul-assets/')) {
      if (!replacements.has(value)) throw new Error('תמונה אינה כלולה בחבילה');
      return replacements.get(value);
    }
    return value;
  });
  return readDocument({ ...raw, config });
}
export function downloadFile(blob: Blob, name: string) {
  const native = (window as Window & { NewShulAndroid?: { saveFile(name: string, type: string, base64: string): void } }).NewShulAndroid;
  if (native) {
    const reader = new FileReader();
    reader.onload = () => native.saveFile(name, blob.type, String(reader.result).split(',')[1]);
    reader.onerror = () => window.alert('קריאת קובץ הייצוא נכשלה');
    reader.readAsDataURL(blob); return;
  }
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
