// server/routes/wallet.js
const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');

// Routes accessible by authenticated users
router.get('/', walletController.getWalletInfo); // Get user's wallet balance and assets
router.post('/withdraw', walletController.withdrawWallet); // Request a withdrawal (requires authMiddleware)

// The '/recharge' route is handled directly in server.js to allow specific multer configuration
// router.post('/recharge', walletController.rechargeWallet); // This line is now effectively in server.js

module.exports = router;