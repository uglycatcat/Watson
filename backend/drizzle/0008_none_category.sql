UPDATE `categories`
SET `is_preset` = 1
WHERE `name_lower` = '无';
--> statement-breakpoint
INSERT INTO `categories` (`id`, `name`, `name_lower`, `is_preset`, `created_at`)
SELECT
  'system-none',
  '无',
  '无',
  1,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (
  SELECT 1 FROM `categories` WHERE `name_lower` = '无'
);
