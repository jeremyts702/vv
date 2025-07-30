/*// server/controllers/marketController.js
const { fetchMarketPrices } = require("../services/marketService");

exports.getMarketData = async (req, res) => {
  try {
    const data = await fetchMarketPrices();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch market data" });
  }
};*/
