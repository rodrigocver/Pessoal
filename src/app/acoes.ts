"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn, signOut, provedorEmail } from "@/auth";
import { db, schema } from "@/db/client";

async function usuarioAtual() {
  const sessao = await auth();
  if (!sessao?.user?.id) redirect("/entrar");
  return sessao.user.id;
}

export async function seguir(parlamentarId: number, caminho: string) {
  const usuarioId = await usuarioAtual();
  await db.insert(schema.seguindo).values({ usuarioId, parlamentarId }).onConflictDoNothing();
  revalidatePath(caminho);
  revalidatePath("/minha-lista");
}

export async function deixarDeSeguir(parlamentarId: number, caminho: string) {
  const usuarioId = await usuarioAtual();
  await db
    .delete(schema.seguindo)
    .where(and(eq(schema.seguindo.usuarioId, usuarioId), eq(schema.seguindo.parlamentarId, parlamentarId)));
  revalidatePath(caminho);
  revalidatePath("/minha-lista");
}

export async function entrarComEmail(formData: FormData) {
  await signIn(provedorEmail, {
    email: String(formData.get("email") ?? ""),
    redirectTo: "/minha-lista",
    redirect: false,
  });
  redirect("/entrar/verifique");
}

export async function entrarComGoogle() {
  await signIn("google", { redirectTo: "/minha-lista" });
}

export async function sair() {
  await signOut({ redirectTo: "/" });
}

export async function alternarResumoMensal(ativo: boolean) {
  const usuarioId = await usuarioAtual();
  await db.update(schema.usuario).set({ resumoMensal: ativo }).where(eq(schema.usuario.id, usuarioId));
  revalidatePath("/conta");
}

/** AUTH-02: apaga a conta; lista, sessões e vínculos saem em cascata. */
export async function excluirConta() {
  const usuarioId = await usuarioAtual();
  await db.delete(schema.usuario).where(eq(schema.usuario.id, usuarioId));
  await signOut({ redirectTo: "/?conta-excluida=1" });
}
