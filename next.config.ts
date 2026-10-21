import type { NextConfig } from "next";
import { loginAtivo } from "./src/lib/login";

const nextConfig: NextConfig = {
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
