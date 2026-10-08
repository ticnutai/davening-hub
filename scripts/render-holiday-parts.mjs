// Original holiday vector illustrations; no text is baked into the PNGs.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:600,height:600},deviceScaleFactor:1});
 const line='fill="none" stroke="#c5a367" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"';
 const flame=(x,y)=>`<path d="M${x} ${y}Q${x-25} ${y-25} ${x} ${y-70}Q${x+25} ${y-25} ${x} ${y}Z" fill="#e6b653"/>`;
 const arts={
  shofar:`<path d="M75 155Q100 470 305 370Q420 305 475 100L550 165Q485 420 325 480Q70 540 45 170Z" fill="#b78b52" stroke="#765138" stroke-width="10"/><path d="M95 230Q125 438 300 393M330 350L373 382M375 290L420 322M415 225L460 252" fill="none" stroke="#e0bf83" stroke-width="12"/>`,
  honey:`<path d="M320 260H520V485Q420 535 320 485Z" fill="#d29d36" stroke="#956b27" stroke-width="8"/><ellipse cx="420" cy="260" rx="100" ry="30" fill="#f9db88"/><path d="M345 275L465 105" ${line}/><ellipse cx="471" cy="92" rx="35" ry="65" transform="rotate(35 471 92)" fill="#ab7e4b"/><path d="M145 280C20 200 15 445 150 500C290 445 280 200 155 280Z" fill="#982c38"/><path d="M153 280L171 214Q229 166 257 226Q200 257 171 238" fill="#67814a" stroke="#52673a" stroke-width="9"/>`,
  lulav:`<path d="M300 550V55Q345 220 318 530Z" fill="#788650" stroke="#455d35" stroke-width="8"/><path d="M300 535L130 210M300 535L470 180" ${line}/>${Array.from({length:6},(_,i)=>`<ellipse cx="${170+i*20}" cy="${240+i*45}" rx="22" ry="58" transform="rotate(-35 ${170+i*20} ${240+i*45})" fill="#66834b"/><ellipse cx="${445-i*22}" cy="${240+i*44}" rx="18" ry="62" transform="rotate(38 ${445-i*22} ${240+i*44})" fill="#82955f"/>`).join('')}<path d="M250 430H345M260 455H335" stroke="#d4b97c" stroke-width="16"/>`,
  etrog:`<path d="M285 110Q450 135 500 310Q550 480 330 520Q135 525 105 350Q80 175 250 135L250 80L278 65Z" fill="#eac645" stroke="#ac8c2d" stroke-width="10"/><path d="M180 210Q130 360 240 444M220 170Q180 300 225 360" fill="none" stroke="#fae586" stroke-width="10"/>`,
  sukkah:`<path d="M95 215H505V530H95Z" fill="#e7d5ad" stroke="#8a633d" stroke-width="18"/><path d="M65 210L115 125H485L535 210Z" fill="#6f834b"/>${[120,180,240,300,360,420,480].map(x=>`<path d="M${x} 135L${x-25} 207" stroke="#a5ae77" stroke-width="9"/>`).join('')}<path d="M225 530V290Q300 240 375 290V530Z" fill="#5b7354"/><path d="M120 230Q300 310 480 230" ${line}/>${[160,240,320,400].map((x,i)=>`<circle cx="${x}" cy="${260+(i%2)*15}" r="13" fill="${i%2?'#9f4f3f':'#c7a45c'}"/>`).join('')}`,
  matzah:`<path d="M90 100Q300 65 505 105L520 490Q310 530 80 490Z" fill="#dfbb76" stroke="#9f723e" stroke-width="10"/>${Array.from({length:9},(_,y)=>Array.from({length:9},(_,x)=>`<circle cx="${125+x*43}" cy="${140+y*39}" r="4" fill="#9b713e"/>`).join('')).join('')}`,
  seder:`<ellipse cx="300" cy="320" rx="255" ry="200" fill="#c4cbd0" stroke="#7c8b93" stroke-width="12"/><ellipse cx="300" cy="320" rx="225" ry="173" fill="none" stroke="#f3f0dc" stroke-width="8"/>${[0,1,2,3,4,5].map((i)=>{let a=i*Math.PI/3,x=300+155*Math.cos(a),y=320+112*Math.sin(a);return `<ellipse cx="${x}" cy="${y}" rx="53" ry="40" fill="#f0e8d4" stroke="#8c969e" stroke-width="5"/><ellipse cx="${x}" cy="${y}" rx="25" ry="17" fill="${['#74905f','#d3ba8b','#8f654a','#aeb175','#c8b084','#879a66'][i]}"/>`;}).join('')}`,
  chanukiah:`<path d="M300 475V220M210 525H390" ${line}/>${[100,155,210,265,335,390,445,500].map(x=>`<path d="M${x} 205V300Q${x} 435 300 450" ${line}/><rect x="${x-9}" y="145" width="18" height="65" fill="#efe2c6"/>${flame(x,135)}`).join('')}<rect x="291" y="65" width="18" height="120" fill="#efe2c6"/>${flame(300,60)}`,
  dreidel:`<path d="M280 70H320V195H280Z" fill="#a4733d"/><path d="M160 200L300 150L440 200V390L300 540L160 390Z" fill="#c39a56" stroke="#7e552d" stroke-width="10"/><path d="M300 150V540M160 200L300 250L440 200" fill="none" stroke="#ead098" stroke-width="8"/>`,
  megillah:`<path d="M130 165Q300 130 470 165V435Q300 470 130 435Z" fill="#f4dfae" stroke="#ad8248" stroke-width="10"/><path d="M115 100V500M485 100V500" ${line}/><path d="M175 220H425M175 275H425M175 330H425M175 385H340" stroke="#bfa375" stroke-width="5"/>`,
  hamentashen:`<path d="M300 75Q335 75 350 115L525 440Q540 480 490 495H110Q60 480 75 440L250 115Q265 75 300 75Z" fill="#c88e46" stroke="#8e5f2f" stroke-width="10"/><path d="M300 225L420 430H180Z" fill="#513329" stroke="#ecc386" stroke-width="22"/>`,
  wheat:`<path d="M300 550V110" ${line}/>${[0,1,2,3,4].map(i=>`<ellipse cx="265" cy="${155+i*66}" rx="28" ry="52" transform="rotate(-35 265 ${155+i*66})" fill="#d2ad62"/><ellipse cx="335" cy="${155+i*66}" rx="28" ry="52" transform="rotate(35 335 ${155+i*66})" fill="#b58e47"/>`).join('')}`,
  tablets:`<path d="M75 490V175Q75 55 290 125V490ZM310 490V125Q525 55 525 175V490Z" fill="#d7cab1" stroke="#9e885e" stroke-width="12"/>${[0,1,2,3,4].map(i=>`<path d="M125 ${205+i*50}H245M355 ${205+i*50}H475" stroke="#9e885e" stroke-width="7"/>`).join('')}`,
  challah:`<ellipse cx="300" cy="370" rx="245" ry="135" fill="#b18a4c"/>${[0,1,2,3,4].map(i=>`<ellipse cx="${140+i*78}" cy="${345+(i%2)*32}" rx="85" ry="67" transform="rotate(${i%2?35:-35} ${140+i*78} ${345+(i%2)*32})" fill="#d9ad61" stroke="#9b6b36" stroke-width="5"/>`).join('')}<path d="M65 520H535" ${line}/>`,
  havdalah:`<path d="M160 510L210 165M202 510L252 165" stroke="#b47c43" stroke-width="23"/><path d="M162 475L216 425M175 388L229 338M190 300L244 250" stroke="#efd5a0" stroke-width="15"/>${flame(235,151)}<path d="M350 325H495V490H350Z" fill="#abb8bf" stroke="#71838f" stroke-width="10"/><path d="M350 320L422 250L495 320M390 230H455" ${line}/>`,
  wreath:`<path d="M200 500Q30 300 205 85M400 500Q570 300 395 85" ${line}/>${[0,1,2,3,4,5].map(i=>`<ellipse cx="${155-Math.sin(i/5*Math.PI)*40}" cy="${140+i*58}" rx="26" ry="49" transform="rotate(-38 130 ${140+i*58})" fill="#738553"/><ellipse cx="${445+Math.sin(i/5*Math.PI)*40}" cy="${140+i*58}" rx="26" ry="49" transform="rotate(38 470 ${140+i*58})" fill="#8b9a69"/>`).join('')}<path d="M235 475L300 520L365 475" ${line}/>`
 };
 for(const [id,body] of Object.entries(arts)){
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">${body}</svg>`;
  await writeFile(`public/new-shul-assets/holiday-${id}.svg`,svg);
  await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`);
  await page.screenshot({path:`public/new-shul-assets/holiday-${id}.png`,omitBackground:true});
 }
 console.log('Generated',Object.keys(arts).length,'holiday parts');
}finally{await browser.close();}
