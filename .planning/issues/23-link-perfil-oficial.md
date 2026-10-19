---
titulo: "Link para o perfil oficial do parlamentar na Câmara ou no Senado"
rotulos: ["boa primeira issue", "interface"]
---
## Contexto
O Fiscaliza só usa dados oficiais, mas o perfil não leva à página oficial do parlamentar. Quem quiser conferir um
número precisa procurar sozinho.

## O que fazer
- No cabeçalho do perfil (`src/app/parlamentar/[casa]/[id]/page.tsx`), um link discreto "Perfil oficial".
- Endereços (conferidos em 19/10/2026):
  - Câmara: `https://www.camara.leg.br/deputados/{idExterno}`
  - Senado: `https://www25.senado.leg.br/web/senadores/senador/-/perfil/{idExterno}`
- Uma função pequena em `src/lib/` que monte o endereço pela casa, com teste de unidade.

## Pronto quando
- O link abre a página certa para um deputado e um senador.
- Texto neutro ("Perfil oficial na Câmara"), sem ícone de saída enganoso.
