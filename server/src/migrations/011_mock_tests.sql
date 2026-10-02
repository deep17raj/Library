-- Mock tests: platform-level question papers that students can preview and purchase.

CREATE TABLE mock_tests (
  id           CHAR(36)      NOT NULL PRIMARY KEY,
  title        VARCHAR(200)  NOT NULL,
  description  TEXT          NULL,
  price_paise  INT UNSIGNED  NOT NULL DEFAULT 0,
  pdf_path     VARCHAR(500)  NOT NULL,
  is_published TINYINT(1)    NOT NULL DEFAULT 0,
  published_at DATETIME      NULL,
  created_by   CHAR(36)      NULL,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY ix_mt_published (is_published, published_at),
  CONSTRAINT fk_mt_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
