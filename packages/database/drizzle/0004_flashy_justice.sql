CREATE TABLE "chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tools_used" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;