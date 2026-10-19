---
titulo: "PWA completo: ícones PNG e funcionamento offline básico (UX-01)"
rotulos: ["boa primeira issue", "interface"]
status: feito
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

## Feito
- Ícones PNG 192/512, maskable e `apple-touch-icon`; manifesto completo.
- `public/sw.js`: estáticos em cache; páginas públicas (início, busca, perfis) com rede primeiro e cópia
  salva; sem conexão, redireciona para `/offline` (pré-carregada com seus scripts).
- Privacidade: páginas pessoais nunca vão para o cache, nem páginas públicas abertas por quem está logado
  (cabeçalho `x-fiscaliza-sessao`, `src/middleware.ts`).
- Testado com o servidor desligado de verdade (4 rodadas) e com usuário logado.
- Pendente de conferência manual em aparelho real: "Instalar app" no Android e "Adicionar à Tela de Início" no iPhone.
