// Confere, depois do `npm run build`, que as páginas públicas continuam estáticas (servidas da CDN).
// Uma página pública que passa a ler cookies, sessão (auth()), headers() ou searchParams vira dinâmica e passa a
// consultar o banco a cada visita, o que não aguenta milhões de acessos (ver docs/ESCALA.md).
import { readFileSync } from "node:fs";

const m = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8"));
const ESTATICAS = ["/", "/buscar", "/metodologia", "/status", "/offline", "/sitemap.xml", "/indice-busca.json"];
const ISR = [
  "/parlamentar/[casa]/[id]/[[...filtros]]",
  "/parlamentar/[casa]/[id]/opengraph-image",
  "/votacao/[casa]/[id]",
  "/comparar/[[...sel]]",
];
const faltam = [...ESTATICAS.filter((r) => !m.routes[r]), ...ISR.filter((r) => !m.dynamicRoutes[r])];
if (faltam.length) {
  console.error(`Páginas públicas que deixaram de ser estáticas: ${faltam.join(", ")}`);
  console.error("Não use cookies(), headers(), auth() ou searchParams nelas; veja docs/ESCALA.md.");
  process.exit(1);
}
console.log(`ok: ${ESTATICAS.length + ISR.length} rotas públicas estáticas ou em cache (ISR).`);
