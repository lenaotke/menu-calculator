'use strict';
// Предпросмотр не отправляет данные. Публикация и сервер подключаются после согласования.
const settings={preview:false,apiBase:'https://sad734-meal-requests-api.lenaotke.chatgpt.site'};
const meals=['Завтрак 1','Завтрак 2','Обед','Полдник'];
const $=id=>document.getElementById(id);
const groups=[1,2,3,4,7,8,9,10].map(n=>'Группа '+n);
const storage={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
const sessionDrafts=new Map();
let mode=new URLSearchParams(location.search).get('form')==='afternoon'?'afternoon':'morning',calendar=null,pending=null;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function localCalendar(){
 const off=new Set(['2026-11-04','2026-12-31','2027-01-01','2027-01-04','2027-01-05','2027-01-06','2027-01-07','2027-01-08','2027-02-22','2027-02-23','2027-03-08','2027-05-03','2027-05-10','2027-06-14','2027-11-04','2027-11-05','2027-12-31','2028-01-01','2028-01-03','2028-01-04','2028-01-05','2028-01-06','2028-01-07']);
 const list=[];for(let d=new Date('2026-11-01T12:00:00Z');d<=new Date('2028-01-10T12:00:00Z');d.setUTCDate(d.getUTCDate()+1)){const k=d.toISOString().slice(0,10);if(k==='2027-02-20'||(![0,6].includes(d.getUTCDay())&&!off.has(k)))list.push(k);}
 const index=list.indexOf(today);return {today,working:index>=0,next:index>=0?list[index+1]||null:null};
}
function dateLabel(key){return new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'numeric',month:'long',year:'numeric',weekday:'long'}).format(new Date(key+'T12:00:00Z'));}
function draftKey(){return 'meal734:draft:'+calendar.today+':'+mode+':'+$('group').value;}
function saveDraft(){if(!calendar)return;const v={};document.querySelectorAll('.meal-row input').forEach(el=>v[el.id]=el.value);sessionDrafts.set(draftKey(),v);}
function loadDraft(){const v=sessionDrafts.get(draftKey())||{};document.querySelectorAll('.meal-row input').forEach(el=>el.value=v[el.id]??'');}
function field(index,kind){const row=document.createElement('div');row.className='meal-row';const id=kind+'-'+index;row.innerHTML=`<label for="${id}">${meals[index]} <span class="required">*</span></label><div class="input-wrap"><input id="${id}" name="${id}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" placeholder="—" required aria-label="${meals[index]} — ${kind==='fact'?'получили сегодня':'ожидаем на следующий рабочий день'}" aria-describedby="${kind==='fact'?'factHelp':'nextLabel'}"><span>детей</span></div>`;row.querySelector('input').addEventListener('input',e=>{e.target.removeAttribute('aria-invalid');saveDraft();});return row;}
function render(){
 document.title=(mode==='morning'?'Утренняя заявка':'Послеобеденная заявка')+' · сад №734';
 $('reviewButton').textContent=mode==='morning'?'Отправить утреннюю заявку':'Отправить послеобеденную заявку';
 document.body.classList.toggle('afternoon',mode==='afternoon');document.querySelector('meta[name="theme-color"]').content=mode==='morning'?'#285b4b':'#964e36';
 for(const name of ['morning','afternoon']){$(name+'Tab').setAttribute('aria-selected',String(mode===name));$(name+'Tab').tabIndex=mode===name?0:-1;}
 $('requestPanel').setAttribute('aria-labelledby',mode+'Tab');$('heroImage').src='assets/'+mode+'.webp';$('heroImage').alt=mode==='morning'?'Повар разливает суп довольным детям':'Повар угощает детей свежими булочками';
 $('factHeading').textContent=mode==='morning'?'Сколько детей сегодня присутствовало по факту на завтраке 1?':'Сколько детей присутствовало сегодня по факту?';$('factHelp').hidden=mode==='morning';$('factHelp').textContent=mode==='morning'?'':'Сколько детей присутствовало на каждом из этих приёмов пищи?';
 $('factFields').replaceChildren(...(mode==='morning'?[0]:[1,2,3]).map(i=>field(i,'fact')));
 $('expectedSection').hidden=mode!=='morning';$('expectedFields').replaceChildren(...(mode==='morning'?meals.map((_,i)=>field(i,'expected')):[]));
 $('todayLabel').textContent=dateLabel(calendar.today);$('nextLabel').textContent=calendar.next?dateLabel(calendar.next):'Следующая дата ещё не добавлена в календарь';
 const blocked=!calendar.working||(mode==='morning'&&!calendar.next);$('reviewButton').disabled=blocked;$('dayWarning').hidden=!blocked;
 $('dayWarning').textContent=!calendar.working?'Сегодня нет рабочего дня в календаре сада. Приём заявок откроется в ближайший рабочий день.':'Для утренней заявки пока нет следующей рабочей даты. Обратитесь к ответственному за питание.';
 $('formError').hidden=true;loadDraft();
}
function switchMode(value){if(mode===value)return;saveDraft();mode=value;pending=null;const url=new URL(location.href);url.searchParams.delete('form');history.replaceState(null,'',url);render();$('mealForm').hidden=false;$('receipt').hidden=true;}
document.querySelectorAll('[data-mode]').forEach(btn=>{btn.addEventListener('click',()=>switchMode(btn.dataset.mode));btn.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();switchMode(mode==='morning'?'afternoon':'morning');$(mode+'Tab').focus();}});});
$('group').addEventListener('change',()=>{storage.set('meal734:group',$('group').value);$('group').removeAttribute('aria-invalid');loadDraft();});
function reviewBlock(title,values){const box=document.createElement('div');box.className='review-block';const h=document.createElement('h3');h.textContent=title;box.append(h);values.forEach(([name,value])=>{const row=document.createElement('div');row.className='review-line';const label=document.createElement('span');label.textContent=name;const number=document.createElement('strong');number.textContent=value+' детей';row.append(label,number);box.append(row);});return box;}
$('mealForm').addEventListener('submit',e=>{e.preventDefault();const errors=[];let first=null;if(!groups.includes($('group').value)){$('group').setAttribute('aria-invalid','true');errors.push('Выберите вашу группу.');first=$('group');}document.querySelectorAll('.meal-row input').forEach(el=>{const valid=/^(0|[1-9]\d{0,2})$/.test(el.value);el.setAttribute('aria-invalid',String(!valid));if(!valid){errors.push('Заполните все количества целыми числами от 0 до 999.');first??=el;}});if(errors.length){$('formError').textContent=[...new Set(errors)].join(' ');$('formError').hidden=false;first.focus();return;}
 if(!calendar.working||(mode==='morning'&&!calendar.next))return;
 $('formError').hidden=true;pending={id:crypto.randomUUID(),mode,group:$('group').value,day:calendar.today,expectedDay:mode==='morning'?calendar.next:null,fact:meals.map((_,i)=>$('fact-'+i)?Number($('fact-'+i).value):null),expected:mode==='morning'?meals.map((_,i)=>Number($('expected-'+i).value)):[]};
 $('reviewGroup').textContent=pending.group+' · '+(mode==='morning'?'Утренняя заявка':'После обеда');$('reviewDetails').replaceChildren(reviewBlock('Сегодня · '+dateLabel(calendar.today),meals.map((name,i)=>[name,pending.fact[i]]).filter((_,i)=>pending.fact[i]!==null)));
 if(mode==='morning')$('reviewDetails').append(reviewBlock('Ожидаем · '+dateLabel(calendar.next),meals.map((name,i)=>[name,pending.expected[i]])));
 $('sendError').hidden=true;$('reviewDialog').showModal();
});
$('backButton').addEventListener('click',()=>$('reviewDialog').close());
$('confirmButton').addEventListener('click',async()=>{if(!pending)return;const button=$('confirmButton');button.disabled=true;button.textContent='Отправляем…';try{
 if(!settings.preview){if(!settings.apiBase)throw Error('Отправка пока не подключена.');const response=await fetch(settings.apiBase+'/requests',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending)});const result=await response.json();if(!response.ok||result.status!=='accepted')throw Error(result.message||'Не удалось подтвердить запись. Ваши цифры сохранены.');}
 $('receipt').dataset.requestId=pending.id;$('reviewDialog').close();$('mealForm').hidden=true;$('receipt').hidden=false;$('receiptText').textContent=settings.preview?'Проверка прошла успешно. Это предпросмотр: данные в Google Таблицу не отправлялись.':pending.group+' · Заявка записана в таблицу. Спасибо за заботу о детях!';$('receipt').focus();$('receipt').scrollIntoView({block:'center'});
 }catch(error){$('sendError').textContent=error.message;$('sendError').hidden=false;}finally{button.disabled=false;button.textContent='Отправить заявку';}});
$('anotherButton').addEventListener('click',()=>{$('receipt').hidden=true;$('mealForm').hidden=false;$('group').focus();});
async function init(){try{if(settings.preview)calendar=localCalendar();else{if(!settings.apiBase)throw Error('Подключение ещё не настроено.');const response=await fetch(settings.apiBase+'/calendar',{cache:'no-store'});if(!response.ok)throw Error('Не удалось загрузить рабочие даты. Попробуйте ещё раз.');calendar=await response.json();}const savedGroup=storage.get('meal734:group');if(groups.includes(savedGroup))$('group').value=savedGroup;render();}catch(e){$('todayLabel').textContent='Даты недоступны';$('reviewButton').disabled=true;$('dayWarning').hidden=false;$('dayWarning').textContent=e.message;}}
init();
