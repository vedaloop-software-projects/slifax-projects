const workspace = require("../services/workspace.service");

const id = (value) => (/^[1-9]\d*$/.test(String(value)) ? Number(value) : null);

/** Wraps a handler: validates :id / :itemId params and maps service errors to responses. */
const handle = (fn, failure, status = 200) => async (req, res) => {
  const clientId = id(req.params.id);
  if (!clientId) return res.status(400).json({ success: false, message: "Invalid client id" });
  const itemParam = req.params.productId ?? req.params.roleId ?? req.params.userId;
  const itemId = itemParam === undefined ? undefined : id(itemParam);
  if (itemParam !== undefined && !itemId) return res.status(400).json({ success: false, message: "Invalid id" });
  try {
    const data = await fn(clientId, itemId, req);
    return res.status(status).json({ success: true, data });
  } catch (error) {
    if (error instanceof workspace.WorkspaceError) {
      return res.status(error.status).json({ success: false, message: error.message, field: error.field });
    }
    req.log.error({ err: error, clientId }, failure);
    return res.status(500).json({ success: false, message: failure });
  }
};

module.exports = {
  listMasters: handle((c) => workspace.listMasters(c), "Failed to load master data"),
  createMaster: handle((c, _i, req) => {
    if (!workspace.MASTER_TYPES.includes(req.params.type)) throw new workspace.WorkspaceError("Unknown master type.", 404);
    return workspace.createMaster(c, req.params.type, req.body ?? {});
  }, "Failed to save master data", 201),

  listProducts: handle((c, _i, req) => workspace.listProducts(c, req.query), "Failed to load products"),
  getProduct: handle((c, p) => workspace.getProduct(c, p), "Failed to load product"),
  createProduct: handle((c, _i, req) => workspace.createProduct(c, req.body ?? {}), "Failed to add product", 201),
  setProductStatus: handle((c, p, req) => workspace.setProductStatus(c, p, Number(req.body?.status)), "Failed to update product"),

  listRoles: handle((c) => workspace.listRoles(c), "Failed to load roles"),
  createRole: handle((c, _i, req) => workspace.createRole(c, req.body ?? {}), "Failed to add role", 201),
  getAccess: handle((c, r) => workspace.getAccess(c, r), "Failed to load access levels"),
  saveAccess: handle((c, r, req) => workspace.saveAccess(c, r, req.body ?? {}), "Failed to save access levels"),

  listUsers: handle((c) => workspace.listUsers(c), "Failed to load users"),
  createUser: handle((c, _i, req) => workspace.createUser(c, req.body ?? {}), "Failed to add user", 201),
  updateUser: handle((c, u, req) => workspace.updateUser(c, u, req.body ?? {}), "Failed to update user"),
};
