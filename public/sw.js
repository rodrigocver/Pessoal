// Service worker do Fiscaliza: funcionamento offline básico.
// Só guarda páginas PÚBLICAS (perfis, busca, início) e arquivos estáticos. Páginas pessoais
// (minha lista, conta, login) nunca vão para o cache, para não aparecerem a outra pessoa no aparelho.
// Páginas públicas abertas por quem está logado também não (cabeçalho x-fiscaliza-sessao, ver src/middleware.ts):
// elas mostram quem o usuário acompanha.
const VERSAO = "v5";
const CACHE = `fiscaliza-${VERSAO}`;
const OFFLINE = "/offline";
const PUBLICAS = [/^\/$/, /^\/buscar/, /^\/parlamentar\//, /^\/offline$/];

// Salva a página offline e os scripts/estilos que ela usa: sem eles, ela quebra quando não há rede.
async function precarregar() {
  const c = await caches.open(CACHE);
  const res = await fetch(OFFLINE);
  const html = await res.clone().text();
  await c.put(OFFLINE, res);
  const arquivos = [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]);
  await c.addAll([...new Set([...arquivos, "/icon-192.png"])]);
}

self.addEventListener("install", (e) => {
  e.waitUntil(precarregar());
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Estáticos com hash no nome: cache primeiro.
  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|webmanifest)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (r) =>
          r ||
          fetch(req).then((res) => {
            // A cópia tem que ser feita antes de devolver a resposta: depois o conteúdo já foi consumido.
            if (res.ok) {
              const copia = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copia));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Navegação: rede primeiro; sem conexão, a última versão salva (se pública) ou a página offline.
  if (req.mode === "navigate") {
    const publica = PUBLICAS.some((re) => re.test(url.pathname));
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (publica && res.ok && !res.headers.has("x-fiscaliza-sessao")) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return res;
        })
        // Redireciona (em vez de servir o HTML de /offline no endereço pedido): a página precisa estar na
        // própria rota, senão o Next.js tenta carregar os dados da rota original e quebra sem rede.
        .catch(
          async () =>
            (publica && (await caches.match(req))) || Response.redirect(new URL(OFFLINE, self.location.origin), 302),
        ),
    );
  }
});
