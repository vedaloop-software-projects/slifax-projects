const { pool } = require("../config/db");

const ACTION_COLUMNS = {
  view: "is_view",
  add: "is_add",
  edit: "is_edit",
};

const isId = (value, allowZero = false) => {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && (allowZero ? value >= 0 : value > 0);
  }

  return typeof value === "string" && (allowZero ? /^(0|[1-9]\d*)$/ : /^[1-9]\d*$/.test(value));
};

const hasPermission = async ({ clientId, roleId, featureId, subFeatureId = 0, action }) => {
  const actionColumn = ACTION_COLUMNS[action];
  const normalizedSubFeatureId = subFeatureId ?? 0;

  if (
    !actionColumn ||
    !isId(clientId) ||
    !isId(roleId) ||
    !isId(featureId) ||
    !isId(normalizedSubFeatureId, true)
  ) {
    return false;
  }

  const subFeatureJoin = normalizedSubFeatureId === 0 || normalizedSubFeatureId === "0"
    ? ""
    : `
    INNER JOIN sub_features sf
      ON sf.id = ?
      AND sf.feature_id = f.id
      AND sf.status = 1
      AND sf.trash = 0
    `;

  const values = [
    clientId,
    roleId,
    normalizedSubFeatureId,
    ...(subFeatureJoin ? [normalizedSubFeatureId] : []),
    featureId,
  ];

  const [rows] = await pool.query(
    `
    SELECT 1 AS allowed
    FROM features f
    INNER JOIN client_role_features crf
      ON crf.client_id = ?
      AND crf.role_id = ?
      AND crf.feature_id = f.id
      AND crf.sub_feature_id = ?
      AND crf.status = 1
      AND crf.trash = 0
    INNER JOIN client_features cf
      ON cf.client_id = crf.client_id
      AND cf.feature_id = crf.feature_id
      AND cf.sub_feature_id = crf.sub_feature_id
      AND cf.status = 1
    ${subFeatureJoin}
    WHERE f.id = ?
      AND f.status = 1
      AND f.trash = 0
      AND crf.${actionColumn} = 1
    LIMIT 1
    `,
    values
  );

  return rows.length > 0;
};

module.exports = {
  hasPermission,
};