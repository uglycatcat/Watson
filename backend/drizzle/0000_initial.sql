CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_lower` text NOT NULL,
	`is_preset` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_lower_unique` ON `categories` (`name_lower`);--> statement-breakpoint
CREATE TABLE `schedule_cards` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`time_nature` text NOT NULL,
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
CREATE INDEX `idx_cards_start_at` ON `schedule_cards` (`start_at`);--> statement-breakpoint
CREATE INDEX `idx_cards_deadline_at` ON `schedule_cards` (`deadline_at`);--> statement-breakpoint
CREATE INDEX `idx_cards_updated_at` ON `schedule_cards` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_cards_category` ON `schedule_cards` (`category_id`);--> statement-breakpoint
CREATE TABLE `owner_preferences` (
	`id` integer PRIMARY KEY NOT NULL,
	`due_soon_days` integer DEFAULT 7 NOT NULL,
	`theme` text DEFAULT 'system' NOT NULL,
	`timezone` text DEFAULT 'Asia/Shanghai' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`pending_action` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`tool_calls` text,
	`related_card_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
