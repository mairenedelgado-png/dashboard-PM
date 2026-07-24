const VERSION = 'dashboard-sync-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

const DASHBOARD_SCOPES = {
  '/dashboards/pm.html': 'pm',
  '/dashboards/requerimientos.html': 'requirements',
  '/dashboards/capacidad.html': 'capacity',
  '/dashboards/cs.html': 'clients'
};

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.mode !== 'navigate') return;

  const url = new URL(request.url);
  const matchedPath = Object.keys(DASHBOARD_SCOPES).find(path => url.pathname.endsWith(path));
  if (!matchedPath) return;

  event.respondWith((async () => {
    const response = await fetch(request, { cache: 'no-store' });
    if (!response.ok) return response;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;

    let html = await response.text();
    const scope = DASHBOARD_SCOPES[matchedPath];
    const marker = 'data-dashboard-sync-injected';

    if (!html.includes(marker)) {
      html = html.replace(/<body([^>]*)>/i, (match, attrs) => {
        const cleaned = attrs.replace(/\sdata-sync-scope=("[^"]*"|'[^']*')/i, '');
        return `<body${cleaned} data-sync-scope="${scope}" ${marker}="${VERSION}">`;
      });
      html = html.replace(/<\/body>/i, '<script src="../assets/dashboard-sync.js?v=20260724-1" defer></script></body>');
    }

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'no-store');
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  })());
});
