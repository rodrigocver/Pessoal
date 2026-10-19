export const CAMARA_API = "https://dadosabertos.camara.leg.br/api/v2";
export const SENADO_API = "https://legis.senado.leg.br/dadosabertos";

/** Primeira legislatura com dados no Fiscaliza (2023–2027). */
export const PRIMEIRA_LEGISLATURA = 57;

// A legislatura dura quatro anos e começa em 1º de fevereiro (Constituição, art. 44, parágrafo único).
// A 57ª começou em 01/02/2023; daí calculamos qualquer outra sem depender das APIs.
const ANO_INICIO_57 = 2023;

/** Data de início (1º/02) da legislatura `n`, no horário de Brasília. */
export const inicioLegislatura = (n: number) => new Date(`${ANO_INICIO_57 + 4 * (n - 57)}-02-01T00:00:00-03:00`);

/** Primeiro instante após o fim da legislatura `n` (= início da seguinte). */
export const fimLegislatura = (n: number) => inicioLegislatura(n + 1);

/** Número da legislatura em curso na data. */
export function legislaturaEm(data = new Date()): number {
  let n = 57 + Math.floor((data.getTime() - inicioLegislatura(57).getTime()) / (4 * 365.25 * 24 * 3600 * 1000));
  // Corrige arredondamentos perto da virada (anos bissextos).
  while (data < inicioLegislatura(n)) n--;
  while (data >= fimLegislatura(n)) n++;
  return n;
}

/** Legislaturas com dados no Fiscaliza, da primeira até a atual. */
export function legislaturasComDados(hoje = new Date()): number[] {
  const atual = legislaturaEm(hoje);
  return Array.from({ length: Math.max(atual - PRIMEIRA_LEGISLATURA + 1, 1) }, (_, i) => PRIMEIRA_LEGISLATURA + i);
}
