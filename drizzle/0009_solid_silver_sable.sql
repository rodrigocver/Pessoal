CREATE TABLE "tema_consultado" (
	"casa" "casa" NOT NULL,
	"proposicao_ref" text NOT NULL,
	"consultado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tema_consultado_casa_proposicao_ref_pk" PRIMARY KEY("casa","proposicao_ref")
);
--> statement-breakpoint
CREATE TABLE "tema_proposicao" (
	"casa" "casa" NOT NULL,
	"proposicao_ref" text NOT NULL,
	"tema" text NOT NULL,
	CONSTRAINT "tema_proposicao_casa_proposicao_ref_tema_pk" PRIMARY KEY("casa","proposicao_ref","tema")
);
--> statement-breakpoint
ALTER TABLE "votacao" ADD COLUMN "proposicao_ref" text;