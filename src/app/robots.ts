import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/email";

// Dinâmico: APP_URL é lido na execução, não no build.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Páginas de conta: pessoais e sem conteúdo para buscadores.
      disallow: ["/api/", "/conta", "/minha-lista", "/entrar", "/descadastrar"],
    },
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
