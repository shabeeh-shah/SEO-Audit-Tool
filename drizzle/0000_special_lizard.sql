CREATE TABLE `shared_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_json` text NOT NULL,
	`created_at` integer NOT NULL
);
