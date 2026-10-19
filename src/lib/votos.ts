/** Posições comparáveis entre votos e orientações (alinhamento, comparação). */
export const POSICOES = ["Sim", "Não", "Abstenção", "Obstrução"];

/** Votos em que o parlamentar de fato votou (exclui ausências e presença sem voto). */
export const VOTOS_EFETIVOS = ["Sim", "Não", "Abstenção", "Obstrução", "Votou (secreto)"];

const COR_VOTO: Record<string, string> = {
  Sim: "text-bom",
  Não: "text-ruim",
  Obstrução: "text-alerta",
  Abstenção: "text-alerta",
};

/** Classe de cor do voto: ausências riscadas e esmaecidas, demais neutras. */
export const corVoto = (v: string) =>
  COR_VOTO[v] ?? (v.startsWith("Ausente") || v === "Não compareceu" ? "text-suave line-through" : "text-suave");
