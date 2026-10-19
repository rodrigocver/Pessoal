"use client";

import Link from "next/link";
import { corVoto } from "@/lib/votos";
import { useConta } from "./conta";

export interface VotoCompacto {
  id: number;
  nome: string;
  rotulo: string; // "PT-SP"
  url: string;
  voto: string;
  suplente: boolean;
}

/** Votos de quem o usuário acompanha. A página da votação vem da CDN, igual para todos; o filtro é feito aqui. */
export function SeusNaVotacao({ votos }: { votos: VotoCompacto[] }) {
  const conta = useConta();
  const meus = conta?.logado ? votos.filter((v) => conta.seguidos.has(v.id)) : [];
  if (meus.length === 0) return null;
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-4">
      <h2 className="font-semibold">Seus parlamentares</h2>
      <ul className="grid gap-x-4 gap-y-1 py-1 text-sm sm:grid-cols-2">
        {meus.map((x) => (
          <li key={x.id} className="flex justify-between gap-2">
            <Link href={x.url} className="min-w-0 truncate hover:underline">
              {x.nome} <span className="text-suave">{x.rotulo}</span>
              {x.suplente && <span className="ml-1 text-xs text-suave">(suplente)</span>}
            </Link>
            <span className={`shrink-0 font-medium ${corVoto(x.voto)}`}>{x.voto}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
