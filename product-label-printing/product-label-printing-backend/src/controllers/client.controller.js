const clientService = require("../services/client.service");

const parseId = (value) => (/^[1-9]\d*$/.test(String(value)) ? Number(value) : null);

const fail = (req, res, error, fallback) => {
  if (error instanceof clientService.ClientError) {
    return res.status(error.status).json({ success: false, message: error.message, fields: error.fields });
  }
  req.log.error({ err: error }, fallback);
  return res.status(500).json({ success: false, message: fallback });
};

const list = async (req, res) => {
  try {
    const data = await clientService.listClients(req.query);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return fail(req, res, error, "Failed to load clients");
  }
};

const getById = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Invalid client id" });
  try {
    return res.status(200).json({ success: true, data: await clientService.getClient(id) });
  } catch (error) {
    return fail(req, res, error, "Failed to load client");
  }
};

const create = async (req, res) => {
  try {
    const data = await clientService.createClient(req.body ?? {}, req.user.adminId);
    return res.status(201).json({ success: true, message: "Client onboarded", data });
  } catch (error) {
    return fail(req, res, error, "Failed to onboard client");
  }
};

const updateStatus = async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: "Invalid client id" });
  try {
    const data = await clientService.setClientStatus(id, req.body?.status, req.user.adminId);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return fail(req, res, error, "Failed to update client status");
  }
};

const lookups = async (req, res) => {
  try {
    return res.status(200).json({ success: true, data: await clientService.lookups() });
  } catch (error) {
    return fail(req, res, error, "Failed to load onboarding options");
  }
};

module.exports = {
  list,
  getById,
  create,
  updateStatus,
  lookups,
};
