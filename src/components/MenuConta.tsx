"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { reavaliarConta, temCookieLogado } from "./conta";

/** Links do cabeçalho que dependem de login. Lê só o cookie de aviso, sem consultar o servidor, para o
 *  cabeçalho (igual em todas as páginas em cache) não custar nada a quem não está logado. */
export function MenuConta() {
  const [logado, setLogado] = useState(false);
  const caminho = usePathname();
  useEffect(() => {
    setLogado(temCookieLogado());
    reavaliarConta();
  }, [caminho]);
  return (
    <>
      {logado && (
        <Link href="/minha-lista" className="text-suave hover:text-texto">
          Minha lista
        </Link>
      )}
      <span className="ml-auto" />
      {logado ? (
        <Link href="/conta" className="text-suave hover:text-texto">
          Conta
        </Link>
      ) : (
        <Link href="/entrar" className="rounded-full bg-destaque px-3 py-1.5 font-medium text-fundo">
          Entrar
        </Link>
      )}
    </>
  );
}
