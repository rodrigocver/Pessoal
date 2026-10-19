/** Cookie legível pelo navegador que só diz "há sessão" (não é a sessão, que continua httpOnly). Visitantes sem
 *  ele nunca consultam `/api/eu`, então as páginas públicas, servidas da CDN, não tocam no banco. */
export const COOKIE_LOGADO = "fiscaliza-logado";
