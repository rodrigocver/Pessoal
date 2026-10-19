import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { TOKEN_SESSAO } from "./sessao";

// Cenário de tests/integracao/dados.ts: Ana Souza (Câmara, id 1), Beto Lima (suplente, id 2),
// Carla Dias (Senado, id 3), Davi Rocha (titular afastado, id 4), votação "v1" em 2025.

const PAGINAS = [
  "/",
  "/buscar?q=ana",
  "/parlamentar/camara/1",
  "/parlamentar/camara/1/presenca/2025",
  "/parlamentar/camara/1/votacoes/2025",
  "/parlamentar/camara/1/proposicoes/2025",
  "/parlamentar/camara/1/comissoes/2025",
  "/parlamentar/camara/1/gastos/2025",
  "/parlamentar/camara/1/eleicoes",
  "/parlamentar/camara/2/votacoes/2025",
  "/parlamentar/senado/3",
  "/votacao/camara/v1",
  "/comparar",
  "/comparar/camara/1/camara/2/2025",
  "/metodologia",
  "/status",
  "/offline",
];

for (const caminho of PAGINAS) {
  test(`abre sem erro e sem problema de acessibilidade: ${caminho}`, async ({ page }) => {
    const erros: string[] = [];
    page.on("pageerror", (e) => erros.push(e.message));
    const res = await page.goto(caminho);
    expect(res?.status()).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(erros).toEqual([]);
  });
}

test("busca no navegador: sem acento, titulares afastados por padrão", async ({ page }) => {
  await page.goto("/buscar?q=ANA");
  await expect(page.getByRole("link", { name: "Ana Souza" }).first()).toBeVisible();
  await page.goto("/buscar?q=davi");
  await expect(page.getByText("Afastado · suplente no lugar")).toBeVisible();
  await page.goto("/buscar?q=jose");
  await expect(page.getByRole("status")).toHaveText("0 resultado(s)");
  await page.getByLabel(/Incluir quem não está mais em exercício/).check();
  await page.getByRole("button", { name: "Filtrar" }).click();
  await expect(page.getByRole("link", { name: "Beto Lima" }).first()).toBeVisible();
});

test("perfil: selo de voto como suplente e link para o perfil oficial", async ({ page }) => {
  await page.goto("/parlamentar/camara/2/votacoes/2025");
  await expect(page.getByText("suplentena vaga de Davi Rocha")).toBeVisible();
  await expect(page.getByRole("link", { name: "Perfil oficial na Câmara" })).toHaveAttribute(
    "href",
    "https://www.camara.leg.br/deputados/2",
  );
});

test("endereços antigos com ? redirecionam; caminhos inválidos dão 404", async ({ page }) => {
  await page.goto("/parlamentar/camara/1?aba=votacoes&periodo=2025");
  await expect(page).toHaveURL(/\/parlamentar\/camara\/1\/votacoes\/2025$/);
  await page.goto("/comparar?a=camara/1&b=camara/2&periodo=2025");
  await expect(page).toHaveURL(/\/comparar\/camara\/1\/camara\/2\/2025$/);
  expect((await page.goto("/parlamentar/camara/1/inventada"))?.status()).toBe(404);
  expect((await page.goto("/parlamentar/camara/999"))?.status()).toBe(404);
});

test("CSV da aba de gastos", async ({ request }) => {
  const res = await request.get("/dados/camara/1/gastos-2025.csv");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/csv");
  const texto = await res.text();
  expect(texto.startsWith("﻿data;competencia;categoria")).toBe(true);
  expect(texto).toContain("COMBUSTÍVEIS");
});

test("logado: acompanhar, ver na lista e na votação, deixar de acompanhar", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "authjs.session-token", value: TOKEN_SESSAO, url: baseURL! }]);
  const acompanhando = page.getByRole("button", { name: "✓ Acompanhando" });
  // Começa do zero, mesmo que uma execução anterior tenha parado no meio.
  await page.goto("/minha-lista");
  await expect(page.locator("main button:disabled")).toHaveCount(0); // estado da conta carregado
  while ((await acompanhando.count()) > 0) {
    await acompanhando.first().click();
    await expect(page.locator("main button:disabled")).toHaveCount(0);
  }

  await page.goto("/parlamentar/camara/1");
  await expect(page.getByRole("link", { name: "Minha lista" })).toBeVisible();
  await page.getByRole("button", { name: "+ Acompanhar" }).click();
  // Habilitado de novo = o servidor confirmou (antes disso a navegação cancelaria a ação).
  await expect(acompanhando).toBeEnabled();

  await page.goto("/minha-lista");
  await expect(page.getByRole("link", { name: "Ana Souza" }).first()).toBeVisible();
  await page.goto("/votacao/camara/v1");
  await expect(page.getByRole("heading", { name: "Seus parlamentares" })).toBeVisible();

  // Na lista, deixar de acompanhar tira o cartão da página assim que o servidor confirma.
  await page.goto("/minha-lista");
  await acompanhando.click();
  await expect(page.getByText("Você ainda não acompanha ninguém.")).toBeVisible();
});
