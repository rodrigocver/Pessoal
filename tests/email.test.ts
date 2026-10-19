import { afterEach, describe, expect, it, vi } from "vitest";
import { enviarEmails, type Email } from "@/lib/email";

const email = (para: string): Email => ({
  para,
  assunto: "Resumo",
  html: "<p>oi</p>",
  texto: "oi",
  urlDescadastroUmClique: "https://x/api/descadastrar?token=t",
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("enviarEmails", () => {
  it("envia o lote numa chamada e tenta de novo no limite de taxa (429)", async () => {
    vi.stubEnv("AUTH_RESEND_KEY", "chave");
    const respostas = [
      new Response("limite", { status: 429, headers: { "retry-after": "0.01" } }),
      Response.json({ data: [{ id: "a" }, { id: "b" }] }),
    ];
    const fetch = vi.fn(async () => respostas.shift()!);
    vi.stubGlobal("fetch", fetch);
    expect(await enviarEmails([email("a@x.com"), email("b@x.com")])).toEqual(["a", "b"]);
    expect(fetch).toHaveBeenCalledTimes(2);
    const [url, init] = fetch.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails/batch");
    const corpo = JSON.parse(String(init.body));
    expect(corpo.map((c: { to: string }) => c.to)).toEqual(["a@x.com", "b@x.com"]);
    expect(corpo[0].headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
  });

  it("recusa lote acima de 100 e falha em erro que não é de limite", async () => {
    vi.stubEnv("AUTH_RESEND_KEY", "chave");
    await expect(enviarEmails(Array.from({ length: 101 }, (_, i) => email(`${i}@x.com`)))).rejects.toThrow();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("ruim", { status: 422 })),
    );
    await expect(enviarEmails([email("a@x.com")])).rejects.toThrow(/422/);
  });
});
