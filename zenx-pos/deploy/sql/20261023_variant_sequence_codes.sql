-- Re-number generated codes per product, including soft-deleted variants.
-- Database primary keys and EANs are untouched. Reprint labels encoding the old variant code.
CREATE TEMPORARY TABLE zenx_variant_sequence_map (
  id BIGINT UNSIGNED PRIMARY KEY,
  sequence_num INT NOT NULL CHECK (sequence_num BETWEEN 1 AND 999),
  new_code VARCHAR(100) NOT NULL
);
INSERT INTO zenx_variant_sequence_map (id, sequence_num, new_code)
SELECT id, sequence_num,
  CONCAT(LPAD(client_id, GREATEST(3, LENGTH(client_id)), '0'), '-', LPAD(product_id, GREATEST(5, LENGTH(product_id)), '0'), '-', LPAD(sequence_num, 3, '0'))
FROM (
  SELECT id, client_id, product_id,
    ROW_NUMBER() OVER (PARTITION BY client_id, product_id ORDER BY id) AS sequence_num
  FROM product_variants
) ranked;
START TRANSACTION;
-- Two phases prevent an old global-ID code colliding with a new sequence code.
UPDATE product_variants v JOIN zenx_variant_sequence_map m ON m.id = v.id
SET v.variant_code = CONCAT('SEQ-MIGRATION-', v.id)
WHERE v.variant_code REGEXP '^[0-9]{3,}-[0-9]{5,}-[0-9]+$';
UPDATE product_variants v JOIN zenx_variant_sequence_map m ON m.id = v.id
SET v.variant_code = m.new_code
WHERE v.variant_code = CONCAT('SEQ-MIGRATION-', v.id);
COMMIT;
DROP TEMPORARY TABLE zenx_variant_sequence_map;
