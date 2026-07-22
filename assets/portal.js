const labels={jira:'Jira',gmail:'Correo',zoho:'Zoho',drive:'Google Drive'};
const details={jira:'LISTICKETS, LISPRO, QALT, worklogs y Time to done.',gmail:'Una conversación por asunto que contenga Requerimiento.',zoho:'Clasificación de clientes y condiciones de pago.',drive:'Respaldo de los cuatro dashboards originales.'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function render(data){
  const s=data.summary||{};
  const cards=[['Proyectos',s.projects,'LISPRO sin Requerimientos'],['Requerimientos',s.requirements,'Conversaciones de correo'],['Tickets abiertos',s.openTickets,'LISTICKETS'],['QA pendiente',s.qaPending,'QALT'],['SLA vencido',s.slaBreached,'Time to done']];
  document.getElementById('metrics').innerHTML=cards.map(([l,v,h])=>`<article><span>${l}</span><strong>${v??'—'}</strong><small>${h}</small></article>`).join('');
  const when=data.meta?.lastSuccessfulSync;
  document.getElementById('lastSync').textContent=when?new Intl.DateTimeFormat('es-GT',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Guatemala'}).format(new Date(when)):'Pendiente de conexión';
  const mode=data.meta?.mode;
  document.getElementById('syncMode').textContent=mode==='live'?'Datos sincronizados automáticamente':mode==='manual'?'Corte actualizado con Rovo y Gmail':'Mostrando último corte disponible';
  document.getElementById('sourceList').innerHTML=Object.entries(data.sources||{}).map(([key,v])=>{const state=v.status||'pending';const text=state==='ok'?'Conectado':state==='error'?'Error':'Pendiente';return `<article class="source"><div class="source-head"><h3>${esc(labels[key]||key)}</h3><span class="status ${esc(state)}">${text}</span></div><p>${esc(v.message||details[key]||'')}</p></article>`}).join('');

  const sourceRows=document.querySelectorAll('#syncSources div');
  sourceRows.forEach(row=>{row.querySelector('b').textContent='✓';row.classList.remove('pending','error')});
  const sourceMap={jira:0,gmail:1,zoho:2,drive:3};
  Object.entries(data.sources||{}).forEach(([key,v])=>{
    const idx=sourceMap[key];
    if(idx===undefined||!sourceRows[idx])return;
    const state=v.status||'pending';
    sourceRows[idx].classList.toggle('pending',state==='pending');
    sourceRows[idx].classList.toggle('error',state==='error');
    sourceRows[idx].querySelector('b').textContent=state==='ok'?'✓':state==='error'?'!':'…';
  });
}

function setSyncState(state,message){
  const button=document.getElementById('refreshButton');
  const status=document.getElementById('systemStatus');
  const spinner=document.getElementById('syncSpinner');
  const progress=document.getElementById('syncProgress');
  const progressBar=document.getElementById('syncProgressBar');

  if(state==='loading'){
    button.disabled=true;
    button.textContent='↻ Actualizando…';
    status.innerHTML='<i class="status-dot syncing"></i> Sincronizando';
    spinner.classList.add('active');
    progress.hidden=false;
    progressBar.style.width='18%';
    document.getElementById('syncMode').textContent=message||'Consultando archivos de datos';
  }else if(state==='success'){
    button.disabled=false;
    button.textContent='↻ Actualizar información';
    status.innerHTML='<i class="status-dot online"></i> En línea';
    spinner.classList.remove('active');
    progressBar.style.width='100%';
    document.getElementById('syncMode').textContent=message||'Información recargada correctamente';
    setTimeout(()=>{progress.hidden=true;progressBar.style.width='0%'},700);
  }else{
    button.disabled=false;
    button.textContent='↻ Reintentar actualización';
    status.innerHTML='<i class="status-dot error"></i> Error';
    spinner.classList.remove('active');
    progress.hidden=true;
    document.getElementById('syncMode').textContent=message||'No fue posible actualizar los datos';
  }
}

async function load(showProgress=false){
  if(showProgress)setSyncState('loading');
  try{
    const progressBar=document.getElementById('syncProgressBar');
    if(showProgress)progressBar.style.width='42%';
    const r=await fetch(`data/live.json?t=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw new Error('No disponible');
    if(showProgress)progressBar.style.width='76%';
    const data=await r.json();
    render(data);
    if(showProgress)setSyncState('success','Información recargada desde el último corte disponible');
  }catch(e){
    document.getElementById('lastSync').textContent='No disponible';
    setSyncState('error');
  }
}

const refreshButton=document.getElementById('refreshButton');
if(refreshButton)refreshButton.addEventListener('click',()=>load(true));
load();