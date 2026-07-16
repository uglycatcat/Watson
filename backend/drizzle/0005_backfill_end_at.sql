-- Data-only: scheduled cards with start but no end get end = start + 1 day (ISO text).
UPDATE `schedule_cards`
SET `end_at` = strftime(
  '%Y-%m-%dT%H:%M:%SZ',
  datetime(
    replace(replace(substr(`start_at`, 1, 19), 'T', ' '), 'Z', ''),
    '+1 day'
  )
)
WHERE `start_at` IS NOT NULL AND (`end_at` IS NULL OR `end_at` = '');
