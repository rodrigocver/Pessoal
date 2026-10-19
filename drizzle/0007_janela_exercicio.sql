-- Janela de exercício usada nas métricas de presença (consultas.ts e estatisticas.ts).
-- Usa os períodos oficiais da tabela exercicio; para quem não tem histórico ingerido, cai na
-- aproximação antiga: da primeira à última atividade registrada (até hoje, se em exercício).
-- Recalculada pela tarefa de ingestão "estatisticas" (REFRESH MATERIALIZED VIEW).
CREATE MATERIALIZED VIEW janela_exercicio AS
SELECT parlamentar_id, inicio, fim FROM exercicio
UNION ALL
SELECT a.parlamentar_id, a.primeira, CASE WHEN p.em_exercicio THEN NULL ELSE a.ultima + interval '1 second' END
FROM (
  SELECT parlamentar_id, min(t) AS primeira, max(t) AS ultima FROM (
    SELECT pr.parlamentar_id, s.inicio AS t FROM presenca pr JOIN sessao s ON s.id = pr.sessao_id
    UNION ALL
    SELECT vo.parlamentar_id, v.data FROM voto vo JOIN votacao v ON v.id = vo.votacao_id
  ) x GROUP BY 1
) a
JOIN parlamentar p ON p.id = a.parlamentar_id
WHERE NOT EXISTS (SELECT 1 FROM exercicio e WHERE e.parlamentar_id = a.parlamentar_id);
--> statement-breakpoint
CREATE INDEX janela_exercicio_parlamentar ON janela_exercicio (parlamentar_id);
