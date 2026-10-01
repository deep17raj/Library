-- Milestone 6: attendance. One row per booking per library-local day; a second scan
-- the same day sets check_out_at. The daily code is never stored (it is an HMAC of
-- tenant + local date, recomputed on demand). See docs/ARCHITECTURE.md §9.

CREATE TABLE attendance (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  subscription_id CHAR(36) NOT NULL,
  local_date DATE NOT NULL,
  check_in_at DATETIME NOT NULL,
  check_out_at DATETIME NULL,
  method ENUM('qr','phone','staff') NOT NULL,
  outside_slot TINYINT(1) NOT NULL DEFAULT 0,    -- allowed under 'warn' mode
  had_dues TINYINT(1) NOT NULL DEFAULT 0,
  recorded_by CHAR(36) NULL,                      -- staff user for method = 'staff'
  UNIQUE KEY uq_att_sub_day (subscription_id, local_date),
  KEY ix_att_tenant_day (tenant_id, local_date),
  KEY ix_att_member (member_id, local_date),
  CONSTRAINT fk_att_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id),
  CONSTRAINT fk_att_sub FOREIGN KEY (tenant_id, subscription_id) REFERENCES subscriptions(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
