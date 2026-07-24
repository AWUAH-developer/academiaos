CREATE TABLE IF NOT EXISTS "packages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_per_term" numeric(12, 2) DEFAULT '0' NOT NULL,
	"max_learners" integer,
	"max_staff" integer,
	"features" jsonb DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "package_addons" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_per_term" numeric(12, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "school_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
	"package_id" text NOT NULL REFERENCES packages(id),
	"academic_year" text NOT NULL,
	"term" text NOT NULL,
	"start_date" timestamptz NOT NULL,
	"end_date" timestamptz NOT NULL,
	"base_amount" numeric(12, 2) NOT NULL,
	"addons_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_amount" numeric(12, 2) NOT NULL,
	"paid_amount" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"notes" text,
	"created_by_id" text REFERENCES users(id) ON DELETE SET NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	"updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "sub_school_idx" ON "school_subscriptions"("school_id","term","academic_year");

CREATE TABLE IF NOT EXISTS "subscription_addons" (
	"subscription_id" text NOT NULL REFERENCES school_subscriptions(id) ON DELETE CASCADE,
	"addon_id" text NOT NULL REFERENCES package_addons(id) ON DELETE CASCADE,
	"price_at_time" numeric(12, 2) NOT NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT "sub_addon_uq" UNIQUE("subscription_id","addon_id")
);

CREATE TABLE IF NOT EXISTS "subscription_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"subscription_id" text NOT NULL REFERENCES school_subscriptions(id) ON DELETE CASCADE,
	"school_id" text NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
	"amount" numeric(12, 2) NOT NULL,
	"method" text NOT NULL,
	"reference" text,
	"notes" text,
	"recorded_by_id" text REFERENCES users(id) ON DELETE SET NULL,
	"created_at" timestamptz DEFAULT now() NOT NULL
);

-- Seed default packages (skip if already seeded)
INSERT INTO packages (id, name, description, price_per_term, max_learners, max_staff, features, sort_order)
SELECT gen_random_uuid()::text, 'Starter', 'Core school management for small schools', '500.00', 200, 20,
   '["Admissions & learner records","Daily & term attendance","Fee collection & receipts","Basic reports","Smart ID cards"]', 1
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'Starter');

INSERT INTO packages (id, name, description, price_per_term, max_learners, max_staff, features, sort_order)
SELECT gen_random_uuid()::text, 'Standard', 'Full administration for growing schools', '1200.00', 600, 60,
   '["Everything in Starter","Academic results & approval workflow","Homework management","Parent & guardian portal","Internal messaging","Help desk"]', 2
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'Standard');

INSERT INTO packages (id, name, description, price_per_term, max_learners, max_staff, features, sort_order)
SELECT gen_random_uuid()::text, 'Premium', 'Complete platform for established schools', '2500.00', 2000, 150,
   '["Everything in Standard","Transport management","Mobile apps (Android & iOS)","Offline desktop app","Transport QR scanning","Staff movement requests"]', 3
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'Premium');

INSERT INTO packages (id, name, description, price_per_term, max_learners, max_staff, features, sort_order)
SELECT gen_random_uuid()::text, 'Enterprise', 'Multi-school administration — unlimited', '5000.00', NULL, NULL,
   '["Everything in Premium","Multi-school super admin","Unlimited learners & staff","Priority support","Custom onboarding"]', 4
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE name = 'Enterprise');

-- Seed default add-ons (skip if already seeded)
INSERT INTO package_addons (id, name, description, price_per_term, sort_order)
SELECT gen_random_uuid()::text, 'SMS Alerts', 'Automated SMS for attendance, fees and results to parents', '200.00', 1
WHERE NOT EXISTS (SELECT 1 FROM package_addons WHERE name = 'SMS Alerts');

INSERT INTO package_addons (id, name, description, price_per_term, sort_order)
SELECT gen_random_uuid()::text, 'Extra Storage', 'Additional 50 GB for photos, attachments and reports', '100.00', 2
WHERE NOT EXISTS (SELECT 1 FROM package_addons WHERE name = 'Extra Storage');

INSERT INTO package_addons (id, name, description, price_per_term, sort_order)
SELECT gen_random_uuid()::text, 'Priority Support', '4-hour response SLA with a dedicated account manager', '300.00', 3
WHERE NOT EXISTS (SELECT 1 FROM package_addons WHERE name = 'Priority Support');
