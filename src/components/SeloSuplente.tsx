import Link from "next/link";
import type { suplenteNaVotacao } from "@/lib/consultas";
import { urlParlamentar } from "@/lib/formato";

/** Selo "suplente" e, quando se sabe, de quem era a vaga. Usado na página da votação e na aba Votações do perfil. */
export function SeloSuplente({ suplente }: { suplente: ReturnType<typeof suplenteNaVotacao> }) {
  if (!suplente) return null;
  const { titulares, certo } = suplente;
  return (
    <span className="block text-xs text-suave">
      <span className="mr-1 rounded bg-alerta/15 px-1.5 py-0.5 font-medium text-texto">suplente</span>
      {titulares.length === 0 ? (
        "vaga não identificada"
      ) : (
        <>
          {certo ? "na vaga de " : titulares.length === 1 ? "provavelmente na vaga de " : "na vaga de um destes: "}
          {titulares.map((t, i) => (
            <span key={t.idExterno}>
              {i > 0 && ", "}
              <Link href={urlParlamentar(t)} className="underline">
                {t.nome}
              </Link>
            </span>
          ))}
        </>
      )}
    </span>
  );
}
