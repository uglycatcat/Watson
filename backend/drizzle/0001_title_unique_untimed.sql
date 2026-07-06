ALTER TABLE `schedule_cards` ADD COLUMN `title_lower` text;
--> statement-breakpoint
UPDATE `schedule_cards` SET `title_lower` = lower(trim(`title`));
--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    title,
    row_number() OVER (PARTITION BY lower(trim(title)) ORDER BY created_at ASC) AS rn
  FROM schedule_cards
)
UPDATE schedule_cards
SET
  title = (
    SELECT CASE WHEN r.rn > 1 THEN r.title || ' (' || r.rn || ')' ELSE r.title END
    FROM ranked r WHERE r.id = schedule_cards.id
  ),
  title_lower = (
    SELECT lower(trim(CASE WHEN r.rn > 1 THEN r.title || ' (' || r.rn || ')' ELSE r.title END))
    FROM ranked r WHERE r.id = schedule_cards.id
  );
--> statement-breakpoint
CREATE TABLE `schedule_cards_new` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `title_lower` text NOT NULL,
  `description` text,
  `time_nature` text,
  `start_at` text,
  `end_at` text,
  `deadline_at` text,
  `importance` text DEFAULT 'medium' NOT NULL,
  `urgency` text DEFAULT 'medium' NOT NULL,
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
  `start_at`, `end_at`, `deadline_at`, `importance`, `urgency`,
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
