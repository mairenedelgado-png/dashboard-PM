const labels={jira:'Jira',gmail:'Correo',zoho:'Zoho',drive:'Google Drive'};
const details={jira:'LISTICKETS, LISPRO, QALT, worklogs y Time to done.',gmail:'Una conversación por asunto que contenga Requerimiento.',zoho:'Clasificación de clientes y condiciones de pago.',drive:'Respaldo de los cuatro dashboards originales.'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(data){
 const s=data.summary||{};
 const cards=[['Proyectos',s.projects,'LISPRO sin Requerimientos'],['Requerimientos',s.requirements,'Conversaciones de correo'],['Tickets abiertos',s.openTickets,'LISTICKETS'],['QA pendiente',s.qaPending,'QALT'],['SLA vencido',s.slaBreached,'Time to done']];
 document.getElementById('metrics').innerHTML=cards.map(([l,v,h])=>`<article><span>${l}</span><strong>${v??'—'}</strong><small>${h}</small></article>`).join('');
 const when=data.meta?.lastSuccessfulSync;
 document.getElementById('lastSync').textContent=when?new Intl.DateTimeFormat('es-GT',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Guatemala'}).format(new Date(when)):'Pendiente de conexión';
 document.getElementById('syncMode').textContent=data.meta?.mode==='live'?'Datos sincronizados automáticamente':'Mostrando último corte disponible';
 document.getElementById('sourceList').innerHTML=Object.entries(data.sources||{}).map(([key,v])=>{const state=v.status||'pending';const text=state==='ok'?'Conectado':state==='error'?'Error':'Pendiente';return `<article class="source"><div class="source-head"><h3>${esc(labels[key]||key)}</h3><span class="status ${esc(state)}">${text}</span></div><p>${esc(v.message||details[key]||'')}</p></article>`}).join('');
}
async function load(){try{const r=await fetch(`data/live.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error('No disponible');render(await r.json())}catch(e){document.getElementById('lastSync').textContent='No disponible';document.getElementById('syncMode').textContent='No fue posible leer el archivo de datos'}}
document.getElementById('refreshButton').addEventListener('click',load);load();
