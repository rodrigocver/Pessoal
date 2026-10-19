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

/**
 * Envia pelo Resend quando AUTH_RESEND_KEY existe (Fase 7). Sem ela, grava o e-mail em .emails/
 * para conferir no navegador durante o desenvolvimento.
 */
export async function enviarEmail(e: Email): Promise<string> {
  const chave = process.env.AUTH_RESEND_KEY;
  if (!chave) {
    const pasta = path.join(process.cwd(), ".emails");
    await mkdir(pasta, { recursive: true });
    const arquivo = path.join(
      pasta,
      `${new Date().toISOString().replace(/[:.]/g, "-")}-${e.para.replace(/[^a-z0-9]/gi, "_")}.html`,
    );
    await writeFile(arquivo, e.html);
    return arquivo;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
    body: JSON.stringify({
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
    }),
  });
  if (!res.ok) throw new Error(`Resend respondeu ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

export const baseUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const urlDescadastro = (token: string) => `${baseUrl()}/descadastrar?token=${encodeURIComponent(token)}`;
export const urlDescadastroUmClique = (token: string) =>
  `${baseUrl()}/api/descadastrar?token=${encodeURIComponent(token)}`;
