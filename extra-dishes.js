'use strict';
// Дополнительные строки используют исходные recalcMath и exportToWord.
(()=>{
 const meals=['Завтрак 1','Завтрак 2','Обед','Полдник'];
 const catalog=new Map(),days=new Map();
 const key=d=>JSON.stringify([d.dish,d.menuNorm??d.norm,d.tk||'',!!d.default_strict]);
 for(const [day,list] of Object.entries(menuDb))for(const dish of list){const k=key(dish);if(!catalog.has(k))catalog.set(k,{...dish,days:[]});catalog.get(k).days.push(day);}
 // Отдельный каталог не меняет состав и привязки исходного меню по дням.
 const additionalCatalog=[
  {dish:'Напиток из цитрусовых',norm:200,tk:'160234',default_strict:false},
  {dish:'Салат из сборных овощей',norm:65,tk:'100509',default_strict:false},
  {dish:'Биточки рубленные куриные',norm:70,tk:'120611',default_strict:true},
  {dish:'Рагу из овощей',norm:150,tk:'130203',default_strict:false},
  {dish:'Салат из отварного картофеля, свежего огурца и зеленого салата',norm:65,tk:'100544',default_strict:false}
 ];
 for(const dish of additionalCatalog){const k=key(dish);if(!catalog.has(k))catalog.set(k,{...dish,strict:false,days:[]});}
 const entries=[...catalog.entries()].map(([id,d])=>({id,...d}));
 const panel=document.createElement('section');panel.id='extraDishPanel';panel.className='extra-dish-panel';
 panel.innerHTML='<h2>Добавить блюдо из всего меню</h2><p>Для замены снимите галочку у исходного блюда и выберите другое. Для дополнения оставьте оба. Количество порций берётся из выбранного приёма пищи.</p><div class="extra-controls"><label>Приём пищи<select id="extraMeal"></select></label><label>Поиск блюда или номера ТК<input id="extraSearch" type="search" placeholder="Например: макароны, яйцо или номер ТК" autocomplete="off"></label></div><div id="extraResults" aria-live="polite"></div><p id="extraNotice" role="status"></p>';
 document.getElementById('toolbar').before(panel);
 const manual=document.createElement('details');manual.className='manual-dish';
 manual.innerHTML='<summary>Ввести своё блюдо, которого нет в меню</summary><p>Блюдо добавится на выбранную дату. Для замены снимите галочку у исходного блюда.</p><div class="extra-controls"><label>Приём пищи<select id="manualMeal"><option value="">Выберите приём пищи</option></select></label><label>Название блюда<input id="manualName" type="text" maxlength="200" placeholder="Введите название" autocomplete="off"></label><label>Норма на одного ребёнка, г/мл<input id="manualNorm" type="text" inputmode="decimal" placeholder="Например: 180" autocomplete="off"></label></div><label class="manual-strict"><input id="manualStrict" type="checkbox"> Не делить на добавку (штучное блюдо)</label><button id="manualAdd" type="button">Добавить блюдо в распределение</button><p id="manualStatus" role="status"></p>';
 panel.append(manual);meals.forEach(m=>manual.querySelector('#manualMeal').add(new Option(m,m)));
 function mealCounts(meal){
  const ref=currentDayData.find(d=>d.meal===meal);if(ref)return ref;
  const select=document.getElementById('groupSelect'),name=select.options[select.selectedIndex].text.trim();
  let source=fetchedDataCache?(select.value==='all'?fetchedDataCache.totals:fetchedDataCache.groups?.[name]):null;
  if(!source&&fetchedDataCache?.groups&&select.value!=='all'){const num=name.match(/\d+/)?.[0];source=Object.entries(fetchedDataCache.groups).find(([k])=>k.match(/\d+/)?.[0]===num)?.[1];}
  const data=source?.[meal];return {customOrdered:data?.ordered??'',customAttended:data?.attended??''};
 }
 function parseNorm(value){const s=value.trim().replace(',','.');return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)&&Number.isFinite(Number(s))&&Number(s)>0?Number(s):null;}
 function installNorm(item,row){
  if(item.menuNorm===undefined)item.menuNorm=item.norm;
  const cell=row.cells[3];if(cell.querySelector('.norm-editor'))return;
  cell.replaceChildren();const input=document.createElement('input');input.className='norm-editor row-input';input.type='text';input.inputMode='decimal';input.value=String(item.norm);input.setAttribute('aria-label','Норма, г/мл: '+item.dish);
  const reset=document.createElement('button');reset.type='button';reset.className='norm-reset';reset.textContent='Вернуть '+item.menuNorm;reset.title='Вернуть исходную норму';reset.hidden=item.norm===item.menuNorm;
  input.oninput=()=>{const value=parseNorm(input.value);input.setCustomValidity(value===null?'Укажите норму больше нуля в граммах или миллилитрах.':'');input.setAttribute('aria-invalid',String(value===null));if(value!==null){item.norm=value;reset.hidden=value===item.menuNorm;recalcMath();remember();}};
  reset.onclick=()=>{item.norm=item.menuNorm;input.value=String(item.norm);input.setCustomValidity('');input.setAttribute('aria-invalid','false');reset.hidden=true;recalcMath();remember();};cell.append(input,reset);
 }
 manual.querySelector('#manualAdd').onclick=()=>{
  const meal=manual.querySelector('#manualMeal').value,name=manual.querySelector('#manualName').value.trim(),norm=parseNorm(manual.querySelector('#manualNorm').value),status=manual.querySelector('#manualStatus');
  if(!meal||!name||norm===null){status.textContent='Выберите приём пищи, введите название и норму больше нуля.';return;}
  const existing=currentDayData.find(d=>d.meal===meal&&normal(d.dish)===normal(name));
  if(existing){status.textContent='Такое блюдо уже есть в этом приёме пищи. Измените его норму в таблице.';return;}
  const ref=mealCounts(meal),strict=manual.querySelector('#manualStrict').checked;
  const item={dish:name,meal,norm,menuNorm:norm,tk:'',strict,default_strict:strict,manualDish:true,extraDish:true,selected:true,customOrdered:ref?ref.customOrdered:'',customAttended:ref?ref.customAttended:'',mealClass:meals.indexOf(meal)%2?'meal-odd':'meal-even'};
  currentDayData.push(item);appendRow(item,currentDayData.length-1);sortRows();syncChecks();recalcMath();remember();status.textContent='Добавлено: '+name+'. Блюдо включено в распределение и Word.';manual.querySelector('#manualName').value='';manual.querySelector('#manualNorm').value='';manual.querySelector('#manualStrict').checked=false;
 };
 const mealSelect=panel.querySelector('#extraMeal'),search=panel.querySelector('#extraSearch'),results=panel.querySelector('#extraResults');
 mealSelect.add(new Option('Выберите приём пищи',''));meals.forEach(m=>mealSelect.add(new Option(m,m)));mealSelect.value='';search.value='';mealSelect.autocomplete='off';
 const sortSelect=document.createElement('select');sortSelect.id='mealSort';sortSelect.setAttribute('aria-label','Порядок приёмов пищи');
 for(const [label,value] of [['Завтрак 1 → Полдник','asc'],['Полдник → Завтрак 1','desc']])sortSelect.add(new Option(label,value));
 const mealHeader=document.querySelector('#resultsTable thead th:nth-child(2)');mealHeader.append(document.createElement('br'),sortSelect);
 function sortRows(){
  const rows=currentDayData.map((item,i)=>({item,row:document.getElementById('row-'+i),i}));
  rows.sort((a,b)=>(meals.indexOf(a.item.meal)-meals.indexOf(b.item.meal))*(sortSelect.value==='desc'?-1:1)||a.i-b.i);
  currentDayData.splice(0,currentDayData.length,...rows.map(x=>x.item));
  rows.forEach(({item,row},i)=>{if(!row)return;row.id='row-'+i;
   for(const node of row.querySelectorAll('[id]'))node.id=node.id.replace(/-\d+$/,'-'+i);
   for(const [prefix,field,type] of [['check','selected','change'],['ord','customOrdered','input'],['att','customAttended','input'],['strict','strict','change']]){const input=row.querySelector('#'+prefix+'-'+i);if(input){input.removeAttribute('on'+type);input['on'+type]=()=>updateRowState(i,field,input.type==='checkbox'?input.checked:input.value);}}
   document.getElementById('tableBody').append(row);
   installNorm(item,row);
  });
 }
 sortSelect.addEventListener('change',()=>{sortRows();syncChecks();recalcMath();remember();});
 const normal=s=>s.toLocaleLowerCase('ru').replace(/ё/g,'е');
 let activeDate='';
 function remember(){if(activeDate)days.set(activeDate,currentDayData.map(d=>({...d})));}
 function syncChecks(){currentDayData.forEach((d,i)=>{const c=document.getElementById('check-'+i);if(c)c.checked=d.selected;});const all=document.getElementById('selectAll');all.checked=currentDayData.length>0&&currentDayData.every(d=>d.selected);all.indeterminate=currentDayData.some(d=>d.selected)&&!all.checked;}
 function appendRow(item,index){
  const tr=document.createElement('tr');tr.id='row-'+index;tr.className=item.mealClass;
  tr.innerHTML='<td><input type="checkbox"></td><td></td><td></td><td style="text-align:center;font-weight:bold"></td><td style="text-align:center;background:#e8f4fc"><input type="number" class="row-input" min="0" placeholder="Авто"></td><td style="text-align:center;background:#fcf3cf"><input type="number" class="row-input" min="0" placeholder="Авто"></td><td style="text-align:center;font-weight:bold"></td><td class="pieces-highlight"></td><td style="text-align:center"></td><td class="highlight"></td><td></td>';
  const cells=tr.cells,check=cells[0].firstChild;check.id='check-'+index;check.checked=item.selected;check.setAttribute('aria-label','Включить '+item.dish);check.onchange=()=>updateRowState(index,'selected',check.checked);
  cells[1].textContent=item.meal;cells[2].textContent=item.dish;
  const badge=document.createElement('small');badge.textContent=item.manualDish?'Добавлено вручную':'Добавлено из общего меню';badge.className='extra-badge';cells[2].append(document.createElement('br'),badge);
  if(item.default_strict){const label=document.createElement('label');label.className='strict-toggle';const c=document.createElement('input');c.type='checkbox';c.checked=item.strict;c.id='strict-'+index;c.onchange=()=>updateRowState(index,'strict',c.checked);label.append(c,'Не делить');cells[2].append(document.createElement('br'),label);}
  cells[3].textContent=item.norm;
  for(const [c,p,f] of [[4,'ord','customOrdered'],[5,'att','customAttended']]){const input=cells[c].firstChild;input.id=p+'-'+index;input.value=item[f];input.oninput=()=>updateRowState(index,f,input.value);}
  ['extra','pieces','add','final'].forEach((n,j)=>cells[j+6].id=n+'-'+index);
  if(item.tk){const a=document.createElement('a');a.className='tk-link';a.textContent=item.tk;a.onclick=()=>tkClick(item.tk);cells[10].append(a);}
  document.getElementById('tableBody').append(tr);
 }
 function findRow(entry){return currentDayData.findIndex(d=>d.meal===mealSelect.value&&key(d)===entry.id);}
 function choose(entry,checked){
  if(!mealSelect.value)return;
  let i=findRow(entry);
  if(i<0){const ref=mealCounts(mealSelect.value);const item={...entry,meal:mealSelect.value,extraDish:true,selected:checked,customOrdered:ref?ref.customOrdered:'',customAttended:ref?ref.customAttended:'',mealClass:meals.indexOf(mealSelect.value)%2?'meal-odd':'meal-even'};delete item.days;delete item.id;i=currentDayData.length;currentDayData.push(item);appendRow(item,i);}
  currentDayData[i].selected=checked;sortRows();syncChecks();recalcMath();remember();showResults();
  panel.querySelector('#extraNotice').textContent=checked?'Блюдо включено в таблицу и документ Word: '+entry.dish:'Блюдо исключено из документа: '+entry.dish;
 }
 function showResults(){
  panel.hidden=!currentDayData.length;results.replaceChildren();if(panel.hidden)return;
  const words=normal(search.value.trim()).split(/\s+/).filter(Boolean);
  if(!words.length){results.textContent='Введите название блюда. Поиск работает по всем дням меню.';return;}
  const found=entries.filter(d=>words.every(w=>normal(d.dish+' '+(d.tk||'')).includes(w)));
  if(!found.length){results.textContent='Блюд с таким названием в меню не найдено.';return;}
  for(const d of found){const label=document.createElement('label');label.className='extra-result';const c=document.createElement('input');c.type='checkbox';c.disabled=!mealSelect.value;const i=findRow(d);c.checked=i>=0&&currentDayData[i].selected;c.onchange=()=>choose(d,c.checked);const text=document.createElement('span'),name=document.createElement('strong'),details=document.createElement('small');name.textContent=d.dish;details.textContent='Норма: '+d.norm+' г/мл · ТК: '+(d.tk||'не указана')+(d.days.length?' · Дни исходного меню: '+[...new Set(d.days)].join(', '):' · Дополнительный каталог')+' · Можно добавить в любой день';text.append(name,details);label.append(c,text);results.append(label);}
 }
 const originalLoad=loadDayData;
 loadDayData=function(){remember();activeDate=document.getElementById('dateSelect').value;originalLoad();const saved=days.get(activeDate);if(saved&&currentDayData.length){const extras=saved.filter(d=>d.extraDish);currentDayData.forEach((d,i)=>{const old=saved.find(x=>!x.extraDish&&x.meal===d.meal&&key(x)===key(d));if(old){d.selected=old.selected;d.menuNorm=old.menuNorm??d.norm;d.norm=old.norm;}});extras.forEach(d=>{currentDayData.push({...d});appendRow(currentDayData.at(-1),currentDayData.length-1);});syncChecks();recalcMath();}showResults();};
 const originalApply=applyFetchedData;
 applyFetchedData=function(){const selected=currentDayData.map(d=>d.selected);originalApply();currentDayData.forEach((d,i)=>d.selected=selected[i]);syncChecks();recalcMath();remember();showResults();};
 const originalUpdate=updateRowState;
 updateRowState=function(index,field,value){const selected=currentDayData.map(d=>d.selected);if(field==='selected'){currentDayData[index].selected=value;syncChecks();recalcMath();}else{originalUpdate(index,field,value);if(field==='customAttended'){currentDayData.forEach((d,i)=>d.selected=selected[i]);syncChecks();recalcMath();}}remember();showResults();};
 const originalToggle=toggleAll;toggleAll=function(value){originalToggle(value);remember();showResults();};
 const originalExport=exportToWord;exportToWord=function(){for(const input of document.querySelectorAll('.norm-editor')){const row=input.closest('tr'),index=Number(row.id.slice(4));if(currentDayData[index]?.selected&&!input.checkValidity()){input.reportValidity();input.focus();return;}}const source=currentDayData;try{currentDayData=source.map(d=>d.manualDish?{...d,dish:d.dish.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}:d);originalExport();}finally{currentDayData=source;}};
 search.addEventListener('input',showResults);mealSelect.addEventListener('change',()=>{showResults();panel.querySelector('#extraNotice').textContent='';});
 const loadWithSort=loadDayData;loadDayData=function(){loadWithSort();sortRows();syncChecks();recalcMath();};
 window.addEventListener('pageshow',event=>{if(event.persisted){search.value='';mealSelect.value='';showResults();}});
 window.onload=loadDayData;
})();

