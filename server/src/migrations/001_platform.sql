-- Milestone 1: tenancy, staff users, platform settings, audit, job bookkeeping.
-- Conventions (docs/ARCHITECTURE.md §6): CHAR(36) UUID ids, DATETIME in UTC,
-- DATE = library-local day, *_paise = integer money.

CREATE TABLE libraries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  slug VARCHAR(60) NOT NULL,
  name VARCHAR(160) NOT NULL,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  -- Library's cut of global mock-test sales in basis points. NULL = platform default.
  mocktest_share_bps SMALLINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  suspended_at DATETIME NULL,
  UNIQUE KEY uq_libraries_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE platform_settings (
  setting_key VARCHAR(60) NOT NULL PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Decision D1: libraries get 20% of global mock-test sales by default.
INSERT INTO platform_settings (setting_key, setting_value)
VALUES ('mocktest_default_share_bps', '2000');

CREATE TABLE users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(160) NOT NULL,
  role ENUM('super_admin','admin','staff') NOT NULL,
  permissions JSON NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  -- Bumped to end every session of this user (password change, disable).
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  KEY ix_users_tenant (tenant_id),
  CONSTRAINT fk_users_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE library_settings (
  tenant_id CHAR(36) NOT NULL PRIMARY KEY,
  display_name VARCHAR(160) NOT NULL,
  logo_path VARCHAR(255) NOT NULL DEFAULT '',
  address VARCHAR(400) NOT NULL DEFAULT '',
  contact_phone VARCHAR(20) NOT NULL DEFAULT '',
  timezone VARCHAR(40) NOT NULL DEFAULT 'Asia/Kolkata',
  billing_anchor ENUM('join_date','month_start') NOT NULL DEFAULT 'join_date',
  first_period_billing ENUM('full','prorated') NOT NULL DEFAULT 'full',
  default_collection ENUM('advance','arrears') NOT NULL DEFAULT 'advance',
  grace_days SMALLINT UNSIGNED NOT NULL DEFAULT 7,
  auto_release_unpaid TINYINT(1) NOT NULL DEFAULT 0,
  slot_check_mode ENUM('off','warn','block') NOT NULL DEFAULT 'warn',
  slot_early_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 15,
  allow_overdue_checkin TINYINT(1) NOT NULL DEFAULT 1,
  fee_reminder_days_before SMALLINT UNSIGNED NOT NULL DEFAULT 3,
  weekly_holidays JSON NULL,
  holiday_dates JSON NULL,
  theme JSON NULL,
  receipt_prefix VARCHAR(10) NOT NULL DEFAULT 'R',
  member_code_prefix VARCHAR(10) NOT NULL DEFAULT 'S',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_settings_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE counters (
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(40) NOT NULL,
  next_value INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, name),
  CONSTRAINT fk_counters_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id CHAR(36) NULL,
  actor_type ENUM('user','member','system') NOT NULL,
  actor_id CHAR(36) NULL,
  action VARCHAR(60) NOT NULL,
  entity VARCHAR(40) NOT NULL,
  entity_id CHAR(36) NULL,
  data JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_audit_tenant_time (tenant_id, created_at),
  KEY ix_audit_entity (entity, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE job_runs (
  name VARCHAR(60) NOT NULL PRIMARY KEY,
  last_started_at DATETIME NULL,
  last_finished_at DATETIME NULL,
  last_status ENUM('ok','error') NULL,
  last_error VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
