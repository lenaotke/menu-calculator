'use strict';
(()=>{
 const dialog=document.createElement('dialog');dialog.id='techCardDialog';
 dialog.innerHTML='<div class="tk-toolbar"><h2 id="tkTitle"></h2><button type="button" id="tkClose">Закрыть ✕</button></div><div id="tkChoices"></div><p id="tkStatus" role="status"></p><p class="tk-links"><a id="tkOriginal" target="_blank" rel="noopener">Открыть карту в отдельной вкладке</a> · <a id="tkDownload">Скачать PDF</a></p><div id="tkFrame" aria-label="Оригинал технологической карты"></div>';
 document.body.append(dialog);
 let indexPromise,bundlePromise,libraryPromise,catalogPromise,sequence=0;
 const cache=new Map();
 dialog.querySelector('#tkClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{sequence++;dialog.querySelector('#tkFrame').replaceChildren();});
 async function bundle(){return bundlePromise??=fetch('techcards/cards-bundle.zip').then(r=>{if(!r.ok)throw Error('bundle');return r.arrayBuffer();}).then(bytes=>JSZip.loadAsync(bytes)).catch(error=>{bundlePromise=null;throw error;});}
 async function library(){return libraryPromise??=bundle().then(async zip=>{if(window.PDFLib)return;const text=await zip.file('pdf-lib.min.js').async('string'),url=URL.createObjectURL(new Blob([text],{type:'application/javascript'}));try{await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=()=>{s.remove();resolve();};s.onerror=()=>{s.remove();reject(Error('library'));};document.head.append(s);});}finally{URL.revokeObjectURL(url);}}).catch(error=>{libraryPromise=null;throw error;});}
 async function catalog(){return catalogPromise??=Promise.all([bundle(),library()]).then(async ([zip])=>PDFLib.PDFDocument.load(await zip.file('catalog.pdf').async('uint8array'),{updateMetadata:false})).catch(error=>{catalogPromise=null;throw error;});}
 async function cardUrl(code,card){if(cache.has(code)){const url=cache.get(code);cache.delete(code);cache.set(code,url);return url;}const source=await catalog(),doc=await PDFLib.PDFDocument.create();for(const p of await doc.copyPages(source,card.pages))doc.addPage(p);doc.setTitle('Технологическая карта № '+code);const url=URL.createObjectURL(new Blob([await doc.save()],{type:'application/pdf'}));cache.set(code,url);while(cache.size>3){const first=cache.keys().next().value;URL.revokeObjectURL(cache.get(first));cache.delete(first);}return url;}
 tkClick=async function(value){
  if(!dialog.open)dialog.showModal();const current=++sequence,status=dialog.querySelector('#tkStatus'),frame=dialog.querySelector('#tkFrame'),links=dialog.querySelector('.tk-links'),choices=dialog.querySelector('#tkChoices');
  dialog.querySelector('#tkTitle').textContent='Технологическая карта № '+value;status.textContent='Открываем оригинал документа…';frame.replaceChildren();frame.hidden=true;links.hidden=true;choices.replaceChildren();
  try{
   indexPromise??=fetch('techcards-bundle.json').then(r=>{if(!r.ok)throw Error('index');return r.json();}).catch(error=>{indexPromise=null;throw error;});const index=await indexPromise;if(current!==sequence||!dialog.open)return;
   const codes=[...new Set(String(value).match(/\d{6}(?:-\d+)?/g)||[])];
   async function open(code){const request=++sequence,card=index[code];dialog.querySelector('#tkTitle').textContent='Технологическая карта № '+code;frame.replaceChildren();frame.hidden=true;links.hidden=true;if(!card){status.textContent='Карта с этим номером в приложенных документах не найдена. Номер в меню сохранён без изменений.';return;}status.textContent='Загружаем технологическую карту…';try{const url=await cardUrl(code,card);if(request!==sequence||!dialog.open)return;const iframe=document.createElement('iframe');iframe.title='Оригинал ТК '+code;iframe.src=url;iframe.style.width='100%';iframe.style.height='70vh';iframe.style.border='0';frame.append(iframe);const original=dialog.querySelector('#tkOriginal'),download=dialog.querySelector('#tkDownload');original.href=url;download.href=url;download.download='Технологическая карта '+code+'.pdf';status.textContent='Оригинал из приложенного меню · страница '+card.sourcePage;links.hidden=false;frame.hidden=false;}catch{if(request===sequence)status.textContent='Не удалось загрузить карту. Проверьте соединение и попробуйте открыть её ещё раз.';}}
   if(codes.length>1)for(const code of codes){const b=document.createElement('button');b.textContent='ТК '+code;b.onclick=()=>open(code);choices.append(b);}
   await open(codes.find(c=>index[c])||codes[0]||String(value));
  }catch{if(dialog.open&&current===sequence)status.textContent='Не удалось открыть каталог карт. Обновите страницу и попробуйте ещё раз.';}
 };
 window.addEventListener('pagehide',event=>{if(!event.persisted)for(const url of cache.values())URL.revokeObjectURL(url);});
})();

