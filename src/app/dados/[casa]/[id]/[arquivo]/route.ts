import { obterParlamentar } from "@/lib/consultas";
import { lerArquivoCsv } from "@/lib/caminhos";
import { ABAS_CSV, csvDoPerfil, type AbaCsv } from "@/lib/exportar";
import { CASAS, type SlugCasa } from "@/lib/formato";
import { periodosDisponiveis } from "@/lib/periodo";
import { normalizar } from "@/lib/busca";

// Cada arquivo é gerado uma vez e servido da CDN, como as páginas; a ingestão diária renova.
export const dynamic = "force-static";
export const revalidate = 3600;
export const generateStaticParams = () => [];

const naoEncontrado = () => new Response("Arquivo não encontrado.", { status: 404 });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ casa: string; id: string; arquivo: string }> },
) {
  const { casa, id, arquivo } = await params;
  const pedido = lerArquivoCsv(arquivo);
  const periodo = periodosDisponiveis().find((x) => x.valor === pedido?.periodo);
  if (!(casa in CASAS) || !pedido || !periodo || !ABAS_CSV.includes(pedido.aba as AbaCsv)) return naoEncontrado();
  const p = await obterParlamentar(CASAS[casa as SlugCasa].casa, id);
  if (!p) return naoEncontrado();
  const nome = `${normalizar(p.nome).replace(/[^a-z0-9]+/g, "-")}-${pedido.aba}-${periodo.valor}.csv`;
  return new Response(await csvDoPerfil(p, pedido.aba as AbaCsv, periodo), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
    },
  });
}
