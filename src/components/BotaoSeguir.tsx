import Link from "next/link";
import { seguir, deixarDeSeguir } from "@/app/acoes";

export function BotaoSeguir({
  parlamentarId,
  seguindo,
  logado,
  caminho,
}: {
  parlamentarId: number;
  seguindo: boolean;
  logado: boolean;
  caminho: string;
}) {
  const base = "rounded-full px-3 py-1.5 text-sm font-medium transition-colors";
  if (!logado)
    return (
      <Link href="/entrar" className={`${base} border border-destaque text-destaque`}>
        + Acompanhar
      </Link>
    );
  const acao = seguindo ? deixarDeSeguir.bind(null, parlamentarId, caminho) : seguir.bind(null, parlamentarId, caminho);
  return (
    <form action={acao}>
      <button
        className={seguindo ? `${base} bg-destaque-suave text-destaque` : `${base} border border-destaque text-destaque hover:bg-destaque-suave`}
      >
        {seguindo ? "✓ Acompanhando" : "+ Acompanhar"}
      </button>
    </form>
  );
}
