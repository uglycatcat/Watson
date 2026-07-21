ALTER TABLE `categories` ADD `color` text;
--> statement-breakpoint
UPDATE `categories` SET `color` = CASE `color_index`
  WHEN 0 THEN '#E57373'
  WHEN 1 THEN '#F06292'
  WHEN 2 THEN '#BA68C8'
  WHEN 3 THEN '#7986CB'
  WHEN 4 THEN '#64B5F6'
  WHEN 5 THEN '#4DB6AC'
  WHEN 6 THEN '#81C784'
  WHEN 7 THEN '#FFB74D'
  WHEN 8 THEN '#A1887F'
  WHEN 9 THEN '#90A4AE'
  ELSE NULL
END
WHERE `color` IS NULL AND `color_index` IS NOT NULL;
--> statement-breakpoint
UPDATE `categories` SET `color` = '#90A4AE' WHERE `color` IS NULL AND `name_lower` = '无';
--> statement-breakpoint
UPDATE `categories` SET `color` = '#64B5F6' WHERE `color` IS NULL AND `name_lower` = '工作';
--> statement-breakpoint
UPDATE `categories` SET `color` = '#81C784' WHERE `color` IS NULL AND `name_lower` = '个人';
--> statement-breakpoint
UPDATE `categories` SET `color` = '#4DB6AC' WHERE `color` IS NULL AND `name_lower` = '健康';
--> statement-breakpoint
UPDATE `categories` SET `color` = '#E57373' WHERE `color` IS NULL AND `rowid` % 10 = 0;
--> statement-breakpoint
UPDATE `categories` SET `color` = '#F06292' WHERE `color` IS NULL AND `rowid` % 10 = 1;
--> statement-breakpoint
UPDATE `categories` SET `color` = '#BA68C8' WHERE `color` IS NULL AND `rowid` % 10 = 2;
--> statement-breakpoint
UPDATE `categories` SET `color` = '#7986CB' WHERE `color` IS NULL AND `rowid` % 10 = 3;
--> statement-breakpoint
UPDATE `categories` SET `color` = '#64B5F6' WHERE `color` IS NULL AND `rowid` % 10 = 4;
--> statement-breakpoint
UPDATE `categories` SET `color` = '#4DB6AC' WHERE `color` IS NULL AND `rowid` % 10 = 5;
--> statement-breakpoint
UPDATE `categories` SET `color` = '#81C784' WHERE `color` IS NULL AND `rowid` % 10 = 6;
--> statement-breakpoint
UPDATE `categories` SET `color` = '#FFB74D' WHERE `color` IS NULL AND `rowid` % 10 = 7;
--> statement-breakpoint
UPDATE `categories` SET `color` = '#A1887F' WHERE `color` IS NULL AND `rowid` % 10 = 8;
--> statement-breakpoint
UPDATE `categories` SET `color` = '#90A4AE' WHERE `color` IS NULL;
