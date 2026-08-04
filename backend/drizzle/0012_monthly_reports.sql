CREATE TABLE `monthly_reports` (
  `month` text PRIMARY KEY NOT NULL,
  `goal` text DEFAULT '' NOT NULL,
  `result` text DEFAULT '' NOT NULL,
  `analysis` text DEFAULT '' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_monthly_reports_updated_at` ON `monthly_reports` (`updated_at`);
