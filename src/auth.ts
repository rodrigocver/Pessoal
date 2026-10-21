import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db, schema } from "@/db/client";
import { emailDesenvolvimento } from "@/lib/login";

// Provedores habilitados conforme as variáveis de ambiente (contas externas só na Fase 7).
const providers: Provider[] = [];
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);
if (process.env.AUTH_RESEND_KEY) {
  providers.push(Resend({ from: process.env.EMAIL_FROM ?? "Fiscaliza <nao-responda@fiscaliza.app>" }));
} else if (emailDesenvolvimento()) {
  // Desenvolvimento: o link mágico é impresso no terminal em vez de enviado por e-mail.
  providers.push({
    id: "email-dev",
    name: "E-mail",
    type: "email",
    maxAge: 24 * 60 * 60,
    async sendVerificationRequest({ identifier, url }) {
      console.log(`\n🔑 Link de acesso para ${identifier}:\n${url}\n`);
    },
  } as Provider);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.usuario,
    accountsTable: schema.conta,
    sessionsTable: schema.sessaoUsuario,
    verificationTokensTable: schema.tokenVerificacao,
  }),
  providers,
  pages: { signIn: "/entrar", verifyRequest: "/entrar/verifique" },
  trustHost: true,
});

export const provedorEmail = process.env.AUTH_RESEND_KEY ? "resend" : "email-dev";
export const temEmail = Boolean(process.env.AUTH_RESEND_KEY) || emailDesenvolvimento();
export const temGoogle = Boolean(process.env.AUTH_GOOGLE_ID);
