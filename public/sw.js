/**
 * Service worker do VoxelCraft.
 *
 * Serve para duas coisas: deixar o jogo instalavel como app e fazer ele abrir
 * mesmo sem rede. O que NAO pode ser guardado em cache e o multijogador --
 * /api/ e o WebSocket precisam sempre falar com o servidor de verdade, senao
 * o jogo passaria a responder com estado velho.
 */
const VERSAO = 'voxelcraft-v1';

self.addEventListener('install', (ev) => {
  // Guarda a casca do app para a primeira abertura offline funcionar.
  ev.waitUntil(
    caches
      .open(VERSAO)
      .then((cache) => cache.addAll(['/', '/manifest.webmanifest', '/icones/icone-192.png']))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // sem rede na instalacao: segue assim mesmo
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;

  // Só GET entra em cache; POST do /api/room muda estado no servidor.
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Multijogador e recursos de outros dominios passam direto.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws')) return;

  // Navegacao: tenta a rede primeiro para pegar a versao nova do jogo,
  // e so cai no cache quando esta offline.
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          caches.open(VERSAO).then((c) => c.put('/', copia));
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error()))
    );
    return;
  }

  // Demais arquivos (js, css, imagens): responde do cache na hora e atualiza
  // em segundo plano. Os nomes vem com hash no build, entao nao envelhecem.
  ev.respondWith(
    caches.match(req).then((emCache) => {
      const daRede = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copia = res.clone();
            caches.open(VERSAO).then((c) => c.put(req, copia));
          }
          return res;
        })
        .catch(() => emCache || Response.error());

      return emCache || daRede;
    })
  );
});
