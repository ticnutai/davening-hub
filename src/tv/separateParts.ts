import {newElement,type SavedElementSet} from './elements';

// Each object is independently cropped; no background or neighboring object is included.
const sheets=[
 ['daily',[
  ['openbook','ספר לימוד פתוח על מעמד עץ',[1,9,48,37]],['olive','עץ זית בעציץ אבן',[57,0,34,50]],
  ['charity','קופת צדקה כסף מלוטש',[11,50,28,47]],['book','ספר עור בורדו מוזהב',[60,50,30,46]],
 ]],
 ['salon',[
  ['ivory','שולחן שבת פנינה ערוך עם כיסאות',[0,3,51,42]],['walnut','שולחן שבת אגוז ערוך עם כיסאות',[53,3,46.5,43]],
  ['chair','כורסאת בוקלה בהירה',[5,52.5,42,44]],['pedestal','פרחים וכלי כסף על עמוד אבן',[57,46,35,52]],
 ]],
 ['shavuot',[
  ['wheat','אלומת חיטה ריאליסטית',[4,0,44,55.5]],['flowers','פרחים לבנים באגרטל כסף',[49,0,51,56.5]],
  ['basket','סל ביכורים ריאליסטי',[0,56.5,53,43.5]],['cake','פרוסת עוגת גבינה',[56,62,42,35]],
 ]],
 ['pesach',[
  ['matzah','מצה שמורה ריאליסטית',[3,1,44,44]],['cover','כיסוי מצות רקום',[50,5,49,39]],
  ['haggadah','הגדה בכריכת שנהב',[7,45,39,53]],['cup','גביע ליל הסדר',[62,47,27,51]],
 ]],
 ['challot',[
  ['sesame','חלת שומשום חגיגית',[8,10,34,33]],['round','חלה עגולה קלועה',[61,11,32,31]],
  ['poppy','חלת פרג קלועה',[9,58,37,35]],['crown','חלת כתר חגיגית',[60,60,34,31]],
 ]],
 ['hanukkahfood',[
  ['jam','סופגניית ריבה נפרדת',[3,5,46,42]],['pistachio','סופגניית פיסטוק נפרדת',[52,3,46,44]],
  ['chocolate','סופגניית שוקולד נפרדת',[2,53,47,42]],['latke','לביבת תפוחי אדמה פריכה',[50,50,49,47]],
 ]],
 ['shabbat',[
  ['candle','פמוט כסף יחיד',[14,0,17,49]],['challah','חלה קלועה נפרדת',[50,9,48,35]],
  ['cup','גביע כסף ללא מגש',[11,53,23,44]],['tray','מגש כסף ריק',[47,59,52,33]],
 ]],
 ['sukkot',[
  ['etrog','אתרוג ריאליסטי נפרד',[11,3,28,44]],['lulav','לולב נפרד',[71,0,8,50]],
  ['myrtle','הדסים נפרדים',[10,51,30,48]],['willow','ערבות נפרדות',[63,51,27,48]],
 ]],
 ['roshhashanah',[
  ['shofar','שופר איל ריאליסטי',[2,8,50,36]],['pomegranate','רימון ריאליסטי נפרד',[58,6,40,40]],
  ['honey','צנצנת דבש נפרדת',[10,58,33,36]],['dipper','מקל דבש נפרד',[59,55,39,41]],
 ]],
 ['torah',[
  ['book','ספר עור נפרד',[10,3,32,44]],['scroll','ספר תורה במעיל ללא כתר',[65,1,22,48]],
  ['crown','כתר תורה כסף נפרד',[5,52,41,45]],['pointer','אצבע כסף לקריאת התורה',[54,53,43,44]],
 ]],
] as const;
export const SEPARATE_PARTS:(SavedElementSet&{category:string})[]=sheets.flatMap(([sheet,items])=>items.map(([key,name,c])=>{
 // Fit within a 24%-wide, 50%-high box while preserving shape on a 16:9 board.
 const width=Math.min(24,50*9/16*c[2]/c[3]);
 return {id:`ready_separate_${sheet}_${key}`,name,category:'ריאליסטיים',elements:[{
  ...newElement('image'),id:`part_separate_${sheet}_${key}`,name,
  image:`/new-shul-assets/separate-${sheet}.png`,crop:{x:c[0],y:c[1],width:c[2],height:c[3]},
  x:38,y:25,width,height:width*16/9*c[3]/c[2],
 }]};
}));
