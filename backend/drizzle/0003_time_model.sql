UPDATE `schedule_cards` SET
  `start_at` = CASE WHEN `time_nature` = 'duration' THEN `start_at` ELSE NULL END,
  `end_at` = CASE WHEN `time_nature` = 'duration' THEN `end_at` ELSE NULL END,
  `deadline_at` = NULL,
  `time_nature` = NULL;
