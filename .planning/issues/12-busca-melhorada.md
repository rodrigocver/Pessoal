---
titulo: "Busca: ignorar acentos no nome completo e ordenar por relevância"
rotulos: ["boa primeira issue", "interface"]
---
## Contexto
Em `buscarParlamentares` (`src/lib/consultas.ts`) o nome parlamentar ignora acentos, mas o nome completo
não. A ordem é alfabética, mesmo quando o termo bate exatamente com um nome.

## O que fazer
- `unaccent` também em `nome_completo`.
- Ordenar: nome que começa com o termo primeiro, depois os que contêm.

## Pronto quando
- Buscar "jose" encontra "José" no nome completo; buscar "tabata" traz Tabata Amaral em primeiro.
- Teste de integração ou unitário cobrindo a ordenação.
