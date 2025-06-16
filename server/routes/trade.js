// server/routes/trade.js - REVISED VERSION

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
// Import the unified trade controller function
const tradeController = require('../controllers/tradeController'); 

// This route will handle POST requests to /api/trade
// The 'tradeType' (e.g., 'buy' or 'sell') will be in the request body
// and the tradeController.handleTrade function will process it.
router.post("/", authMiddleware, tradeController.handleTrade);

// The instant trade route remains separate as it handles a specific conversion
router.post("/instant", authMiddleware, tradeController.handleInstantTrade); // Assuming you have an exports.handleInstantTrade in tradeController

// Removed the old separate /buy and /sell routes as they are now consolidated
// under the generic POST / route handled by tradeController.handleTrade.
// If you have logic specific to the /buy and /sell endpoints that cannot
// be generalized by tradeController.handleTrade, you would keep them.
// router.post("/buy", authMiddleware, async (req, res) => { ... });
// router.post("/sell", authMiddleware, async (req, res) => { ... });

module.exports = router;
