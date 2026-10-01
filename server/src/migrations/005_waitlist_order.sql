-- created_at has one-second precision, so two people added in the same second had
-- no defined queue order. queue_no is a strictly increasing arrival number.
ALTER TABLE waitlist_entries
  ADD COLUMN queue_no BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ADD UNIQUE KEY uq_wait_queue_no (queue_no);
