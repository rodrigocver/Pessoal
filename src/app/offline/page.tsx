import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sem conexão" };

export default function Offline() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-3 py-12 text-center">
      <h1 className="text-2xl font-semibold">Sem conexão</h1>
      <p className="text-sm text-suave">
        Você está offline. Os perfis que você já abriu continuam disponíveis; o restante volta quando a conexão voltar.
      </p>
    </div>
  );
}
