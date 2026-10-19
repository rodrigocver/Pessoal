// CSV para abrir direto no Excel e no LibreOffice em português: separador ";", vírgula decimal, UTF-8 com BOM
// (sem ele o Excel lê os acentos errado) e quebra de linha CRLF.

export type Celula = string | number | boolean | Date | null | undefined;

const TZ = "America/Sao_Paulo";
const dataHora = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function texto(c: Celula): string {
  if (c == null) return "";
  if (typeof c === "boolean") return c ? "sim" : "não";
  if (typeof c === "number") return String(c).replace(".", ",");
  if (c instanceof Date) return dataHora.format(c); // "2025-04-08 14:00", horário de Brasília
  // Planilhas executam células que começam com =, +, - ou @ como fórmula; o apóstrofo impede.
  return /^[=+\-@\t\r]/.test(c) ? `'${c}` : c;
}

const campo = (c: Celula) => {
  const t = texto(c);
  return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export function paraCsv(colunas: string[], linhas: Celula[][]): string {
  return "﻿" + [colunas, ...linhas].map((l) => l.map(campo).join(";")).join("\r\n") + "\r\n";
}
