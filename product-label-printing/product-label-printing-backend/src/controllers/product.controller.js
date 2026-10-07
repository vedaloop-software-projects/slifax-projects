const productService = require("../services/product.service");

const getQueryValue = (value) => (typeof value === "string" ? value : undefined);

const parseInteger = (value, { defaultValue, min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
};

const list = async (req, res) => {
  const page = parseInteger(getQueryValue(req.query.page), { defaultValue: 1, min: 1 });
  const pageSize = parseInteger(getQueryValue(req.query.pageSize), { defaultValue: 12, min: 1, max: 100 });
  const category = parseInteger(getQueryValue(req.query.category), { min: 1 });
  const status = parseInteger(getQueryValue(req.query.status));
  const q = getQueryValue(req.query.q)?.trim();
  const sort = getQueryValue(req.query.sort) ?? "name";
  const order = (getQueryValue(req.query.order) ?? "asc").toUpperCase();

  if (
    page === null ||
    pageSize === null ||
    (req.query.category !== undefined && category === null) ||
    (req.query.status !== undefined && status === null) ||
    (req.query.q !== undefined && q === undefined) ||
    !productService.SORT_COLUMNS[sort] ||
    !["ASC", "DESC"].includes(order)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid product query parameters",
    });
  }

  try {
    const result = await productService.listProducts({
      clientId: req.user.clientId,
      q: q || undefined,
      category,
      status,
      page,
      pageSize,
      sort,
      order,
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    req.log.error({ err: error }, "Product list failed");

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve products",
    });
  }
};

const getById = async (req, res) => {
  const id = parseInteger(req.params.id, { min: 1 });
  if (id === null) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  try {
    const product = await productService.getProductById(id, req.user.clientId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    req.log.error({ err: error }, "Product lookup failed");

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve product",
    });
  }
};

const create = async (req, res) => {
  try {
    const data = await productService.createProduct({
      input: req.body,
      clientId: req.user.clientId,
      userId: req.user.userId,
    });

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 409) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    req.log.error({ err: error }, "Product creation failed");

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
    });
  }
};

const update = async (req, res) => {
  const id = parseInteger(req.params.id, { min: 1 });
  if (id === null) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  try {
    const data = await productService.updateProduct({
      productId: id,
      input: req.body,
      clientId: req.user.clientId,
      userId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if ([400, 404, 409].includes(error.statusCode)) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    req.log.error({ err: error }, "Product update failed");

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
    });
  }
};

const updateStatus = async (req, res) => {
  const id = parseInteger(req.params.id, { min: 1 });
  if (id === null) {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  if (
    !req.body ||
    typeof req.body !== "object" ||
    Array.isArray(req.body) ||
    Object.keys(req.body).length !== 1 ||
    !Object.prototype.hasOwnProperty.call(req.body, "status") ||
    !["ACTIVE", "INACTIVE", "ARCHIVED"].includes(req.body.status)
  ) {
    return res.status(400).json({
      success: false,
      message: "status must be ACTIVE, INACTIVE, or ARCHIVED",
    });
  }

  try {
    const data = await productService.updateProductStatus({
      productId: id,
      status: req.body.status,
      clientId: req.user.clientId,
      userId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if ([400, 404].includes(error.statusCode)) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    req.log.error({ err: error }, "Product status update failed");

    return res.status(500).json({
      success: false,
      message: "Failed to update product status",
    });
  }
};

module.exports = {
  list,
  getById,
  create,
  update,
  updateStatus,
};