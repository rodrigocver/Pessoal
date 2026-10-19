"use client";

import { useEffect, useState } from "react";
import type { ItemIndice } from "@/lib/busca";

let pedido: Promise<ItemIndice[]> | null = null;

/** Índice da busca, baixado uma vez por página (vem da CDN). `null` enquanto carrega. */
export function useIndice() {
  const [indice, setIndice] = useState<ItemIndice[] | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    pedido ??= fetch("/indice-busca.json").then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<ItemIndice[]>;
    });
    pedido.then(setIndice).catch(() => {
      pedido = null;
      setErro(true);
    });
  }, []);
  return { indice, erro };
}
