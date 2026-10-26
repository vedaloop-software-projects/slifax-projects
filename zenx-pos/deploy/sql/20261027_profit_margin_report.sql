-- Register the new report in the existing tenant feature / role system.
-- Enable it for existing clients that have Sales Report, granting access to
-- their primary-admin roles. Other roles can be enabled through Access Levels.
INSERT INTO sub_features (feature_id, sub_feature, status, trash, priority, created_at, updated_at)
SELECT sales.feature_id, 'Profit Margin Report', 1, 0, sales.priority + 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()
FROM sub_features sales
WHERE LOWER(TRIM(sales.sub_feature)) = 'sales report' AND sales.status = 1 AND sales.trash = 0
  AND NOT EXISTS (SELECT 1 FROM sub_features p WHERE p.feature_id = sales.feature_id AND p.sub_feature = 'Profit Margin Report');

INSERT INTO client_features (client_id, feature_id, sub_feature_id, status, created_at, updated_at)
SELECT DISTINCT c.client_id, profit.feature_id, profit.id, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()
FROM sub_features profit
JOIN sub_features sales ON sales.feature_id = profit.feature_id AND LOWER(TRIM(sales.sub_feature)) = 'sales report'
JOIN client_features c ON c.feature_id = profit.feature_id AND c.status = 1 AND (c.sub_feature_id = 0 OR c.sub_feature_id = sales.id)
WHERE profit.sub_feature = 'Profit Margin Report' AND profit.status = 1 AND profit.trash = 0
  AND NOT EXISTS (SELECT 1 FROM client_features e WHERE e.client_id = c.client_id AND e.feature_id = profit.feature_id AND e.sub_feature_id = profit.id);

INSERT INTO client_role_features (client_id, role_id, feature_id, sub_feature_id, is_add, is_edit, is_view, status, trash, created_at, updated_at)
SELECT DISTINCT u.client_id, u.role_id, p.feature_id, p.id, 0, 0, 1, 1, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP()
FROM sub_features p
JOIN client_features c ON c.feature_id = p.feature_id AND c.sub_feature_id = p.id AND c.status = 1
JOIN client_users u ON u.client_id = c.client_id AND u.is_admin = 1 AND u.trash = 0
WHERE p.sub_feature = 'Profit Margin Report' AND p.status = 1 AND p.trash = 0
  AND NOT EXISTS (SELECT 1 FROM client_role_features r WHERE r.client_id = u.client_id AND r.role_id = u.role_id AND r.feature_id = p.feature_id AND r.sub_feature_id = p.id);
