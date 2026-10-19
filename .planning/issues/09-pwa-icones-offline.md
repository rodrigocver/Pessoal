---
titulo: "PWA completo: ícones PNG e funcionamento offline básico (UX-01)"
rotulos: ["boa primeira issue", "interface"]
---
## Contexto
O manifesto existe (`public/manifest.webmanifest`), mas só com ícone SVG. Android e iOS pedem PNG
(192 e 512 px, e `apple-touch-icon`) para instalar direito. Não há service worker.

## O que fazer
- Gerar ícones PNG a partir de `public/icon.svg` e referenciá-los no manifesto e no layout.
- Service worker simples: cache das páginas visitadas e página "sem conexão".

## Pronto quando
- No Chrome Android aparece "Instalar app"; no iPhone, "Adicionar à Tela de Início" usa o ícone certo.
- Lighthouse marca o site como instalável.
