import type { Metadata } from "next";
import { statusIngestao } from "@/lib/consultas";
import { formatarDataHora } from "@/lib/formato";
import { Secao } from "@/components/ComoCalculamos";

export const metadata: Metadata = { title: "Status das atualizações" };

// O que cada tarefa atualiza, em linguagem simples (nomes técnicos em docs/ARQUITETURA.md).
const DESCRICOES: Record<string, string> = {
  deputados: "Cadastro de deputados",
  senadores: "Cadastro de senadores",
  "camara:exercicio": "Câmara: exercício, afastamentos e suplentes",
  "senado:exercicio": "Senado: exercício, afastamentos e suplentes",
  "camara:presencas": "Câmara: presença em plenário",
  "camara:votacoes": "Câmara: votações nominais",
  "camara:proposicoes": "Câmara: projetos apresentados",
  "camara:despesas": "Câmara: cota parlamentar",
  "senado:votacoes": "Senado: votações e comparecimento",
  "senado:proposicoes": "Senado: projetos apresentados",
  "senado:despesas": "Senado: cota parlamentar",
  "camara:comissoes": "Câmara: membros de comissões",
  "camara:reunioes": "Câmara: reuniões e presença em comissões",
  "senado:comissoes": "Senado: membros de comissões",
  "senado:relatorias": "Senado: relatorias",
  temas: "Temas das matérias votadas",
  tse: "Eleições (TSE): candidaturas, bens e doações",
  estatisticas: "Médias e comparações",
};

const HORAS = 3_600_000;

export default async function Status() {
  const tarefas = await statusIngestao();
  const ordem = Object.keys(DESCRICOES);
  tarefas.sort((a, b) => (ordem.indexOf(a.tarefa) + 1 || 99) - (ordem.indexOf(b.tarefa) + 1 || 99));
  const atrasadas = tarefas.filter((t) => !t.ultimoOk || Date.now() - t.ultimoOk.getTime() > 48 * HORAS);
  const comErro = tarefas.filter((t) => t.status === "erro" || t.status === "interrompida");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold">Status das atualizações</h1>
        <p className="text-sm text-suave">
          Os dados são copiados das fontes oficiais todo dia de manhã. Aqui você vê quando cada parte foi atualizada.
        </p>
      </div>
      <p
        role="status"
        className={`rounded-xl px-4 py-3 text-sm ${comErro.length || atrasadas.length ? "bg-alerta/10" : "bg-destaque-suave"}`}
      >
        {comErro.length === 0 && atrasadas.length === 0
          ? "Tudo em dia: todas as atualizações deram certo nas últimas 48 horas."
          : `${comErro.length ? `${comErro.length} com erro na última tentativa` : ""}${comErro.length && atrasadas.length ? " · " : ""}${atrasadas.length ? `${atrasadas.length} sem atualização há mais de 48 horas` : ""}.`}
      </p>
      <Secao titulo="Por fonte">
        <ul className="flex flex-col divide-y divide-borda text-sm">
          {tarefas.map((t) => (
            <li key={t.tarefa} className="flex flex-col gap-0.5 py-2">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{DESCRICOES[t.tarefa] ?? t.tarefa}</span>
                <span className={t.status === "ok" ? "text-bom" : t.status === "rodando" ? "text-alerta" : "text-ruim"}>
                  {{ ok: "ok", erro: "erro", interrompida: "interrompida", rodando: "em andamento" }[t.status]}
                </span>
              </div>
              <span className="text-xs text-suave">
                Última atualização com sucesso: {t.ultimoOk ? formatarDataHora(t.ultimoOk) : "nunca"}
                {t.status === "ok" && t.registros != null && ` · ${t.registros.toLocaleString("pt-BR")} registros`}
              </span>
              {t.status === "erro" && t.erro && <span className="text-xs text-ruim">{t.erro}</span>}
            </li>
          ))}
        </ul>
      </Secao>
    </div>
  );
}
