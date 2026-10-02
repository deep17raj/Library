-- Milestone 7: the student app. Members already carry password_hash /
-- must_change_password / token_version (003); staff "give app access" sets a
-- temporary password. Here: when a student last signed in, and their browsers'
-- Web Push subscriptions (sending arrives in milestone 8). See ARCHITECTURE.md §4, §12.

ALTER TABLE members ADD COLUMN app_last_login_at DATETIME NULL AFTER token_version;

CREATE TABLE push_subscriptions (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  endpoint TEXT NOT NULL,
  endpoint_hash CHAR(64) NOT NULL,               -- SHA-256; one browser = one row, globally
  p256dh VARCHAR(255) NOT NULL,
  auth VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_endpoint (endpoint_hash),
  KEY ix_push_member (tenant_id, member_id),
  CONSTRAINT fk_push_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
