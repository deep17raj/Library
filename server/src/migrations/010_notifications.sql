-- Notifications: library announcements and automated reminders (milestone 8).

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  kind ENUM('announcement','fee_due','seat_expiry','waitlist','mocktest','system') NOT NULL,
  title VARCHAR(80) NOT NULL,
  body VARCHAR(300) NOT NULL,
  url VARCHAR(255) NOT NULL DEFAULT '',
  audience JSON NULL,
  dedupe_key VARCHAR(120) NULL,
  recipients_count INT UNSIGNED NOT NULL DEFAULT 0,
  push_sent INT UNSIGNED NOT NULL DEFAULT 0,
  push_failed INT UNSIGNED NOT NULL DEFAULT 0,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notif_tenant_id (tenant_id, id),
  UNIQUE KEY uq_notif_dedupe (tenant_id, dedupe_key),
  KEY ix_notif_tenant_time (tenant_id, created_at),
  CONSTRAINT fk_notif_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notification_recipients (
  notification_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  tenant_id CHAR(36) NOT NULL,
  read_at DATETIME NULL,
  PRIMARY KEY (notification_id, member_id),
  KEY ix_inbox (member_id, notification_id),
  CONSTRAINT fk_nr_notif FOREIGN KEY (tenant_id, notification_id) REFERENCES notifications(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_nr_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id) ON DELETE CASCADE
);
