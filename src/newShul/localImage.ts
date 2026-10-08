/** Embedded images remain portable and never contact cloud storage. */
export function localImage(file:File):Promise<string>{
  return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('קריאת התמונה נכשלה'));reader.readAsDataURL(file);});
}
