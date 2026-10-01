-- Milestone 2: seat categories (price tiers, decision D6), halls with a seating
-- mode (fixed seat / sit anywhere, decision D8), tables and seats.
-- Parents expose UNIQUE (tenant_id, id) so children reference them with composite
-- foreign keys: the database itself refuses a row pointing into another library.

CREATE TABLE seat_categories (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(60) NOT NULL,
  monthly_surcharge_paise INT UNSIGNED NOT NULL DEFAULT 0,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  status ENUM('active','archived') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_categories_tenant_id (tenant_id, id),
  UNIQUE KEY uq_categories_name (tenant_id, name),
  CONSTRAINT fk_categories_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE halls (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  name VARCHAR(80) NOT NULL,
  seating_mode ENUM('fixed','floating') NOT NULL DEFAULT 'fixed',
  -- Category of every place in a floating hall; default for new seats in a fixed hall.
  category_id CHAR(36) NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_halls_tenant_id (tenant_id, id),
  UNIQUE KEY uq_halls_name (tenant_id, name),
  CONSTRAINT fk_halls_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE,
  CONSTRAINT fk_halls_category FOREIGN KEY (tenant_id, category_id) REFERENCES seat_categories(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE hall_tables (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  hall_id CHAR(36) NOT NULL,
  label VARCHAR(40) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_tables_tenant_id (tenant_id, id),
  UNIQUE KEY uq_tables_label (hall_id, label),
  CONSTRAINT fk_tables_hall FOREIGN KEY (tenant_id, hall_id) REFERENCES halls(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE seats (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  table_id CHAR(36) NOT NULL,
  label VARCHAR(20) NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  category_id CHAR(36) NULL,
  features JSON NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  UNIQUE KEY uq_seats_tenant_id (tenant_id, id),
  -- Seat labels are unique in the whole library ("A-12" means one seat at the desk).
  UNIQUE KEY uq_seats_label (tenant_id, label),
  KEY ix_seats_table (table_id, sort_order),
  CONSTRAINT fk_seats_table FOREIGN KEY (tenant_id, table_id) REFERENCES hall_tables(tenant_id, id),
  CONSTRAINT fk_seats_category FOREIGN KEY (tenant_id, category_id) REFERENCES seat_categories(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
