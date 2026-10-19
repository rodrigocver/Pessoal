export function ComoCalculamos({ children }: { children: React.ReactNode }) {
  return (
    <details className="rounded-xl bg-fundo px-3 py-2 text-sm text-suave">
      <summary className="cursor-pointer select-none font-medium">Como calculamos</summary>
      <div className="mt-2 flex flex-col gap-2">
        {children}
        <a href="/metodologia" className="text-xs underline">
          Metodologia completa
        </a>
      </div>
    </details>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-4">
      <h2 className="font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}
