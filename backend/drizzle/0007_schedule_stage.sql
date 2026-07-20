ALTER TABLE `schedule_cards`
ADD COLUMN `stage` text DEFAULT 'not_started' NOT NULL;
--> statement-breakpoint
CREATE INDEX `idx_cards_stage` ON `schedule_cards` (`stage`);
