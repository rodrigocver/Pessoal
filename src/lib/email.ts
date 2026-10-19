import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface Email {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  /** Endpoint que aceita POST, usado pelo botão "cancelar inscrição" do cliente de e-mail. */
  urlDescadastroUmClique: string;
}

const corpoResend = (e: Email) => ({
  from: process.env.EMAIL_FROM ?? "Fiscaliza <nao-responda@fiscaliza.app>",
  to: e.para,
  subject: e.assunto,
  html: e.html,
  text: e.texto,
  // Descadastro com um clique nos clientes de e-mail (Gmail, Apple Mail).
  headers: {
    "List-Unsubscribe": `<${e.urlDescadastroUmClique}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  },
});

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** POST ao Resend, tentando de novo quando o limite de envios por segundo é atingido (HTTP 429). */
async function postResend(caminho: string, corpo: unknown, tentativas = 6): Promise<unknown> {
  for (let i = 1; ; i++) {
    const res = await fetch(`https://api.resend.com${caminho}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    if (res.ok) return res.json();
    if (res.status === 429 && i < tentativas) {
      const aguardar = Number(res.headers.get("retry-after")) * 1000 || 2 ** i * 500;
      await esperar(aguardar);
      continue;
    }
    throw new Error(`Resend respondeu ${res.status}: ${await res.text()}`);
  }
}

async function gravarLocal(e: Email) {
  const pasta = path.join(process.cwd(), ".emails");
  await mkdir(pasta, { recursive: true });
  const arquivo = path.join(
    pasta,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${e.para.replace(/[^a-z0-9]/gi, "_")}.html`,
  );
  await writeFile(arquivo, e.html);
  return arquivo;
}

/**
 * Envia pelo Resend quando AUTH_RESEND_KEY existe (Fase 7). Sem ela, grava o e-mail em .emails/
 * para conferir no navegador durante o desenvolvimento.
 */
export async function enviarEmail(e: Email): Promise<string> {
  if (!process.env.AUTH_RESEND_KEY) return gravarLocal(e);
  return ((await postResend("/emails", corpoResend(e))) as { id: string }).id;
}

/** Até 100 e-mails numa única chamada (API de lote do Resend). Devolve os ids na mesma ordem. */
export const TAMANHO_LOTE_EMAIL = 100;
export async function enviarEmails(lote: Email[]): Promise<string[]> {
  if (lote.length > TAMANHO_LOTE_EMAIL)
    throw new Error(`lote com ${lote.length} e-mails (máximo ${TAMANHO_LOTE_EMAIL})`);
  if (lote.length === 0) return [];
  if (!process.env.AUTH_RESEND_KEY) return Promise.all(lote.map(gravarLocal));
  const r = (await postResend("/emails/batch", lote.map(corpoResend))) as { data: { id: string }[] };
  return r.data.map((x) => x.id);
}

export const baseUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const urlDescadastro = (token: string) => `${baseUrl()}/descadastrar?token=${encodeURIComponent(token)}`;
export const urlDescadastroUmClique = (token: string) =>
  `${baseUrl()}/api/descadastrar?token=${encodeURIComponent(token)}`;
