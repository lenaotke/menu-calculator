'use strict';
(()=>{
 const meals=['Завтрак 1','Завтрак 2','Обед','Полдник'];
 const months=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
 const button=document.createElement('button');button.id='exportCorrectionButton';button.type='button';button.className='btn';button.textContent='Скачать заявку-коррекцию · Word';document.getElementById('toolbar').append(button);
 const dialog=document.createElement('dialog');dialog.id='correctionExportDialog';dialog.innerHTML='<form><h2>Заявка-коррекция</h2><p id="correctionGroup"></p><p id="correctionServiceDate"></p><p id="correctionSignDate"></p><p>Количество из колонки «Приготовил повар». «+1» сохраняется в документе текстом, без сложения.</p><dl id="correctionCounts"></dl><p id="correctionStatus" role="status"></p><div class="act-actions"><button type="button" id="correctionCancel">Отмена</button><button type="submit" id="correctionDownload">Скачать Word (.docx)</button></div></form>';document.body.append(dialog);
 const status=dialog.querySelector('#correctionStatus'),download=dialog.querySelector('#correctionDownload');
 const esc=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const numericDate=iso=>iso.split('-').reverse().join('.');
 const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function collect(){
  const date=document.getElementById('dateSelect').value;if(!date||!currentDayData.length)throw Error('Выберите дату меню.');
  const counts={};for(const meal of meals){const values=currentDayData.flatMap((item,i)=>{if(item.meal!==meal)return [];const input=document.getElementById('ord-'+i);let text=input?.value.trim();if(!text)text=document.getElementById('globalOrdered').value.trim()||'0';const value=Number(text.replace(',','.'));if(!Number.isFinite(value)||value<0)throw Error('Проверьте приготовленные порции: '+meal+'.');return [value];});if(!values.length)throw Error('Нет данных для приёма пищи «'+meal+'».');if(new Set(values).size!==1)throw Error('У блюд приёма пищи «'+meal+'» разные количества. Проверьте калькулятор.');counts[meal]=values[0];}
  const group=document.getElementById('groupSelect');return {date,signature:today(),counts,group:group.options[group.selectedIndex].text};
 }
 function show(){status.textContent='';download.disabled=false;dialog.querySelector('#correctionCounts').replaceChildren();try{const data=collect();dialog.querySelector('#correctionGroup').textContent='Данные: '+data.group;dialog.querySelector('#correctionServiceDate').textContent='Дата оказания услуг: '+numericDate(data.date);dialog.querySelector('#correctionSignDate').textContent='Дата подписи: '+numericDate(data.signature);for(const [meal,value] of [...meals.map(meal=>[meal,data.counts[meal]+'+1']),['Ужин','0']]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=meal;dd.textContent=value;dialog.querySelector('#correctionCounts').append(dt,dd);}}catch(error){status.textContent=error.message;download.disabled=true;}dialog.showModal();}
 button.onclick=show;dialog.querySelector('#correctionCancel').onclick=()=>dialog.close();
 let template;
 async function build(data){
  template??=fetch('templates/correction-template.docx').then(r=>{if(!r.ok)throw Error('Не удалось загрузить образец документа.');return r.arrayBuffer();}).catch(error=>{template=null;throw error;});
  const zip=await JSZip.loadAsync(await template),path='word/document.xml';let xml=await zip.file(path).async('string');const [year,month,day]=data.signature.split('-').map(Number);
  const slots={SERVICE_DATE:numericDate(data.date),GROUP_LABEL:data.group==='Все группы (Итог)'?' ':data.group,SIGN_DATE:'«'+String(day).padStart(2,'0')+'» '+months[month-1]+' '+year+' г.',B1:data.counts['Завтрак 1'],B2:data.counts['Завтрак 2'],LUNCH:data.counts['Обед'],SNACK:data.counts['Полдник']};
  for(const [key,value] of Object.entries(slots)){const marker='{{'+key+'}}';if(!xml.includes(marker))throw Error('Не найдено поле шаблона: '+key);xml=xml.split(marker).join(esc(value));}
  zip.file(path,xml);return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'});
 }
 dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();status.textContent='Готовим Word…';download.disabled=true;try{const data=collect(),blob=await build(data),link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download='заявка - коррекция на '+numericDate(data.date)+' сад 734.docx';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);status.textContent='Файл подготовлен: '+link.download;}catch(error){status.textContent=error.message;}finally{download.disabled=false;}};
})();

