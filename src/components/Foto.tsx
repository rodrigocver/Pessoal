import Image from "next/image";

export function Foto({ url, nome, tamanho = 56 }: { url: string | null; nome: string; tamanho?: number }) {
  if (!url)
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-destaque-suave font-semibold text-destaque"
        style={{ width: tamanho, height: tamanho }}
      >
        {nome.slice(0, 1)}
      </div>
    );
  return (
    <Image
      src={url}
      alt={`Foto de ${nome}`}
      width={tamanho}
      height={tamanho}
      className="shrink-0 rounded-full bg-borda object-cover object-top"
      style={{ width: tamanho, height: tamanho }}
    />
  );
}
