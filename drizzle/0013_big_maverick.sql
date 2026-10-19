CREATE TABLE "candidatura" (
	"id" serial PRIMARY KEY NOT NULL,
	"parlamentar_id" integer NOT NULL,
	"ano" integer NOT NULL,
	"cargo" text NOT NULL,
	"uf" text NOT NULL,
	"partido" text,
	"numero" text,
	"nome_urna" text,
	"situacao" text,
	"sq_candidato" text NOT NULL,
	"patrimonio" numeric(16, 2) DEFAULT '0' NOT NULL,
	"receita_total" numeric(16, 2) DEFAULT '0' NOT NULL,
	"fonte_url" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidatura_bem" (
	"candidatura_id" integer NOT NULL,
	"ordem" integer NOT NULL,
	"tipo" text NOT NULL,
	"valor" numeric(16, 2) NOT NULL,
	CONSTRAINT "candidatura_bem_candidatura_id_ordem_pk" PRIMARY KEY("candidatura_id","ordem")
);
--> statement-breakpoint
CREATE TABLE "candidatura_receita" (
	"candidatura_id" integer NOT NULL,
	"origem" text NOT NULL,
	"doador" text DEFAULT '' NOT NULL,
	"total" numeric(16, 2) NOT NULL,
	"doacoes" integer NOT NULL,
	"doadores" integer NOT NULL,
	CONSTRAINT "candidatura_receita_candidatura_id_origem_doador_pk" PRIMARY KEY("candidatura_id","origem","doador")
);
--> statement-breakpoint
ALTER TABLE "candidatura" ADD CONSTRAINT "candidatura_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidatura_bem" ADD CONSTRAINT "candidatura_bem_candidatura_id_candidatura_id_fk" FOREIGN KEY ("candidatura_id") REFERENCES "public"."candidatura"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidatura_receita" ADD CONSTRAINT "candidatura_receita_candidatura_id_candidatura_id_fk" FOREIGN KEY ("candidatura_id") REFERENCES "public"."candidatura"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "candidatura_unica" ON "candidatura" USING btree ("parlamentar_id","ano","cargo");--> statement-breakpoint
CREATE INDEX "candidatura_sq" ON "candidatura" USING btree ("sq_candidato");