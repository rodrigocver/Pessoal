// Arquivos CSV do perfil: o mesmo recorte (parlamentar e período) e as mesmas consultas das abas.
import { despesasDoPeriodo, proposicoes, sessoesDoPeriodo, votos, type Parlamentar } from "./consultas";
import { paraCsv } from "./csv";
import type { Periodo } from "./periodo";

export const ABAS_CSV = ["presenca", "votacoes", "proposicoes", "gastos"] as const;
export type AbaCsv = (typeof ABAS_CSV)[number];

const titulares = (s: { titulares: { nome: string }[] } | null) => (s ? s.titulares.map((t) => t.nome).join(", ") : "");

export async function csvDoPerfil(p: Parlamentar, aba: AbaCsv, periodo: Periodo): Promise<string> {
  switch (aba) {
    case "presenca": {
      const sessoes = await sessoesDoPeriodo(p, periodo);
      return paraCsv(
        ["data_hora", "sessao", "presente"],
        sessoes.map((s) => [s.inicio, s.descricao, s.presente]),
      );
    }
    case "votacoes": {
      const { lista } = await votos(p, periodo, 1, 100_000);
      return paraCsv(
        ["data_hora", "proposicao", "ementa", "voto", "resultado", "como_suplente", "vaga_de", "fonte_url"],
        lista.map((v) => [
          v.data,
          v.proposicao,
          v.ementa,
          v.voto,
          v.aprovada == null ? "" : v.aprovada ? "aprovada" : "rejeitada",
          !!v.suplente,
          titulares(v.suplente),
          v.fonteUrl,
        ]),
      );
    }
    case "proposicoes": {
      const { lista } = await proposicoes(p, periodo, 100_000);
      return paraCsv(
        ["apresentada_em", "proposicao", "ementa", "situacao", "fonte_url"],
        lista.map((x) => [x.apresentadaEm, x.rotulo, x.ementa, x.situacao, x.fonteUrl]),
      );
    }
    case "gastos": {
      const despesas = await despesasDoPeriodo(p, periodo);
      return paraCsv(
        ["data", "competencia", "categoria", "fornecedor", "cnpj_cpf", "valor", "nota_fiscal_url", "fonte_url"],
        despesas.map((d) => [
          d.data,
          d.competencia,
          d.categoria,
          d.fornecedor,
          d.cnpjCpf,
          d.valor,
          d.documentoUrl,
          d.fonteUrl,
        ]),
      );
    }
  }
}
