-- Milestone 3: time slots and their plans, members (the table; screens arrive in
-- milestone 4), subscriptions and seat allocations with the DB-level overlap guard.
-- See docs/ARCHITECTURE.md §7.

CREATE TABLE slots (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(60) NOT NULL,
  start_min SMALLINT UNSIGNED NOT NULL,          -- minutes after local midnight, multiple of 30
  end_min SMALLINT UNSIGNED NOT NULL,            -- < start_min means the slot runs past midnight
  color VARCHAR(9) NOT NULL DEFAULT '',
  sort_order SMALLINT NOT NULL DEFAULT 0,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_slots_tenant_id (tenant_id, id),
  UNIQUE KEY uq_slots_name (tenant_id, name),
  CONSTRAINT fk_slots_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The only source of prices. A slot's "monthly fee" is its default Monthly plan.
CREATE TABLE plans (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  slot_id CHAR(36) NOT NULL,
  name VARCHAR(60) NOT NULL,
  period_unit ENUM('month','day') NOT NULL DEFAULT 'month',
  period_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  price_paise INT UNSIGNED NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_plans_tenant_id (tenant_id, id),
  KEY ix_plans_slot (slot_id),
  CONSTRAINT fk_plans_slot FOREIGN KEY (tenant_id, slot_id) REFERENCES slots(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE members (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_code VARCHAR(20) NOT NULL,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  address VARCHAR(400) NOT NULL DEFAULT '',
  photo_path VARCHAR(255) NOT NULL DEFAULT '',
  id_proof_path VARCHAR(255) NOT NULL DEFAULT '',
  exam_target VARCHAR(80) NOT NULL DEFAULT '',
  joined_on DATE NOT NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  password_hash VARCHAR(255) NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_members_tenant_id (tenant_id, id),
  UNIQUE KEY uq_members_phone (tenant_id, phone),
  UNIQUE KEY uq_members_code (tenant_id, member_code),
  KEY ix_members_name (tenant_id, name),
  CONSTRAINT fk_members_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE subscriptions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  slot_id CHAR(36) NOT NULL,
  plan_id CHAR(36) NOT NULL,
  hall_id CHAR(36) NOT NULL,
  -- Price terms are copied in, so later price edits never rewrite what was agreed.
  price_paise INT UNSIGNED NOT NULL,             -- per period, surcharge included
  surcharge_paise INT UNSIGNED NOT NULL DEFAULT 0,
  period_unit ENUM('month','day') NOT NULL,
  period_count SMALLINT UNSIGNED NOT NULL,
  locker_fee_paise INT UNSIGNED NOT NULL DEFAULT 0,
  collection ENUM('advance','arrears') NOT NULL,
  start_on DATE NOT NULL,                        -- seat/place held from here
  -- First day billed. Equals start_on, except after a mid-period change: then the
  -- next period of the replaced subscription (decision D4).
  bills_from DATE NOT NULL,
  end_on DATE NULL,
  status ENUM('active','ended','lapsed') NOT NULL DEFAULT 'active',
  end_reason ENUM('left','unpaid','slot_change','seat_change','admin') NULL,
  ended_at DATETIME NULL,
  previous_subscription_id CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_subs_tenant_id (tenant_id, id),
  KEY ix_subs_member (member_id),
  KEY ix_subs_tenant_status (tenant_id, status),
  KEY ix_subs_hall_status (tenant_id, hall_id, status),
  KEY ix_subs_slot_status (tenant_id, slot_id, status),
  CONSTRAINT fk_subs_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id),
  CONSTRAINT fk_subs_slot FOREIGN KEY (tenant_id, slot_id) REFERENCES slots(tenant_id, id),
  CONSTRAINT fk_subs_plan FOREIGN KEY (tenant_id, plan_id) REFERENCES plans(tenant_id, id),
  CONSTRAINT fk_subs_hall FOREIGN KEY (tenant_id, hall_id) REFERENCES halls(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE seat_allocations (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  subscription_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  seat_id CHAR(36) NOT NULL,
  slot_id CHAR(36) NOT NULL,
  start_on DATE NOT NULL,
  end_on DATE NULL,
  status ENUM('active','ended') NOT NULL DEFAULT 'active',
  end_reason ENUM('seat_change','swap','slot_change','released','unpaid','left') NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at DATETIME NULL,
  -- At most one ACTIVE allocation per subscription (NULLs never collide in a unique key).
  active_subscription_id CHAR(36) AS (IF(status = 'active', subscription_id, NULL)) STORED,
  UNIQUE KEY uq_alloc_tenant_id (tenant_id, id),
  UNIQUE KEY uq_alloc_one_active (active_subscription_id),
  KEY ix_alloc_seat_status (tenant_id, seat_id, status),
  KEY ix_alloc_member (member_id),
  CONSTRAINT fk_alloc_sub FOREIGN KEY (tenant_id, subscription_id) REFERENCES subscriptions(tenant_id, id),
  CONSTRAINT fk_alloc_seat FOREIGN KEY (tenant_id, seat_id) REFERENCES seats(tenant_id, id),
  CONSTRAINT fk_alloc_slot FOREIGN KEY (tenant_id, slot_id) REFERENCES slots(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- The database's own overlap guard: one row per 30-minute cell an ACTIVE allocation
-- holds on a seat. Two overlapping allocations on one seat would need the same
-- (seat_id, cell) — the primary key refuses the second.
CREATE TABLE seat_allocation_cells (
  seat_id CHAR(36) NOT NULL,
  cell TINYINT UNSIGNED NOT NULL,
  tenant_id CHAR(36) NOT NULL,
  allocation_id CHAR(36) NOT NULL,
  PRIMARY KEY (seat_id, cell),
  KEY ix_cells_alloc (allocation_id),
  CONSTRAINT fk_cells_alloc FOREIGN KEY (tenant_id, allocation_id)
    REFERENCES seat_allocations(tenant_id, id) ON DELETE CASCADE,
  CONSTRAINT fk_cells_seat FOREIGN KEY (tenant_id, seat_id) REFERENCES seats(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
