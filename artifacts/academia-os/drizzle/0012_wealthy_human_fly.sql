CREATE TABLE "curriculum_topics" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework_topics" (
	"homework_id" text NOT NULL,
	"topic_id" text NOT NULL,
	"school_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "homework" ADD COLUMN "source_type" text DEFAULT 'WRITTEN' NOT NULL;--> statement-breakpoint
ALTER TABLE "homework" ADD COLUMN "book_title" text;--> statement-breakpoint
ALTER TABLE "homework" ADD COLUMN "page_reference" text;--> statement-breakpoint
ALTER TABLE "homework" ADD COLUMN "attachment_name" text;--> statement-breakpoint
ALTER TABLE "homework" ADD COLUMN "attachment_mime_type" text;--> statement-breakpoint
ALTER TABLE "curriculum_topics" ADD CONSTRAINT "curriculum_topics_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_topics" ADD CONSTRAINT "curriculum_topics_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curriculum_topics" ADD CONSTRAINT "curriculum_topics_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_topics" ADD CONSTRAINT "homework_topics_homework_id_homework_id_fk" FOREIGN KEY ("homework_id") REFERENCES "public"."homework"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_topics" ADD CONSTRAINT "homework_topics_topic_id_curriculum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."curriculum_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework_topics" ADD CONSTRAINT "homework_topics_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "curriculum_topic_uq" ON "curriculum_topics" USING btree ("school_id","class_id","subject_id","name");--> statement-breakpoint
CREATE INDEX "curriculum_topic_class_subject_idx" ON "curriculum_topics" USING btree ("school_id","class_id","subject_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "homework_topic_uq" ON "homework_topics" USING btree ("homework_id","topic_id");--> statement-breakpoint
CREATE INDEX "homework_topic_school_idx" ON "homework_topics" USING btree ("school_id","topic_id");