CREATE TABLE "consents" (
	"user_id" uuid NOT NULL,
	"client_id" varchar(255) NOT NULL,
	"scopes" text NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "consents_user_id_client_id_pk" PRIMARY KEY("user_id","client_id")
);
--> statement-breakpoint
ALTER TABLE "authorization_codes" ALTER COLUMN "scopes" SET DATA TYPE text;