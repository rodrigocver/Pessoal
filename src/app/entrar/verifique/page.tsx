import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verifique seu e-mail" };

export default function Verifique() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 py-8">
      <h1 className="text-2xl font-semibold">Verifique seu e-mail</h1>
      <p className="rounded-xl bg-destaque-suave px-4 py-3 text-sm">
        Enviamos um link de acesso para o seu e-mail. Abra-o neste aparelho para entrar. O link vale por 24 horas.
      </p>
    </div>
  );
}
