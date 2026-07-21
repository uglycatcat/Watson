ALTER TABLE schedule_cards ADD COLUMN kind text NOT NULL DEFAULT 'standard';
--> statement-breakpoint
ALTER TABLE schedule_cards ADD COLUMN parent_id text REFERENCES schedule_cards(id);
--> statement-breakpoint
ALTER TABLE schedule_cards ADD COLUMN time_manual integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE schedule_cards ADD COLUMN last_parent_title text;
--> statement-breakpoint
CREATE INDEX idx_cards_parent_id ON schedule_cards (parent_id);
