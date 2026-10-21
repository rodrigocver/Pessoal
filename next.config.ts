import type { NextConfig } from "next";
import { loginAtivo } from "./src/lib/login";

// No GitHub Codespaces o site abre num endereço *.app.github.dev: libera esse domínio para as ações do servidor
// (botão "Acompanhar") e para o recarregamento automático do modo de desenvolvimento.
const codespaces = process.env.CODESPACES ? [`*.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`] : [];

const nextConfig: NextConfig = {
  ...(codespaces.length && {
    allowedDevOrigins: codespaces,
    experimental: { serverActions: { allowedOrigins: codespaces } },
  }),
  // Fixado no build: as páginas são estáticas, iguais para todos, e escondem "Entrar" quando não há login.
  env: { NEXT_PUBLIC_LOGIN_ATIVO: loginAtivo() ? "1" : "" },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.camara.leg.br" },
      { protocol: "https", hostname: "www.senado.leg.br" },
    ],
  },
};

export default nextConfig;
