(()=>{
 const bar=document.createElement('div');bar.id='listasoPortalBar';
 bar.innerHTML='<a href="../index.html">← PM Operations Center</a><span id="listasoSync">Verificando actualización…</span>';
 const style=document.createElement('style');style.textContent=`
 #listasoPortalBar{position:fixed;z-index:99999;right:14px;bottom:14px;display:flex;gap:12px;align-items:center;background:#0d2743;color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:9px 13px;box-shadow:0 10px 30px rgba(0,0,0,.22);font:700 11px/1.2 Inter,Segoe UI,sans-serif}
 #listasoPortalBar a{color:#7fd8ff;text-decoration:none}#listasoPortalBar span{opacity:.82}
 .zoho-client{position:relative;display:inline-flex;align-items:center;gap:5px;flex-wrap:wrap;cursor:help}
 .zoho-mini{display:inline-flex;align-items:center;padding:2px 6px;border-radius:999px;font-size:9px;font-weight:800;line-height:1.4;background:#eef2ff;color:#374151;border:1px solid #e5e7eb;white-space:nowrap}
 .zoho-mini.vip{background:#dcfce7;color:#166534;border-color:#bbf7d0}.zoho-mini.class-a{background:#fef3c7;color:#92400e;border-color:#fde68a}.zoho-mini.payment{background:#fee2e2;color:#991b1b;border-color:#fecaca}
 .zoho-client[data-tooltip]:hover::after{content:attr(data-tooltip);position:absolute;left:0;top:calc(100% + 8px);z-index:9999;width:245px;white-space:pre-line;background:#172033;color:#fff;padding:11px 12px;border-radius:10px;box-shadow:0 14px 34px rgba(15,23,42,.25);font-size:11px;font-weight:600;line-height:1.55;pointer-events:none}
 .zoho-client[data-tooltip]:hover::before{content:"";position:absolute;left:16px;top:100%;border:6px solid transparent;border-bottom-color:#172033;z-index:10000}
 @media(max-width:600px){#listasoPortalBar span{display:none}.zoho-client[data-tooltip]:hover::after{width:210px}}
 `;
 document.head.appendChild(style);document.body.appendChild(bar);

 const normalize=value=>String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'');
 const paymentLabel=value=>value==='Yes'?'No pagado':value==='No'?'Pagado':'Por confirmar';
 const priorityFor=(client,opportunity)=>{
   const status=String(client.status||'');
   const classification=String(client.classification||'');
   const vip=/vip/i.test(status);
   const unpaid=client.pendingPayment==='Yes';
   if((classification==='A'&&vip)||(vip&&unpaid))return['Estratégica','red'];
   if(vip||classification==='A'||unpaid)return['Alta','red'];
   if(/upsell|cross-sell/i.test(String(opportunity||'')))return['Media','yellow'];
   return['Informativa','gray'];
 };
 const enhanceRequirements=(liveData)=>{
   if(!/requerimientos/i.test(document.title))return;
   const clients=liveData?.zoho?.matchedDashboardClients||[];
   if(!clients.length)return;
   const byName=new Map(clients.map(c=>[normalize(c.name),c]));
   const enhance=()=>{
     document.querySelectorAll('#tbody tr').forEach(row=>{
       if(row.dataset.zohoEnhanced==='1')return;
       const cells=row.querySelectorAll('td');if(cells.length<5)return;
       const rawName=(cells[0].textContent||'').trim();
       let client=byName.get(normalize(rawName));
       if(!client){client=clients.find(c=>normalize(rawName).includes(normalize(c.name))||normalize(c.name).includes(normalize(rawName)))}
       if(!client)return;
       row.dataset.zohoEnhanced='1';
       const status=client.status||'Pendiente de validación por Alejandra';
       const classification=client.classification||'Pendiente de validación por Alejandra';
       const payment=paymentLabel(client.pendingPayment);
       const opportunity=(cells[2].textContent||'').trim();
       const [priority,priorityClass]=priorityFor(client,opportunity);
       const badges=[];
       if(/vip/i.test(status))badges.push('<span class="zoho-mini vip">VIP</span>');
       if(classification==='A')badges.push('<span class="zoho-mini class-a">⭐ A</span>');
       else if(classification&&classification!=='Pendiente de validación por Alejandra')badges.push(`<span class="zoho-mini">${classification}</span>`);
       if(client.pendingPayment==='Yes')badges.push('<span class="zoho-mini payment">Pago pendiente</span>');
       const tooltip=`Zoho CRM\nClasificación: ${classification}\nEstado: ${status}\nPago: ${payment}\nTenant: ${client.tenant||'Sin registrar'}`;
       cells[0].innerHTML=`<span class="zoho-client" data-tooltip="${tooltip.replace(/"/g,'&quot;')}"><strong>${rawName}</strong>${badges.join('')}</span>`;
       cells[1].innerHTML=`<span class="badge ${/vip/i.test(status)?'green':'gray'}">${status}</span>`;
       cells[3].innerHTML=`<span class="badge ${payment==='Pagado'?'green':payment==='No pagado'?'red':'gray'}">${payment}</span>`;
       cells[4].innerHTML=`<span class="badge ${priorityClass}">${priority}</span>`;
     });
   };
   enhance();
   const tbody=document.getElementById('tbody');if(tbody)new MutationObserver(enhance).observe(tbody,{childList:true,subtree:true});
 };

 fetch(`../data/live.json?t=${Date.now()}`,{cache:'no-store'}).then(r=>r.json()).then(d=>{
   const el=document.getElementById('listasoSync');const date=d.meta?.lastSuccessfulSync;
   el.textContent=date?`Datos: ${new Intl.DateTimeFormat('es-GT',{dateStyle:'short',timeStyle:'short',timeZone:'America/Guatemala'}).format(new Date(date))}`:'Datos automáticos pendientes';
   enhanceRequirements(d);
 }).catch(()=>{document.getElementById('listasoSync').textContent='Sin estado de sincronización'});
})();