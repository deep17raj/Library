-- Milestone 5: invoices (what is owed), payments (what came in), allocations (which
-- payment paid which invoice), deposit refunds and expenses. Money is never deleted:
-- invoices and payments are voided, expenses too. See docs/ARCHITECTURE.md §8.

CREATE TABLE invoices (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  subscription_id CHAR(36) NULL,
  kind ENUM('seat_fee','locker','admission','deposit','other') NOT NULL,
  description VARCHAR(160) NOT NULL,
  period_start DATE NULL,
  period_end DATE NULL,                          -- exclusive
  due_on DATE NOT NULL,
  amount_paise INT UNSIGNED NOT NULL,
  discount_paise INT UNSIGNED NOT NULL DEFAULT 0,
  discount_reason VARCHAR(200) NOT NULL DEFAULT '',
  paid_paise INT UNSIGNED NOT NULL DEFAULT 0,    -- kept in step with payment_allocations
  status ENUM('open','paid','void') NOT NULL DEFAULT 'open',
  void_reason VARCHAR(200) NULL,
  -- Makes generation idempotent: 'sub:<id>:<period_start>', 'admission:<member>'.
  dedupe_key VARCHAR(100) NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inv_tenant_id (tenant_id, id),
  UNIQUE KEY uq_inv_dedupe (tenant_id, dedupe_key),
  KEY ix_inv_member (member_id, status),
  KEY ix_inv_due (tenant_id, status, due_on),
  CONSTRAINT fk_inv_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id),
  CONSTRAINT fk_inv_sub FOREIGN KEY (tenant_id, subscription_id) REFERENCES subscriptions(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  receipt_no INT UNSIGNED NOT NULL,              -- per-library sequence (counters)
  amount_paise INT UNSIGNED NOT NULL,
  mode ENUM('cash','upi','card','bank','cheque','online','other') NULL,
  reference VARCHAR(80) NOT NULL DEFAULT '',
  note VARCHAR(300) NOT NULL DEFAULT '',
  received_at DATETIME NOT NULL,
  received_on DATE NOT NULL,                     -- library-local day, for the ledger
  collected_by CHAR(36) NULL,
  status ENUM('valid','void') NOT NULL DEFAULT 'valid',
  voided_at DATETIME NULL,
  voided_by CHAR(36) NULL,
  void_reason VARCHAR(200) NULL,
  UNIQUE KEY uq_pay_tenant_id (tenant_id, id),
  UNIQUE KEY uq_pay_receipt (tenant_id, receipt_no),
  KEY ix_pay_day (tenant_id, received_on),
  KEY ix_pay_member (member_id),
  CONSTRAINT fk_pay_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Which invoices a payment settled. Sum per payment ≤ its amount; the rest is the
-- member's credit, applied to the next invoices automatically.
CREATE TABLE payment_allocations (
  payment_id CHAR(36) NOT NULL,
  invoice_id CHAR(36) NOT NULL,
  tenant_id CHAR(36) NOT NULL,
  amount_paise INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id, invoice_id),
  KEY ix_palloc_invoice (invoice_id),
  CONSTRAINT fk_palloc_pay FOREIGN KEY (tenant_id, payment_id) REFERENCES payments(tenant_id, id),
  CONSTRAINT fk_palloc_inv FOREIGN KEY (tenant_id, invoice_id) REFERENCES invoices(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE deposit_refunds (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  invoice_id CHAR(36) NOT NULL,
  amount_paise INT UNSIGNED NOT NULL,
  mode ENUM('cash','upi','card','bank','cheque','online','other') NULL,
  refunded_on DATE NOT NULL,
  note VARCHAR(300) NOT NULL DEFAULT '',
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_refund_tenant_day (tenant_id, refunded_on),
  KEY ix_refund_invoice (invoice_id),
  CONSTRAINT fk_refund_inv FOREIGN KEY (tenant_id, invoice_id) REFERENCES invoices(tenant_id, id),
  CONSTRAINT fk_refund_member FOREIGN KEY (tenant_id, member_id) REFERENCES members(tenant_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE expenses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  tenant_id CHAR(36) NOT NULL,
  category VARCHAR(40) NOT NULL DEFAULT 'other',
  title VARCHAR(160) NOT NULL,
  amount_paise INT UNSIGNED NOT NULL,
  spent_on DATE NOT NULL,
  mode ENUM('cash','upi','card','bank','cheque','online','other') NULL,
  status ENUM('valid','void') NOT NULL DEFAULT 'valid',
  void_reason VARCHAR(200) NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_exp_day (tenant_id, spent_on),
  CONSTRAINT fk_exp_library FOREIGN KEY (tenant_id) REFERENCES libraries(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
