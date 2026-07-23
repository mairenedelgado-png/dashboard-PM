(() => {
  const CONFIG = {
    pm: {
      label: 'Actualizar PM',
      workflow: 'sync-all.yml',
      description: 'Jira, Zoho, Gmail y minutas'
    },
    requirements: {
      label: 'Actualizar requerimientos',
      workflow: 'sync-all.yml',
      description: 'Jira, Gmail y Zoho'
    },
    capacity: {
      label: 'Actualizar capacidad',
      workflow: 'sync-all.yml',
      description: 'Worklogs y capacidad de Jira'
    },
    clients: {
      label: 'Actualizar clientes',
      workflow: 'sync-zoho.yml',
      description: 'Clientes y estado comercial desde Zoho'
    }
  };

  const GITHUB_BASE = 'https://github.com/mairenedelgado-png/dashboard-PM/actions/workflows/';

  function createBar(scope) {
    const config = CONFIG[scope];
    if (!config || document.getElementById('dashboardSyncBar')) return;

    const bar = document.createElement('section');
    bar.id = 'dashboardSyncBar';
    bar.setAttribute('aria-live', 'polite');
    bar.innerHTML = `
      <div class="dashboard-sync-copy">
        <strong>${config.label}</strong>
        <span id="dashboardSyncStatus">Último corte publicado disponible</span>
        <small>${config.description}</small>
      </div>
      <div class="dashboard-sync-actions">
        <a class="dashboard-sync-run" href="${GITHUB_BASE}${config.workflow}" target="_blank" rel="noopener noreferrer">Ejecutar sincronización</a>
        <button type="button" id="dashboardReloadButton">Recargar datos</button>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #dashboardSyncBar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin:0 0 16px;padding:13px 15px;border:1px solid #dbe5f0;border-radius:15px;background:#fff;box-shadow:0 8px 24px rgba(15,61,94,.07);font-family:Inter,Segoe UI,Arial,sans-serif}
      .dashboard-sync-copy{display:grid;gap:3px}.dashboard-sync-copy strong{font-size:14px;color:#0b1f3a}.dashboard-sync-copy span{font-size:12px;color:#526176}.dashboard-sync-copy small{font-size:11px;color:#8490a3}
      .dashboard-sync-actions{display:flex;gap:8px;flex-wrap:wrap}.dashboard-sync-actions a,.dashboard-sync-actions button{border:0;border-radius:10px;padding:9px 12px;font-weight:800;font-size:12px;cursor:pointer;text-decoration:none}
      .dashboard-sync-run{background:#2563eb;color:#fff}.dashboard-sync-actions button{background:#eef4ff;color:#245fca}
      @media(max-width:700px){#dashboardSyncBar{align-items:flex-start;flex-direction:column}.dashboard-sync-actions{width:100%}.dashboard-sync-actions a,.dashboard-sync-actions button{flex:1;text-align:center}}
    `;
    document.head.appendChild(style);

    const main = document.querySelector('main') || document.body;
    main.insertBefore(bar, main.firstChild);

    const reload = document.getElementById('dashboardReloadButton');
    const status = document.getElementById('dashboardSyncStatus');
    reload.addEventListener('click', () => {
      reload.disabled = true;
      reload.textContent = 'Recargando…';
      status.textContent = 'Consultando el último corte publicado';
      setTimeout(() => window.location.reload(), 350);
    });

    fetch('../data/live.json?t=' + Date.now(), { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => {
        const timestamp = data?.meta?.lastSuccessfulSync;
        if (!timestamp) return;
        const formatted = new Intl.DateTimeFormat('es-SV', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'America/El_Salvador'
        }).format(new Date(timestamp));
        status.textContent = `Última actualización: ${formatted}`;
      })
      .catch(() => {
        status.textContent = 'No fue posible leer la fecha de actualización';
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    createBar(document.body.dataset.syncScope || 'pm');
  });
})();
