---
titulo: "Página de cada proposição, com todas as votações nominais"
rotulos: ["funcionalidade", "interface", "ajuda bem-vinda"]
---
## Contexto
Uma matéria (ex.: "PL 2552/2019") costuma ter várias votações nominais: texto-base, destaques, redação final.
Hoje cada uma tem sua página (`/votacao/...`), mas nada as reúne. A tabela `votacao` já guarda o id oficial da
matéria (`proposicao_ref`).

## O que fazer
- `/proposicao/[casa]/[ref]` (estática, em cache): ementa, autores (tabela `autoria`, quando a matéria é de
  parlamentar), e a lista de votações nominais em ordem, com o placar de cada uma.
- Link para essa página a partir da página da votação e da aba Votações do perfil.
- Câmara e Senado têm ids diferentes (`proposicao_ref` = proposição na Câmara, processo no Senado); conferir em
  `docs/FONTES.md`.

## Pronto quando
- Teste de integração com uma matéria de duas votações no cenário de teste.
- Página incluída nos testes de ponta a ponta e na conferência de cache.
