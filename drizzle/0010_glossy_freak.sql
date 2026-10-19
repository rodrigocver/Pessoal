CREATE TABLE "afastamento" (
	"parlamentar_id" integer NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone,
	"motivo" text NOT NULL,
	"definitivo" boolean NOT NULL,
	"fonte_url" text NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "afastamento_parlamentar_id_inicio_pk" PRIMARY KEY("parlamentar_id","inicio")
);
--> statement-breakpoint
CREATE TABLE "substituicao" (
	"id" serial PRIMARY KEY NOT NULL,
	"titular_id" integer NOT NULL,
	"afastamento_inicio" timestamp with time zone NOT NULL,
	"suplente_id" integer,
	"suplente_nome" text NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone,
	"certeza" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "afastamento" ADD CONSTRAINT "afastamento_parlamentar_id_parlamentar_id_fk" FOREIGN KEY ("parlamentar_id") REFERENCES "public"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substituicao" ADD CONSTRAINT "substituicao_titular_id_parlamentar_id_fk" FOREIGN KEY ("titular_id") REFERENCES "public"."parlamentar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "substituicao" ADD CONSTRAINT "substituicao_suplente_id_parlamentar_id_fk" FOREIGN KEY ("suplente_id") REFERENCES "public"."parlamentar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "substituicao_titular" ON "substituicao" USING btree ("titular_id");--> statement-breakpoint
CREATE INDEX "substituicao_suplente" ON "substituicao" USING btree ("suplente_id");