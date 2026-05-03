ALTER TABLE "clients" ADD COLUMN "allowed_origins" text[];--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "allowed_origins";