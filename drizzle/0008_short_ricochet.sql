CREATE TABLE "tentativa_login" (
	"id" serial PRIMARY KEY NOT NULL,
	"chave" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tentativa_login_chave_criado" ON "tentativa_login" USING btree ("chave","criado_em");