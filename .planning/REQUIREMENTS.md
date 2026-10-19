# Requisitos — v1

Status: ✅ feito · 🟡 parcial (issue no backlog) · ⬜ pendente

## Contas e lista pessoal
- ✅ **AUTH-01** Usuário cria conta e faz login com Google ou link mágico por e-mail.
- ✅ **AUTH-02** Usuário pode excluir a conta e todos os seus dados (LGPD).
- ✅ **LIST-01** Usuário busca parlamentares por nome, partido, UF e casa (Câmara/Senado).
- ✅ **LIST-02** Usuário adiciona e remove parlamentares da sua lista "Meus parlamentares".
- ✅ **LIST-03** Painel inicial mostra a lista do usuário com um cartão-resumo por parlamentar (foto, partido/UF, presença %, nº de votos, gasto no ano).

## Dados e ingestão
- ✅ **DATA-01** Base com todos os deputados federais e senadores da legislatura atual, atualizada diariamente.
- ✅ **DATA-02** Presença em sessões deliberativas de plenário (Câmara) por parlamentar e sessão.
- ✅ **DATA-03** Presença/comparecimento no Senado (método definido na pesquisa da Fase 4).
- ✅ **DATA-04** Votações nominais de plenário e o voto de cada parlamentar (Sim/Não/Abstenção/Obstrução/Ausente).
- ✅ **DATA-05** Proposições de autoria do parlamentar (tipo, número, ano, ementa, situação).
- ✅ **DATA-06** Despesas da cota parlamentar (CEAP/CEAPS) por mês, categoria e fornecedor.
- ✅ **DATA-07** Cada registro guarda fonte oficial e data de atualização; o site exibe "atualizado em".
- ✅ **DATA-08** Carga histórica desde o início da legislatura atual (2023).

## Perfil do parlamentar
- ✅ **PROF-01** Página pública de cada parlamentar (compartilhável, sem login).
- ✅ **PROF-02** Presença: percentual no período, evolução mês a mês e lista de ausências.
- ✅ **PROF-03** Votações: lista de votos com descrição da matéria e filtro por tema/período.
- ✅ **PROF-04** Alinhamento: % de votos iguais à orientação do próprio partido e à do governo (quando a orientação existir na fonte).
- ✅ **PROF-05** Proposições: lista de projetos de autoria com situação.
- ✅ **PROF-06** Gastos: total no ano, por categoria, por mês e principais fornecedores.
- ✅ **PROF-07** Seletor de período (ano, legislatura) em todas as abas.
- ✅ **PROF-09** Afastamentos: destaque quando o titular se afasta e o suplente assume (motivo, período, quem ocupa a vaga), no perfil, nos cartões, na busca e no resumo mensal; retornos curtos visíveis; perfil do suplente mostra de quem é a vaga; página de votação marca quem votou como suplente.
- ✅ **PROF-08** Comparação com a média da casa (ex.: presença do parlamentar vs. média da Câmara).

## Resumo mensal
- ✅ **MAIL-01** E-mail mensal com o que cada parlamentar da lista fez no mês: presença, votos nominais relevantes, novas proposições, gastos lançados.
- ✅ **MAIL-02** Usuário ativa/desativa o e-mail e pode se descadastrar por link.

## Implantação
- ⬜ **DEPLOY-01** Site publicado com banco, login, ingestão agendada e envio de e-mail em produção.

## Qualidade
- ✅ **UX-01** Funciona bem em telas de celular (≥ 360px) e é instalável como PWA.
- ✅ **UX-02** Páginas de perfil carregam em < 2s (dados vêm do banco próprio, nunca da API do governo em tempo real).
- ✅ **UX-03** Explicação de cada métrica ("como calculamos") ao lado do número.

## v2
- ✅ **COM-01** Comissões: membros e cargos; presença em reuniões deliberativas (Câmara); relatorias (Senado) — backlog #17.
- ✅ Dados do TSE (patrimônio declarado, doações de campanha) — backlog #18.
- App nativo; notificações push.
- Deputados estaduais/vereadores onde houver dados abertos.

## Rastreabilidade
| Requisito | Fase |
|---|---|
| DATA-01, DATA-07 | 1 |
| DATA-02, DATA-04, DATA-05, DATA-06, DATA-08 (Câmara) | 2 |
| AUTH-01, AUTH-02, LIST-01, LIST-02, LIST-03 | 3 |
| PROF-01..PROF-07, UX-01, UX-02, UX-03 | 3 |
| DATA-03, DATA-04..DATA-06, DATA-08 (Senado) | 4 |
| PROF-04, PROF-08 | 5 |
| MAIL-01, MAIL-02 | 6 |
| — (repositório aberto) | 8 |
| DEPLOY-01 | 7 |
