---
titulo: "Página de status das atualizações de dados"
rotulos: ["boa primeira issue", "interface", "ingestão"]
status: feito
---
## Contexto
A tabela `ingestao_log` registra cada execução, mas só a data da última atualização aparece no rodapé.

## O que fazer
- Página `/status` com a última execução de cada tarefa: data, status, registros, duração, erro (resumido).
- Link no rodapé.

## Pronto quando
- Fica claro para qualquer pessoa se os dados de Câmara e Senado estão em dia.

## Feito
- `/status`: por fonte, último sucesso, registros e erro resumido; aviso geral quando há erro ou atraso (> 48 h).
- Execuções paradas há mais de 3 horas aparecem como "interrompida". Link no rodapé.
