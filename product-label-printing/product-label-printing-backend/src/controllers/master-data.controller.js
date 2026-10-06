const masterDataService = require("../services/master-data.service");

const respondWithList = (list) => async (req, res) => {
  try {
    const records = await masterDataService[list](req.user.clientId);
    return res.status(200).json(records);
  } catch (error) {
    req.log.error({ err: error }, `Master data lookup failed (${list})`);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve master data",
    });
  }
};

module.exports = {
  listCategories: respondWithList("listCategories"),
  listSubCategories: respondWithList("listSubCategories"),
  listBrands: respondWithList("listBrands"),
  listUnitTypes: respondWithList("listUnitTypes"),
  listTaxes: respondWithList("listTaxes"),
};
