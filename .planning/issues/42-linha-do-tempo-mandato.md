---
titulo: "Linha do tempo do mandato no perfil"
rotulos: ["funcionalidade", "interface", "ajuda bem-vinda"]
---
## Contexto
As informações de um mandato estão espalhadas pelas abas: posse, afastamentos e suplentes (`afastamento`,
`substituicao`), relatorias e comissões, eleições (`candidatura`), trocas de partido (#37 do backlog). Um eleitor que
chega ao perfil não tem uma visão cronológica.

## O que fazer
- Seção "Linha do tempo" na aba inicial do perfil, só com fatos datados e fonte oficial: eleição, posse,
  afastamentos e retornos (com quem ocupou a vaga), entrada e saída de comissões como titular.
- Sem eventos de "votou" (já estão na aba Votações) e sem adjetivos.
- Reaproveitar as consultas existentes (`afastamentosDe`, `comissoesDe`, `candidaturasDe`).

## Pronto quando
- Teste de integração da montagem da linha do tempo com o cenário de teste (Davi Rocha afastado, Beto Lima
  suplente).
- Página estática (CDN) e incluída nos testes de ponta a ponta.
