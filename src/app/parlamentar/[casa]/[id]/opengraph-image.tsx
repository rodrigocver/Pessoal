import { ImageResponse } from "next/og";
import { obterParlamentar, resumos } from "@/lib/consultas";
import { resolverPeriodo } from "@/lib/periodo";
import { CASAS, formatarPct, formatarReais, type SlugCasa } from "@/lib/formato";

export const alt = "Resumo da atuação do parlamentar no Fiscaliza";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Gerada uma vez por parlamentar e servida da CDN (cada compartilhamento busca a imagem).
export const revalidate = 3600;
export const generateStaticParams = () => [];

/** Baixa a foto oficial; se falhar, o cartão sai com a inicial do nome. */
async function fotoComoDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;
    const tipo = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${tipo};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Imagem({ params }: { params: Promise<{ casa: string; id: string }> }) {
  const { casa, id } = await params;
  const p = casa in CASAS ? await obterParlamentar(CASAS[casa as SlugCasa].casa, id) : null;
  if (!p) return new ImageResponse(<div style={{ display: "flex" }}>Fiscaliza</div>, size);

  const periodo = resolverPeriodo(undefined); // ano corrente
  const [r, foto] = await Promise.all([resumos([p.id], periodo).then((m) => m.get(p.id)), fotoComoDataUrl(p.fotoUrl)]);
  const numeros = [
    {
      rotulo: p.casa === "SF" ? "presença nas votações nominais" : "presença em plenário",
      valor: formatarPct(r?.presenca ?? null),
    },
    { rotulo: "votos em votações nominais", valor: String(r?.votos ?? 0) },
    { rotulo: "gastos da cota", valor: formatarReais(r?.gastos ?? 0, true) },
  ];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: "#f7f7f5",
        color: "#1c1c1a",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        {foto ? (
          <img src={foto} width={180} height={180} style={{ borderRadius: 999, objectFit: "cover" }} alt="" />
        ) : (
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: 999,
              background: "#e3f1f0",
              color: "#0f6e6a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 88,
              fontWeight: 700,
            }}
          >
            {p.nome.slice(0, 1)}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 64, fontWeight: 700 }}>{p.nome}</div>
          <div style={{ fontSize: 32, color: "#5f5f5a" }}>
            {`${CASAS[casa as SlugCasa].cargo} · ${p.partido ?? "sem partido"}-${p.uf ?? ""}`}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 24 }}>
        {numeros.map((n) => (
          <div
            key={n.rotulo}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: "#ffffff",
              borderRadius: 24,
              padding: "28px 32px",
            }}
          >
            <div style={{ fontSize: 52, fontWeight: 700 }}>{n.valor}</div>
            <div style={{ fontSize: 26, color: "#5f5f5a" }}>{n.rotulo}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#5f5f5a" }}>
        <div style={{ color: "#0f6e6a", fontWeight: 700 }}>Fiscaliza</div>
        <div>{`Dados oficiais da Câmara e do Senado · ${periodo.rotulo}`}</div>
      </div>
    </div>,
    size,
  );
}
