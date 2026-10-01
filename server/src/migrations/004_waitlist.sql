-- Milestone 4: people waiting for a seat in a slot that is full.
-- An entry is a walk-in enquiry (name + phone); once the person is added as a
-- member it is marked converted and linked to that member.

CREATE TABLE waitlist_entries (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  slot_id CHAR(36) NOT NULL,
  member_id CHAR(36) NULL,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  preferred_features JSON NULL,
  note VARCHAR(300) NOT NULL DEFAULT '',
  status ENUM('waiting','offered','converted','cancelled') NOT NULL DEFAULT 'waiting',
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  UNIQUE KEY uq_wait_tenant_id (tenant_id, id),
  KEY ix_wait_queue (tenant_id, slot_id, status, created_at),
  CONSTRAINT fk_wait_slot FOREIGN KEY (tenant_id, slot_id) REFERENCES slots(tenant_id, id),
  CONSTRAINT fk_wait_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
