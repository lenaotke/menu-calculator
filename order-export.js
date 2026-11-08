'use strict';
(()=>{
 const meals=['Завтрак 1','Завтрак 2','Обед','Полдник'];
 const months=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
 const button=document.createElement('button');button.id='exportOrderButton';button.type='button';button.textContent='Скачать распоряжение · Word';button.className='btn';document.getElementById('toolbar').append(button);
 const dialog=document.createElement('dialog');dialog.id='orderExportDialog';dialog.innerHTML='<form id="orderExportForm"><h2>Распоряжение № 07</h2><p id="orderGroup"></p><p id="orderDate"></p><p>Количество берётся из колонки «Остаток (порций)» один раз для каждого приёма пищи.</p><dl id="orderCounts"></dl><p id="orderExportStatus" role="status"></p><div class="act-actions"><button type="button" id="orderCancel">Отмена</button><button type="submit" id="orderDownload">Скачать Word (.docx)</button></div></form>';document.body.append(dialog);
 const status=dialog.querySelector('#orderExportStatus'),download=dialog.querySelector('#orderDownload');
 const esc=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 function collect(){
  const date=document.getElementById('dateSelect').value;if(!date||!currentDayData.length)throw Error('Выберите дату меню в калькуляторе.');
  const counts={};for(const meal of meals){
   const values=currentDayData.flatMap((item,i)=>{if(item.meal!==meal)return [];const text=document.getElementById('extra-'+i)?.textContent.trim(),value=Number(text?.replace(/\s/g,'').replace(',','.'));if(!text||!Number.isFinite(value))throw Error('Не удалось прочитать остаток: '+meal+'.');return [value];});
   if(!values.length)throw Error('В меню нет строк для приёма пищи «'+meal+'». Добавьте блюдо, чтобы получить его остаток.');
   if(new Set(values).size!==1)throw Error('У блюд приёма пищи «'+meal+'» разные остатки. Проверьте количества в калькуляторе.');
   counts[meal]=values[0];
  }
  const group=document.getElementById('groupSelect');return {date,counts,group:group.options[group.selectedIndex].text};
 }
 function show(){status.textContent='';dialog.querySelector('#orderCounts').replaceChildren();download.disabled=false;try{const data=collect();dialog.querySelector('#orderGroup').textContent='Данные: '+data.group;dialog.querySelector('#orderDate').textContent='Дата питания: '+data.date.split('-').reverse().join('.');for(const meal of meals){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=meal;dd.textContent=data.counts[meal];dialog.querySelector('#orderCounts').append(dt,dd);}}catch(error){status.textContent=error.message;download.disabled=true;}dialog.showModal();}
 button.onclick=show;dialog.querySelector('#orderCancel').onclick=()=>dialog.close();
 async function build(data){
  const [year,month,day]=data.date.split('-').map(Number),dd=String(day).padStart(2,'0'),numeric=data.date.split('-').reverse().join('.'),header='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const p=(text,{bold=false,center=false,after=180,size=28}={})=>'<w:p><w:pPr><w:spacing w:after="'+after+'" w:line="300" w:lineRule="auto"/>'+(center?'<w:jc w:val="center"/>':'')+'</w:pPr><w:r><w:rPr>'+(bold?'<w:b/>':'')+'<w:sz w:val="'+size+'"/></w:rPr><w:t xml:space="preserve">'+esc(text)+'</w:t></w:r></w:p>';
  const c=data.counts;let body=p('Распоряжение № 07',{bold:true,center:true,after:260,size:32})+p('от «'+dd+'» '+months[month-1]+' '+year+' г.',{center:true,after:300})+p('«О перераспределении рационов питания на детей» на '+numeric+' г.',{bold:true,center:true,after:320});
  if(data.group!=='Все группы (Итог)')body+=p(data.group,{center:true});
  body+=p('Специалисту по питанию Дорошину В.А. произвести перераспределение рационов питания на детей в возрасте 3-7 лет в количестве 1 завтрак – '+c['Завтрак 1']+', 2 завтрак – '+c['Завтрак 2']+', обед – '+c['Обед']+' и полдник – '+c['Полдник']+' в связи с уменьшением количества воспитанников.',{after:480});
  for(const text of ['Старший воспитатель    ____________________ Т. А. Этингоф','Специалист по питанию    ____________________ В.А. Дорошин','Зав. производства    ____________________ Ф. С. Алексанян'])body+=p(text,{after:220});
  const zip=new JSZip();zip.file('[Content_Types].xml',header+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
  zip.file('_rels/.rels',header+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels',header+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  zip.file('word/styles.xml',header+'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="28"/><w:color w:val="000000"/><w:lang w:val="ru-RU"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>');
  zip.file('word/document.xml',header+'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1134" w:bottom="1134" w:left="1417" w:header="400" w:footer="400"/></w:sectPr></w:body></w:document>');
  return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'});
 }
 dialog.querySelector('form').onsubmit=async event=>{event.preventDefault();download.disabled=true;status.textContent='Готовим Word…';try{const data=collect(),blob=await build(data),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Распоряжение от '+data.date.split('-').reverse().join('.')+'.docx';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);status.textContent='Файл подготовлен: '+link.download;}catch(error){status.textContent=error.message;}finally{download.disabled=false;}};
})();

