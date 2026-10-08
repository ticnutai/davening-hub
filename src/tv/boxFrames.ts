import type {BoardElement} from './elements';
export const BOX_FRAMES=[
 {id:'stonearch',name:'קשת אבן וזהב',asset:'stonearch',color:'#a1844a'},
 {id:'woodarch',name:'קשת עץ מגולף',asset:'woodarch',color:'#775332'},
 {id:'copperparchment',name:'קלף ונחושת',asset:'copperparchment',color:'#a86e3c'},
 {id:'artdeco',name:'אר דקו זהב',asset:'artdeco',color:'#a1844a'},
 {id:'vitrail',name:'ויטראז׳ צבעוני',asset:'vitrail',color:'#a1844a'},
 {id:'gold',name:'מסגרת זהב נקייה',asset:'',color:'#b48b3c'},
 {id:'silver',name:'מסגרת כסף נקייה',asset:'',color:'#8593a1'},
 {id:'navy',name:'מסגרת כחולה נקייה',asset:'',color:'#244460'},
 {id:'emerald',name:'מסגרת ירוקה נקייה',asset:'',color:'#29664e'},
] as const;
export function isSeparateFrame(e:BoardElement){
 return (e.kind==='frame'||e.name.startsWith('מסגרת '))&&!e.id.startsWith('premium_');
}
export function frameForSelection(all:BoardElement[],selected:string[]){
 const frames=all.filter(isSeparateFrame);
 const direct=frames.filter(e=>selected.includes(e.id));if(direct.length===1)return direct[0];
 for(const id of selected){
  const f=frames.find(e=>e.id===id.replace(/_(content|heading|fill)$/,'_frame'));if(f)return f;
 }
 const e=all.find(e=>e.id===selected[0]);if(!e)return;
 const grouped=e.group?frames.filter(f=>f.group===e.group):[];if(grouped.length===1)return grouped[0];
 const label=e.name.replace(/^(תוכן|כותרת|מילוי) /,'');
 const matches=frames.filter(f=>f.name===`מסגרת ${label}`);if(matches.length===1)return matches[0];
}
export function replaceBoxFrame(all:BoardElement[],id:string,style:string,withFill:boolean,base='/new-shul-assets'){
 const target=all.find(e=>e.id===id&&isSeparateFrame(e));
 const choice=BOX_FRAMES.find(f=>f.id===style);
 if(!target||target.locked||!choice)return all;
 const fillId=id.replace(/_frame$/,'_fill');
 const fills=all.filter(e=>e.id!==id&&(!target.group||e.group===target.group)&&(e.id===fillId||e.name===target.name.replace(/^מסגרת /,'מילוי '))&&e.x===target.x&&e.y===target.y&&e.width===target.width&&e.height===target.height);
 const fill=withFill&&fills.length===1&&!fills[0].locked?fills[0]:undefined;
 const label=target.name.replace(/^מסגרת /,'');
 return all.map(e=>{
  if(fill&&(!target.group||e.group===target.group)&&e.kind==='text'&&!e.locked&&[`תוכן ${label}`,`כותרת ${label}`].includes(e.name)&&e.x>=target.x&&e.y>=target.y&&e.x+e.width<=target.x+target.width&&e.y+e.height<=target.y+target.height){
   return {...e,color:['artdeco','vitrail'].includes(choice.id)?'#fff1cb':'#382719'};
  }
  if(e.id!==id&&e.id!==fill?.id)return e;
  return {...e,kind:choice.asset?'image':e.id===id?'frame':'box',image:choice.asset?`${base}/${choice.asset}-${e.id===id?'frame':'fill'}.png`:'',crop:choice.asset?{x:0,y:0,width:100,height:100}:undefined,sourceMask:undefined,color:e.id===id?choice.color:'transparent',fill:e.id===id?'transparent':'#fff4dc'} as BoardElement;
 });
}
