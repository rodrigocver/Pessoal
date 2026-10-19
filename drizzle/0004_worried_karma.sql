CREATE TABLE "estatistica" (
	"parlamentar_id" integer NOT NULL,
	"periodo" text NOT NULL,
	"sessoes" integer NOT NULL,
	"presencas" integer NOT NULL,
	"votos" integer NOT NULL,
	"gastos" numeric(14, 2) NOT NULL,
	"proposicoes" integer NOT NULL,
	"alinh_partido_iguais" integer NOT NULL,
	"alinh_partido_total" integer NOT NULL,
	"alinh_governo_iguais" integer NOT NULL,
	"alinh_governo_total" integer NOT NULL,
	"calculado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "estatistica_parlamentar_id_periodo_pk" PRIMARY KEY("parlamentar_id","periodo")
);
--> statement-breakpoint
ALTER TABLE "voto" ADD COLUMN "partido" text;--> statement-breakpoint
ALTER TABLE "estatistica" ADD CONSTRAINT "estatistica_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;