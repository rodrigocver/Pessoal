"use client";

import { useSearchParams } from "next/navigation";

export function AvisoContaExcluida() {
  if (!useSearchParams().has("conta-excluida")) return null;
  return <p className="rounded-xl bg-destaque-suave px-4 py-3 text-sm">Sua conta e seus dados foram excluídos.</p>;
}
