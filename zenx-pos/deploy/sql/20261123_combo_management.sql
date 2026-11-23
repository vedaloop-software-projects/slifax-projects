-- MySQL permits multiple NULL values in a unique key, allowing archived definitions to coexist.
CREATE TABLE combos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_id BIGINT UNSIGNED NOT NULL,
  parent_variant_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(520) NOT NULL,
  combo_type VARCHAR(16) NOT NULL,
  description TEXT NOT NULL,
  image_path VARCHAR(255) NULL,
  selling_price DECIMAL(15, 2) NOT NULL,
  original_price DECIMAL(15, 2) NULL,
  status TINYINT NOT NULL DEFAULT 1,
  live TINYINT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY combo_live_parent_unique (client_id, parent_variant_id, live)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE combo_fixed_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  combo_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY combo_fixed_variant_unique (combo_id, variant_id),
  CONSTRAINT combo_fixed_combo_fk FOREIGN KEY (combo_id) REFERENCES combos (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE combo_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  combo_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  min_selection INT UNSIGNED NOT NULL,
  max_selection INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY combo_group_combo_index (combo_id),
  CONSTRAINT combo_group_combo_fk FOREIGN KEY (combo_id) REFERENCES combos (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE combo_group_options (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NOT NULL,
  variant_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY combo_group_variant_unique (group_id, variant_id),
  CONSTRAINT combo_option_group_fk FOREIGN KEY (group_id) REFERENCES combo_groups (id) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
