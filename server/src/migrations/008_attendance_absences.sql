-- Explicit "marked absent" overrides for the attendance roster. Kept separate from
-- `attendance` so a QR/kiosk check-in's history is never deleted — the override just
-- wins for display (ARCHITECTURE.md "never hard-delete history"). One per booking per day.

CREATE TABLE attendance_absences (
  id CHAR(36) PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  subscription_id CHAR(36) NOT NULL,
  local_date DATE NOT NULL,
  marked_by CHAR(36) NULL,
  marked_at DATETIME NOT NULL,
  UNIQUE KEY uq_absence_sub_day (subscription_id, local_date),
  KEY ix_absence_tenant_day (tenant_id, local_date),
  CONSTRAINT fk_absence_sub FOREIGN KEY (tenant_id, subscription_id) REFERENCES subscriptions(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
