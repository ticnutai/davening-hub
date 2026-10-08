import { FRAME_PICTURES } from './framePictures';

// Only native vector frames have a known transparent centre. The ornate
// artwork crops are deliberately not offered as isolated frames.
export const EXPORTABLE_FRAMES = FRAME_PICTURES.filter(f => f.url.startsWith('data:image/svg+xml;'));

export async function exportFramePng(id: string): Promise<Blob> {
  const frame = EXPORTABLE_FRAMES.find(f => f.id === id);
  if (!frame) throw new Error('בחרו מסגרת וקטורית לייצוא');
  const image = new Image();
  image.src = frame.url;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1200;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('לא ניתן לייצא תמונה במכשיר הזה');
  context.drawImage(image, 0, 0, 1200, 1200);
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('ייצוא המסגרת נכשל'));
  }, 'image/png'));
}
