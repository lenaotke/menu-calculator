'use strict';
// Календарь и подтверждённая запись напрямую через Google Apps Script.
const settings={preview:false,googleUrl:'https://script.google.com/macros/s/AKfycbxMoesS4-CwKj8wS0JroF4Vbd_ofLt2m9RRBLBn0y2_E1GPuTbCaLkhP7qXCNbnwh9iOw/exec'};
function newRequestId(){if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');}
const meals=['Завтрак 1','Завтрак 2','Обед','Полдник'];
const $=id=>document.getElementById(id);
const groups=[1,2,3,4,7,8,9,10].map(n=>'Группа '+n);
const sessionDrafts=new Map();
let connected=false,connectionError='',selectedDay='';
let mode=new URLSearchParams(location.search).get('form')==='afternoon'?'afternoon':'morning',calendar=null,pending=null;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function localCalendar(){
 const off=new Set(['2026-11-04','2026-12-31','2027-01-01','2027-01-04','2027-01-05','2027-01-06','2027-01-07','2027-01-08','2027-02-22','2027-02-23','2027-03-08','2027-05-03','2027-05-10','2027-06-14','2027-11-04','2027-11-05','2027-12-31','2028-01-01','2028-01-03','2028-01-04','2028-01-05','2028-01-06','2028-01-07']);
 const list=[];for(let d=new Date('2026-11-01T12:00:00Z');d<=new Date('2028-01-11T12:00:00Z');d.setUTCDate(d.getUTCDate()+1)){const k=d.toISOString().slice(0,10);if(k==='2027-02-20'||(![0,6].includes(d.getUTCDay())&&!off.has(k)))list.push(k);}
 const index=list.indexOf(today),anchor=index>=0?index:list.findIndex(d=>d>today);return {today,working:index>=0,next:anchor>=0?list[anchor+2]||null:null};
}
function dateLabel(key){return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'long',year:'numeric',weekday:'long'}).format(new Date(key+'T12:00:00Z'));}
function expectedHeading(key){const d=new Date(key+'T12:00:00Z'),week=['воскресенье','понедельник','вторник','среду','четверг','пятницу','субботу'][d.getUTCDay()];return 'Сколько детей ожидаем на '+week+', '+new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'long',year:'numeric'}).format(d)+'?';}
function draftKey(){return 'meal734:draft:'+calendar.today+':'+mode+':'+$('group').value;}
function saveDraft(){if(!calendar)return;const v={};document.querySelectorAll('.meal-row input').forEach(el=>v[el.id]=el.value);sessionDrafts.set(draftKey(),v);}
function loadDraft(){const v=sessionDrafts.get(draftKey())||{};document.querySelectorAll('.meal-row input').forEach(el=>el.value=v[el.id]??'');}
function field(index,kind){const row=document.createElement('div');row.className='meal-row';const id=kind+'-'+index;row.innerHTML=`<label for="${id}">${meals[index]} <span class="required">*</span></label><div class="input-wrap"><input id="${id}" name="${id}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" placeholder="—" required aria-label="${meals[index]} — ${kind==='fact'?'получили сегодня':'ожидаем на дату заявки'}" aria-describedby="${kind==='fact'?'factHelp':'nextLabel'}"><span>детей</span></div>`;row.querySelector('input').addEventListener('input',e=>{e.target.removeAttribute('aria-invalid');saveDraft();});return row;}
function render(){
 document.title=(mode==='morning'?'Утренняя заявка':'Послеобеденная заявка')+' · сад №734';
 $('reviewButton').textContent=mode==='morning'?'Отправить утреннюю заявку':'Отправить послеобеденную заявку';
 document.body.classList.toggle('afternoon',mode==='afternoon');document.querySelector('meta[name="theme-color"]').content=mode==='morning'?'#285b4b':'#964e36';
 for(const name of ['morning','afternoon']){$(name+'Tab').setAttribute('aria-selected',String(mode===name));$(name+'Tab').tabIndex=mode===name?0:-1;}
 $('requestPanel').setAttribute('aria-labelledby',mode+'Tab');$('heroImage').src='assets/'+mode+'.webp';$('heroImage').alt=mode==='morning'?'Повар разливает суп довольным детям':'Повар угощает детей свежими булочками';
 $('factHeading').textContent=mode==='morning'?'Сколько детей сегодня присутствовало по факту на завтраке 1?':'Сколько детей присутствовало сегодня по факту?';$('factHelp').hidden=mode==='morning';$('factHelp').textContent=mode==='morning'?'':'Сколько детей присутствовало на каждом из этих приёмов пищи?';
 $('factFields').replaceChildren(...(mode==='morning'?[0]:[1,2,3]).map(i=>field(i,'fact')));
 $('expectedSection').hidden=mode!=='morning';$('expectedFields').replaceChildren(...(mode==='morning'?meals.map((_,i)=>field(i,'expected')):[]));
 $('dateChoiceBox').hidden=!(calendar.dateChoices&&calendar.dateChoices.length);$('dateCaption').textContent=selectedDay?'Дата заявки':'Сегодня, по Москве';
 const choices=[...new Set([calendar.realToday||today,...(calendar.dateChoices||[])])];$('requestDate').replaceChildren(...choices.map(key=>{const option=document.createElement('option');option.value=key;option.textContent=dateLabel(key);return option;}));$('requestDate').value=calendar.today;
 $('expectedHeading').textContent=calendar.next?expectedHeading(calendar.next):'Сколько детей ожидаем на третий рабочий день?';$('todayLabel').textContent=dateLabel(calendar.today);$('nextLabel').textContent=calendar.next?dateLabel(calendar.next):'Нужная дата пока недоступна в календаре';
 const blocked=!connected||!calendar.working||(mode==='morning'&&!calendar.next);$('reviewButton').disabled=blocked;$('dayWarning').hidden=!blocked;
 $('dayWarning').classList.toggle('connecting',!connected&&!connectionError);$('dayWarning').textContent=!connected?(connectionError||'Подключение к заявке…'):!calendar.working?'Сегодня нет рабочего дня в календаре сада. Приём заявок откроется в ближайший рабочий день.':'Для утренней заявки пока нет даты третьего рабочего дня. Обратитесь к ответственному за питание.';
 $('formError').hidden=true;loadDraft();
}
function switchMode(value){if(mode===value)return;saveDraft();mode=value;pending=null;const url=new URL(location.href);url.searchParams.delete('form');history.replaceState(null,'',url);render();$('mealForm').hidden=false;$('receipt').hidden=true;}
document.querySelectorAll('[data-mode]').forEach(btn=>{btn.addEventListener('click',()=>switchMode(btn.dataset.mode));btn.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();switchMode(mode==='morning'?'afternoon':'morning');$(mode+'Tab').focus();}});});
$('group').addEventListener('change',()=>{$('group').removeAttribute('aria-invalid');loadDraft();});
function reviewBlock(title,values){const box=document.createElement('div');box.className='review-block';const h=document.createElement('h3');h.textContent=title;box.append(h);values.forEach(([name,value])=>{const row=document.createElement('div');row.className='review-line';const label=document.createElement('span');label.textContent=name;const number=document.createElement('strong');number.textContent=value+' детей';row.append(label,number);box.append(row);});return box;}
$('mealForm').addEventListener('submit',e=>{e.preventDefault();pending=null;const errors=[];let first=null;if(!groups.includes($('group').value)){$('group').setAttribute('aria-invalid','true');errors.push('Заполните все поля.');first=$('group');}document.querySelectorAll('.meal-row input').forEach(el=>{const valid=/^(0|[1-9]\d{0,2})$/.test(el.value);el.setAttribute('aria-invalid',String(!valid));if(!valid){errors.push(el.value.trim()===''?'Заполните все поля.':'Укажите целые числа от 0 до 999.');first??=el;}});if(errors.length){$('formError').textContent=[...new Set(errors)].join(' ');$('formError').hidden=false;first.focus({preventScroll:true});$('formError').scrollIntoView({block:'center',behavior:'smooth'});return;}
 if(!connected||!calendar.working||(mode==='morning'&&!calendar.next))return;
 $('formError').hidden=true;pending={id:newRequestId(),mode,group:$('group').value,day:calendar.today,expectedDay:mode==='morning'?calendar.next:null,fact:meals.map((_,i)=>$('fact-'+i)?Number($('fact-'+i).value):null),expected:mode==='morning'?meals.map((_,i)=>Number($('expected-'+i).value)):[]};
 $('reviewGroup').textContent=pending.group+' · '+(mode==='morning'?'Утренняя заявка':'После обеда');$('reviewDetails').replaceChildren(reviewBlock('Факт · '+dateLabel(calendar.today),meals.map((name,i)=>[name,pending.fact[i]]).filter((_,i)=>pending.fact[i]!==null)));
 if(mode==='morning')$('reviewDetails').append(reviewBlock('Ожидаем · '+dateLabel(calendar.next),meals.map((name,i)=>[name,pending.expected[i]])));
 $('sendError').hidden=true;$('reviewDialog').showModal();
});
$('backButton').addEventListener('click',()=>$('reviewDialog').close());
$('confirmButton').addEventListener('click',async()=>{if(!pending)return;const button=$('confirmButton');button.disabled=true;button.textContent='Отправляем…';try{
 if(!settings.preview){const result=await sendToGoogle(pending);if(result.status!=='accepted')throw Error(result.message||'Не удалось подтвердить запись. Проверьте подключение и повторите отправку.');}
 $('receipt').dataset.requestId=pending.id;$('reviewDialog').close();$('mealForm').hidden=true;$('receipt').hidden=false;$('receiptText').textContent=settings.preview?'Проверка прошла успешно. Это предпросмотр: данные в Google Таблицу не отправлялись.':pending.group+' · Заявка записана в таблицу. Спасибо за заботу о детях!';$('receipt').focus();$('receipt').scrollIntoView({block:'center'});
 }catch(error){$('sendError').textContent=error.message;$('sendError').hidden=false;}finally{button.disabled=false;button.textContent='Отправить заявку';}});
$('anotherButton').addEventListener('click',()=>{$('receipt').hidden=true;$('mealForm').hidden=false;$('group').focus();});
async function readGoogleData(params={}){
 const url=new URL(settings.googleUrl);for(const [k,v]of Object.entries(params))url.searchParams.set(k,v);url.searchParams.set('_r',newRequestId());
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
 try{const response=await fetch(url,{credentials:'omit',cache:'no-store',signal:controller.signal});if(!response.ok)throw Error('connection');const data=await response.json();if(!data||data.status==='error')throw Error(data?.message||'connection');return data;}
 catch{return new Promise((resolve,reject)=>{
  const callback='meal734_'+newRequestId().replace(/-/g,''),script=document.createElement('script');let wait;
  const clean=()=>{clearTimeout(wait);script.remove();delete window[callback];};
  window[callback]=data=>{clean();if(data&&data.status!=='error')resolve(data);else reject(Error('Сервер не подтвердил подключение.'));};
  script.crossOrigin='anonymous';script.onerror=()=>{clean();reject(Error('Не удалось подключиться к таблице. Введённые числа останутся на странице. Нажмите «Повторить подключение».'));};
  wait=setTimeout(()=>{clean();reject(Error('Таблица не отвечает. Нажмите «Повторить подключение».'));},9000);
  url.searchParams.set('callback',callback);script.src=url.toString();document.head.append(script);
 });}finally{clearTimeout(timer);}
}
async function readGoogleCalendar(){const data=await readGoogleData(selectedDay?{requestedDay:selectedDay}:{});if(!/^\d{4}-\d{2}-\d{2}$/.test(data.today)||typeof data.working!=='boolean')throw Error('Сервер не подтвердил рабочие даты.');return data;}
async function sendToGoogle(payload){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
 try{await fetch(settings.googleUrl,{method:'POST',mode:'no-cors',credentials:'omit',body:new URLSearchParams({transport:'browser',origin:location.origin,request:JSON.stringify(payload)}),signal:controller.signal});}
 catch{/* Запрос мог записаться до обрыва связи: проверяем подтверждение по тому же идентификатору. */}
 finally{clearTimeout(timer);}
 const until=Date.now()+30000;
 do{try{const result=await readGoogleData({action:'receipt',id:payload.id});if(result.status==='accepted'&&result.id===payload.id)return result;}catch{}await new Promise(resolve=>setTimeout(resolve,1200));}while(Date.now()<until);
 throw Error('Подтверждение записи не получено. Не закрывайте страницу и повторите отправку: дублирование этой заявки исключено.');
}
async function init(){
 connectionError='';calendar=localCalendar();connected=settings.preview;render();
 if(settings.preview)return;
 try{const serverCalendar=await readGoogleCalendar();saveDraft();calendar=serverCalendar;connected=true;render();$('retryConnection').hidden=true;}
 catch(error){connected=false;connectionError='Не удалось открыть заявку. Проверьте интернет и нажмите «Повторить подключение».';$('reviewButton').disabled=true;$('dayWarning').hidden=false;$('dayWarning').classList.remove('connecting');$('dayWarning').textContent=connectionError;$('retryConnection').hidden=false;}
}
$('requestDate').addEventListener('change',async()=>{saveDraft();selectedDay=$('requestDate').value;pending=null;connected=false;render();try{calendar=await readGoogleCalendar();connected=true;connectionError='';render();}catch{connectionError='Не удалось изменить дату. Нажмите «Повторить подключение».';render();$('retryConnection').hidden=false;}});
$('retryConnection').addEventListener('click',()=>{saveDraft();init();});
$('group').value='';
window.addEventListener('pageshow',event=>{if(event.persisted){sessionDrafts.clear();pending=null;$('group').value='';$('mealForm').hidden=false;$('receipt').hidden=true;render();}});
init();

async function refreshOnDateChange(){
 const actual=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(!calendar||!connected||actual===(calendar.realToday||calendar.today)||$('confirmButton').disabled)return;
 saveDraft();selectedDay='';pending=null;$('reviewDialog').close();connected=false;render();
 try{calendar=await readGoogleCalendar();connected=true;connectionError='';render();}catch{connectionError='Дата изменилась. Нажмите «Повторить подключение».';render();$('retryConnection').hidden=false;}
}
setInterval(refreshOnDateChange,15000);window.addEventListener('focus',refreshOnDateChange);
