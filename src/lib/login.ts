// Quais formas de login existem. Sem nenhuma, o site funciona igual, só sem conta (lista e resumo mensal):
// é assim que ele fica no ar antes de configurar o e-mail (Resend) ou o Google. Ver DEPLOY.md.

/** Link de acesso impresso no terminal: só no desenvolvimento, ou ligado de propósito (AUTH_EMAIL_DEV=1) para
 *  testar um build local. Em produção ninguém veria o link. */
export const emailDesenvolvimento = () =>
  !process.env.AUTH_RESEND_KEY && (process.env.NODE_ENV !== "production" || process.env.AUTH_EMAIL_DEV === "1");

export const loginAtivo = () =>
  Boolean(process.env.AUTH_RESEND_KEY || process.env.AUTH_GOOGLE_ID) || emailDesenvolvimento();
