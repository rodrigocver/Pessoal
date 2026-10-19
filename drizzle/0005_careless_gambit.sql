CREATE TABLE "envio_resumo" (
	"usuario_id" text NOT NULL,
	"mes" text NOT NULL,
	"enviado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "envio_resumo_usuario_id_mes_pk" PRIMARY KEY("usuario_id","mes")
);
--> statement-breakpoint
ALTER TABLE "envio_resumo" ADD CONSTRAINT "envio_resumo_usuario_id_user_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;