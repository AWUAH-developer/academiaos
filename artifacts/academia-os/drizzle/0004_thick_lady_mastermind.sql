CREATE TABLE "mobile_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"school_id" text,
	"device_identifier" text NOT NULL,
	"device_name" text,
	"platform" text NOT NULL,
	"app_version" text,
	"push_token" text,
	"notifications_enabled" boolean DEFAULT true NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mobile_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"access_token_hash" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"access_expires_at" timestamp with time zone NOT NULL,
	"refresh_expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_rotated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mobile_sessions_access_token_hash_unique" UNIQUE("access_token_hash"),
	CONSTRAINT "mobile_sessions_refresh_token_hash_unique" UNIQUE("refresh_token_hash")
);
--> statement-breakpoint
ALTER TABLE "mobile_devices" ADD CONSTRAINT "mobile_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_devices" ADD CONSTRAINT "mobile_devices_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_sessions" ADD CONSTRAINT "mobile_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mobile_sessions" ADD CONSTRAINT "mobile_sessions_device_id_mobile_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."mobile_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mobile_device_user_identifier_uq" ON "mobile_devices" USING btree ("user_id","device_identifier");--> statement-breakpoint
CREATE INDEX "mobile_device_user_idx" ON "mobile_devices" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE INDEX "mobile_device_push_token_idx" ON "mobile_devices" USING btree ("push_token");--> statement-breakpoint
CREATE INDEX "mobile_session_user_idx" ON "mobile_sessions" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE INDEX "mobile_session_device_idx" ON "mobile_sessions" USING btree ("device_id","revoked_at");--> statement-breakpoint
CREATE INDEX "mobile_session_access_expiry_idx" ON "mobile_sessions" USING btree ("access_expires_at");--> statement-breakpoint
CREATE INDEX "mobile_session_refresh_expiry_idx" ON "mobile_sessions" USING btree ("refresh_expires_at");