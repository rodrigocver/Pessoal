import { indiceBusca } from "@/lib/consultas";

// Arquivo estático para a busca no navegador: gerado a partir do banco e servido da CDN.
export const revalidate = 3600;

export async function GET() {
  return Response.json(await indiceBusca());
}
