"use client";

import Link from "next/link";
import { useTransition } from "react";
import { seguir, deixarDeSeguir } from "@/app/acoes";
import { marcarSeguido, useConta } from "./conta";

export function BotaoSeguir({ parlamentarId }: { parlamentarId: number }) {
  const conta = useConta();
  const [enviando, iniciar] = useTransition();
  const base = "rounded-full px-3 py-1.5 text-sm font-medium transition-colors";
  // Enquanto descobre se há login (página vem igual para todos da CDN), o botão espera, sem levar a "Entrar".
  if (!conta)
    return (
      <button type="button" disabled className={`${base} border border-destaque text-destaque opacity-60`}>
        + Acompanhar
      </button>
    );
  // Site ainda sem login configurado: nada para acompanhar.
  if (!conta.logado && !process.env.NEXT_PUBLIC_LOGIN_ATIVO) return null;
  if (!conta.logado)
    return (
      <Link href="/entrar" className={`${base} border border-destaque text-destaque`}>
        + Acompanhar
      </Link>
    );
  const seguindo = conta.seguidos.has(parlamentarId);
  const alternar = () =>
    iniciar(async () => {
      marcarSeguido(parlamentarId, !seguindo);
      try {
        await (seguindo ? deixarDeSeguir(parlamentarId) : seguir(parlamentarId));
      } catch {
        marcarSeguido(parlamentarId, seguindo);
      }
    });
  return (
    <button
      type="button"
      onClick={alternar}
      disabled={enviando}
      aria-pressed={seguindo}
      className={
        seguindo
          ? `${base} bg-destaque-suave text-destaque`
          : `${base} border border-destaque text-destaque hover:bg-destaque-suave`
      }
    >
      {seguindo ? "✓ Acompanhando" : "+ Acompanhar"}
    </button>
  );
}
