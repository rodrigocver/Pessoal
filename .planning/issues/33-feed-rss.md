---
titulo: "Feed RSS de cada parlamentar"
rotulos: ["boa primeira issue", "funcionalidade"]
---
## Contexto
Jornalistas e eleitores que usam leitores de RSS não têm como acompanhar um parlamentar sem criar conta.

## O que fazer
- Rota `src/app/feed/[casa]/[id]/route.ts` (ex.: `/feed/camara/204534.xml`) com os votos nominais e os projetos
  apresentados mais recentes (reaproveitar `votos` e `proposicoes` de `src/lib/consultas.ts`).
- Rota estática em cache, como `/dados/...` (`revalidate`, `generateStaticParams`); incluir em
  `scripts/conferir-cache.mjs`.
- `<link rel="alternate" type="application/rss+xml">` no perfil e um link discreto "RSS".
- Texto neutro, igual ao do site ("Votou Sim na PL 1/2025"), com link para a página da votação.

## Pronto quando
- O feed valida em https://validator.w3.org/feed/ e aparece num leitor de RSS.
- Teste de unidade da montagem do XML (escape de `&`, `<`, acentos).
