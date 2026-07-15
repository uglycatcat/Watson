CREATE TABLE `schedule_cards_new` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `title_lower` text NOT NULL,
  `description` text,
  `time_nature` text,
  `start_at` text,
  `end_at` text,
  `deadline_at` text,
  `importance` integer DEFAULT 5 NOT NULL,
  `urgency` integer DEFAULT 5 NOT NULL,
  `category_id` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `schedule_cards_new` (
  `id`, `title`, `title_lower`, `description`, `time_nature`,
  `start_at`, `end_at`, `deadline_at`, `importance`, `urgency`,
  `category_id`, `created_at`, `updated_at`
)
SELECT
  `id`, `title`, `title_lower`, `description`, `time_nature`,
  `start_at`, `end_at`, `deadline_at`,
  CASE `importance` WHEN 'high' THEN 8 WHEN 'medium' THEN 5 WHEN 'low' THEN 2 ELSE 5 END,
  CASE `urgency` WHEN 'high' THEN 8 WHEN 'medium' THEN 5 WHEN 'low' THEN 2 ELSE 5 END,
  `category_id`, `created_at`, `updated_at`
FROM `schedule_cards`;
--> statement-breakpoint
DROP TABLE `schedule_cards`;
--> statement-breakpoint
ALTER TABLE `schedule_cards_new` RENAME TO `schedule_cards`;
--> statement-breakpoint
CREATE UNIQUE INDEX `schedule_cards_title_lower_unique` ON `schedule_cards` (`title_lower`);
--> statement-breakpoint
CREATE INDEX `idx_cards_start_at` ON `schedule_cards` (`start_at`);
--> statement-breakpoint
CREATE INDEX `idx_cards_deadline_at` ON `schedule_cards` (`deadline_at`);
--> statement-breakpoint
CREATE INDEX `idx_cards_updated_at` ON `schedule_cards` (`updated_at`);
--> statement-breakpoint
CREATE INDEX `idx_cards_category` ON `schedule_cards` (`category_id`);
