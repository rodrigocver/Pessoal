// Busca de parlamentares feita no navegador, sobre um índice estático (/indice-busca.json, ~900 linhas). Nenhuma
// busca chega ao servidor nem ao banco, o que permite milhões de acessos simultâneos. Mesma regra que valia na
// consulta SQL: sem acento e sem diferença de maiúsculas, no nome parlamentar e no nome completo.

export interface ItemIndice {
  id: number;
  casa: "CD" | "SF";
  idExterno: string;
  nome: string;
  nomeCompleto: string | null;
  partido: string | null;
  uf: string | null;
  fotoUrl: string | null;
  emExercicio: boolean;
  /** Afastamento em curso, se houver. */
  afastado: { desde: string; motivo: string; definitivo: boolean } | null;
}

export interface FiltrosBusca {
  q?: string;
  casa?: string;
  uf?: string;
  partido?: string;
  todos?: boolean;
}

export const LIMITE_BUSCA = 60;

export const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Relevância: nome que começa com o termo, depois alguma palavra do nome, depois o resto (inclui nome completo). */
function relevancia(nome: string, termo: string) {
  if (nome.startsWith(termo)) return 0;
  if ((" " + nome).includes(" " + termo)) return 1;
  if (nome.includes(termo)) return 2;
  return 3;
}

export function filtrarParlamentares(indice: ItemIndice[], f: FiltrosBusca, limite = LIMITE_BUSCA): ItemIndice[] {
  const termo = f.q?.trim() ? normalizar(f.q.trim()) : "";
  const uf = f.uf?.toUpperCase();
  const partido = f.partido?.toUpperCase();
  const casa = f.casa === "CD" || f.casa === "SF" ? f.casa : undefined;
  const achados: { p: ItemIndice; r: number; chave: string }[] = [];
  for (const p of indice) {
    if (casa && p.casa !== casa) continue;
    if (uf && p.uf !== uf) continue;
    if (partido && p.partido !== partido) continue;
    // Por padrão: quem está em exercício e também os titulares afastados (o eleitor procura quem elegeu,
    // mesmo que hoje um suplente ocupe a vaga).
    if (!f.todos && !p.emExercicio && !(p.afastado && !p.afastado.definitivo)) continue;
    const nome = normalizar(p.nome);
    if (termo && !nome.includes(termo) && !normalizar(p.nomeCompleto ?? "").includes(termo)) continue;
    achados.push({ p, r: termo ? relevancia(nome, termo) : 0, chave: nome });
  }
  achados.sort((a, b) => a.r - b.r || (a.chave < b.chave ? -1 : a.chave > b.chave ? 1 : 0));
  return achados.slice(0, limite).map((a) => a.p);
}

/** Estados e partidos de quem está em exercício, para os filtros. */
export function opcoesDoIndice(indice: ItemIndice[]) {
  const emExercicio = indice.filter((p) => p.emExercicio);
  const unicos = (v: (string | null)[]) => [...new Set(v.filter((x): x is string => !!x))].sort();
  return { ufs: unicos(emExercicio.map((p) => p.uf)), partidos: unicos(emExercicio.map((p) => p.partido)) };
}
