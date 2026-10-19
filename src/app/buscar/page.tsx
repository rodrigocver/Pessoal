import type { Metadata } from "next";
import { Suspense } from "react";
import { Busca } from "@/components/Busca";

export const metadata: Metadata = { title: "Buscar parlamentares" };

// Página estática: os resultados são calculados no navegador, sobre o índice /indice-busca.json.
export default function Buscar() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold">Buscar parlamentares</h1>
      <Suspense>
        <Busca />
      </Suspense>
    </div>
  );
}
