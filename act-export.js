'use strict';
(()=>{
 const meals=['Завтрак 1','Завтрак 2','Обед','Полдник'];
 const months=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
 const button=document.createElement('button');button.type='button';button.textContent='Скачать акт изменения РП · Word';button.className='btn btn-act-word';button.id='exportActButton';
 document.getElementById('toolbar').append(button);
 const dialog=document.createElement('dialog');dialog.id='actExportDialog';
 dialog.innerHTML='<form id="actExportForm"><h2>Акт изменения РП</h2><p id="actGroup"></p><p>В акт войдут только блюда, включённые галочками в калькуляторе.</p><label>Дата питания и акта<input id="actDate" type="date" required readonly></label><p>Номер акта: <strong>14</strong></p><p>У штучных блюд выход порции в граммах сохраняется равным норме.</p><p id="actExportStatus" role="status"></p><div class="act-actions"><button type="button" id="actCancel">Отмена</button><button type="submit" id="actDownload">Скачать Word (.docx)</button></div></form>';
 document.body.append(dialog);
 const form=dialog.querySelector('form'),date=dialog.querySelector('#actDate'),status=dialog.querySelector('#actExportStatus');
 const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 button.onclick=()=>{date.value=document.getElementById('dateSelect').value||today();const g=document.getElementById('groupSelect');dialog.querySelector('#actGroup').textContent='Данные: '+g.options[g.selectedIndex].text;status.textContent='';dialog.showModal();};
 dialog.querySelector('#actCancel').onclick=()=>dialog.close();
 const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 async function createAct(rows,iso,actNumber,group){
  const [year,month,day]=iso.split('-').map(Number),monthName=months[month-1],dd=String(day).padStart(2,'0');
  const xmlHead='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const paragraph=(text,{bold=false,center=false,size=24,after=80,keep=false}={})=>'<w:p><w:pPr><w:spacing w:after="'+after+'" w:line="250" w:lineRule="auto"/>'+(center?'<w:jc w:val="center"/>':'')+(keep?'<w:keepNext/>':'')+'</w:pPr><w:r><w:rPr>'+(bold?'<w:b/>':'')+'<w:sz w:val="'+size+'"/></w:rPr><w:t xml:space="preserve">'+escape(text)+'</w:t></w:r></w:p>';
  const format=value=>typeof value==='number'?new Intl.NumberFormat('ru-RU',{useGrouping:false,maximumFractionDigits:10}).format(value):value;
  const widths=[6400,1900,1900];
  function tableRow(values,{heading=false,section=false}={}){return '<w:tr><w:trPr><w:cantSplit/>'+(heading?'<w:tblHeader/>':'')+'</w:trPr>'+values.map((value,i)=>'<w:tc><w:tcPr><w:tcW w:w="'+(section?10200:widths[i])+'" w:type="dxa"/>'+(section?'<w:gridSpan w:val="3"/>':'')+'<w:vAlign w:val="center"/></w:tcPr>'+paragraph(format(value),{bold:heading||section,center:heading||(!section&&i>0),after:0})+'</w:tc>').join('')+'</w:tr>';}
  let body=paragraph('АКТ № '+actNumber+' от «'+dd+'» '+monthName+' '+year+' г.',{bold:true,center:true,size:28,after:100,keep:true})+paragraph('Изменение выхода порции',{bold:true,center:true,size:28,after:160,keep:true});
  if(group!=='Все группы (Итог)')body+=paragraph(group,{center:true,after:100,keep:true});
  body+=paragraph('В связи с присутствием меньшего количества детей на '+dd+' '+monthName+' '+year+' года без предупреждения, выход порций изменился',{after:140,keep:true});
  let table=tableRow(['Наименование блюда','Норма выхода порции, гр','Выход порции, гр'],{heading:true});
  for(const meal of meals){const items=rows.filter(x=>x.meal===meal);if(!items.length)continue;table+=tableRow([meal],{section:true});for(const item of items)table+=tableRow([item.dish,item.norm,item.output]);}
  body+='<w:tbl><w:tblPr><w:tblW w:w="10200" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(edge=>'<w:'+edge+' w:val="single" w:sz="4" w:color="000000"/>').join('')+'</w:tblBorders><w:tblCellMar><w:top w:w="50" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="50" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+widths.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>'+table+'</w:tbl>'+paragraph('',{after:80});
  for(const text of ['Старший воспитатель    ____________________ Этингоф Т. А.','Специалист за организацию питания    ____________ Дорошин В.А.','Зав. производства    ____________________ Алексанян Ф. С.'])body+=paragraph(text,{after:100});
  const zip=new JSZip();
  zip.file('[Content_Types].xml',xmlHead+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');
  zip.file('_rels/.rels',xmlHead+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels',xmlHead+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
  zip.file('word/styles.xml',xmlHead+'<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:color w:val="000000"/><w:lang w:val="ru-RU"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>');
  zip.file('word/document.xml',xmlHead+'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="400" w:footer="400"/></w:sectPr></w:body></w:document>');
  return zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'});
 }
 form.onsubmit=async event=>{event.preventDefault();if(!form.reportValidity())return;status.textContent='';const rows=[];
  for(let i=0;i<currentDayData.length;i++){const item=currentDayData[i];if(!item.selected)continue;const norm=document.getElementById('row-'+i)?.querySelector('.norm-editor');if(norm&&!norm.checkValidity()){status.textContent='Исправьте норму блюда: '+item.dish;return;}
   const text=document.getElementById('final-'+i).textContent.trim(),value=Number(text.replace(',','.'));let output;
   if(text==='-'){output=item.norm;}else if(!Number.isFinite(value)||!text){status.textContent='Не удалось прочитать выход порции: '+item.dish;return;}else output=value;
   rows.push({meal:item.meal,dish:item.dish,norm:item.norm,output});
  }
  if(!rows.length){status.textContent='Выберите блюда галочками в калькуляторе.';return;}
  const submit=dialog.querySelector('#actDownload');submit.disabled=true;status.textContent='Готовим Word…';
  try{const g=document.getElementById('groupSelect'),blob=await createAct(rows,date.value,'14',g.options[g.selectedIndex].text),d=new Date(date.value+'T12:00:00Z'),weekday=new Intl.DateTimeFormat('ru-RU',{weekday:'long',timeZone:'Europe/Moscow'}).format(d),parts=date.value.split('-'),filename='Акт изменения РП '+parts.reverse().join('.')+' ('+weekday+').docx',url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);status.textContent='Файл подготовлен: '+filename;}
  catch(error){status.textContent='Не удалось создать акт. '+error.message;}finally{submit.disabled=false;}
 };
})();

