CREATE TABLE "exercicio" (
	"parlamentar_id" integer NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone,
	"fonte_url" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercicio_parlamentar_id_inicio_pk" PRIMARY KEY("parlamentar_id","inicio")
);
--> statement-breakpoint
ALTER TABLE "exercicio" ADD CONSTRAINT "exercicio_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;