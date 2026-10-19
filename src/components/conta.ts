"use client";

import { useSyncExternalStore } from "react";
import { COOKIE_LOGADO } from "@/lib/cookies";

// Estado da conta no navegador, compartilhado por todos os componentes da página. As páginas públicas vêm
// iguais para todos (cache da CDN); o que é pessoal chega daqui depois.

export interface Conta {
  logado: boolean;
  seguidos: ReadonlySet<number>;
}

const ANONIMO: Conta = { logado: false, seguidos: new Set() };
let estado: Conta | null = null;
let pedido: Promise<void> | null = null;
const ouvintes = new Set<() => void>();

const avisar = () => ouvintes.forEach((f) => f());

// Cópia na aba do navegador: quem está logado e navega por várias páginas consulta /api/eu (e o banco) no máximo
// a cada 10 minutos, não a cada página.
const CHAVE = "fiscaliza-conta";
const VALIDADE_MS = 10 * 60_000;
function lerCopia(): Conta | null {
  try {
    const c = JSON.parse(sessionStorage.getItem(CHAVE) ?? "null") as { seguidos: number[]; em: number } | null;
    return c && Date.now() - c.em < VALIDADE_MS ? { logado: true, seguidos: new Set(c.seguidos) } : null;
  } catch {
    return null;
  }
}
function guardarCopia(c: Conta | null) {
  try {
    if (c?.logado) sessionStorage.setItem(CHAVE, JSON.stringify({ seguidos: [...c.seguidos], em: Date.now() }));
    else sessionStorage.removeItem(CHAVE);
  } catch {
    // Navegação privada ou armazenamento bloqueado: segue sem cópia.
  }
}
export const temCookieLogado = () => document.cookie.split("; ").includes(`${COOKIE_LOGADO}=1`);

function carregar() {
  if (pedido) return;
  if (!temCookieLogado()) {
    estado = ANONIMO;
    guardarCopia(null);
    pedido = Promise.resolve();
    avisar();
    return;
  }
  const copia = lerCopia();
  if (copia) {
    estado = copia;
    pedido = Promise.resolve();
    avisar();
    return;
  }
  pedido = fetch("/api/eu", { cache: "no-store" })
    .then((r) => r.json() as Promise<{ logado: boolean; seguidos: number[] }>)
    .then((d) => {
      estado = { logado: d.logado, seguidos: new Set(d.seguidos) };
      guardarCopia(estado);
    })
    .catch(() => {
      estado = ANONIMO;
    })
    .finally(avisar);
}

function assinar(f: () => void) {
  ouvintes.add(f);
  carregar();
  return () => ouvintes.delete(f);
}

/** `null` enquanto carrega (e no servidor). */
export const useConta = () =>
  useSyncExternalStore(
    assinar,
    () => estado,
    () => null,
  );

/** Atualiza na hora (antes da resposta do servidor); `false` desfaz se a ação falhar. */
export function marcarSeguido(id: number, seguindo: boolean) {
  if (!estado) return;
  const seguidos = new Set(estado.seguidos);
  if (seguindo) seguidos.add(id);
  else seguidos.delete(id);
  estado = { ...estado, seguidos };
  guardarCopia(estado);
  avisar();
}

/** Depois de entrar ou sair sem recarregar a página, o cookie de aviso muda: recarrega o estado. */
export function reavaliarConta() {
  if (!estado || estado.logado === temCookieLogado()) return;
  guardarCopia(null);
  estado = null;
  pedido = null;
  carregar();
}
