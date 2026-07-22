(()=>{
 const bar=document.createElement('div');bar.id='listasoPortalBar';
 bar.innerHTML='<a href="../index.html">← Centro de dashboards</a><span id="listasoSync">Verificando actualización…</span>';
 const style=document.createElement('style');style.textContent='#listasoPortalBar{position:fixed;z-index:99999;right:14px;bottom:14px;display:flex;gap:12px;align-items:center;background:#0d2743;color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:9px 13px;box-shadow:0 10px 30px rgba(0,0,0,.22);font:700 11px/1.2 Inter,Segoe UI,sans-serif}#listasoPortalBar a{color:#7fd8ff;text-decoration:none}#listasoPortalBar span{opacity:.82}@media(max-width:600px){#listasoPortalBar span{display:none}}';
 document.head.appendChild(style);document.body.appendChild(bar);
 fetch(`../data/live.json?t=${Date.now()}`,{cache:'no-store'}).then(r=>r.json()).then(d=>{const el=document.getElementById('listasoSync');const date=d.meta?.lastSuccessfulSync;el.textContent=date?`Datos: ${new Intl.DateTimeFormat('es-GT',{dateStyle:'short',timeStyle:'short',timeZone:'America/Guatemala'}).format(new Date(date))}`:'Datos automáticos pendientes'}).catch(()=>{document.getElementById('listasoSync').textContent='Sin estado de sincronización'});
})();
