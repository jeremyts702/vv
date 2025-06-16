// server/controllers/walletController.js
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Deposit = require('../models/Deposit');
const mongoose = require('mongoose');
const { fetchMarketPrices } = require("../services/marketService");

/**
 * Retrieves and consolidates all wallet information for a user.
 * It aggregates asset balances to ensure a single entry per cryptocurrency (e.g., 'BTC')
 * and calculates the total portfolio value in USD.
 */
exports.getWalletInfo = async (req, res) => {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid User ID.' });
    }

    try {
        const user = await User.findById(userId).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.assets = user.assets || new Map();

        // ++ AGGREGATION LOGIC: Combine different entries for the same coin (e.g., 'btc' and 'BTC') ++
        const aggregatedAssets = new Map();
        if (user.assets) {
            for (const [coinId, amount] of user.assets.entries()) {
                const upperCaseCoinId = coinId.toUpperCase();
                const currentAmount = aggregatedAssets.get(upperCaseCoinId) || 0;
                aggregatedAssets.set(upperCaseCoinId, currentAmount + amount);
            }
        }

        const userBalanceUSD = user.balance || 0;
        let totalPortfolioValueUSD = userBalanceUSD;
        const assetsWithUSDValue = [];

        const marketData = await fetchMarketPrices();
        const cryptoPrices = new Map();
        marketData.forEach(coin => {
            cryptoPrices.set(coin.symbol.toUpperCase(), coin.current_price);
        });

        // Ensure USDT has a price of 1 if not provided by the market service
        if (!cryptoPrices.has('USDT')) {
            cryptoPrices.set('USDT', 1);
        }

        // ++ MODIFIED: Iterate through the new aggregatedAssets map for calculations ++
        for (const [coinSymbol, amount] of aggregatedAssets.entries()) {
            const currentPrice = cryptoPrices.get(coinSymbol);

            if (currentPrice !== undefined) {
                const usdValue = amount * currentPrice;
                totalPortfolioValueUSD += usdValue;
                assetsWithUSDValue.push({
                    symbol: coinSymbol,
                    amount: amount,
                    currentPriceUSD: currentPrice,
                    usdValue: usdValue
                });
            } else {
                // If price is not available, still show the asset with a zero value
                console.warn(`Price for asset symbol '${coinSymbol}' not found in market data.`);
                assetsWithUSDValue.push({
                    symbol: coinSymbol,
                    amount: amount,
                    currentPriceUSD: 0,
                    usdValue: 0,
                    note: "Price not available"
                });
            }
        }
        
        // Sort assets alphabetically by symbol before sending
        assetsWithUSDValue.sort((a, b) => a.symbol.localeCompare(b.symbol));

        res.status(200).json({
            balanceUSD: userBalanceUSD,
            assets: assetsWithUSDValue,
            totalPortfolioValueUSD: totalPortfolioValueUSD,
        });

    } catch (error) {
        console.error('Error fetching wallet info:', error);
        res.status(500).json({ message: 'Server error fetching wallet info.' });
    }
};

/**
 * Processes a withdrawal request from a user.
 * It deducts the amount from the correct user balance (fiat or crypto asset)
 * and creates a pending withdrawal record for admin approval.
 */
exports.withdrawWallet = async (req, res) => {
    const { amount, address, currency } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid User ID.' });
    }

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ message: 'Invalid withdrawal amount.' });
        }
        if (!address || !currency) {
            return res.status(400).json({ message: 'Withdrawal address and currency are required.' });
        }

        user.assets = user.assets || new Map();
        const normalizedCurrency = currency.toUpperCase(); // Standardize to uppercase

        // Handle fiat USD withdrawal from the main balance
        if (normalizedCurrency === 'USD') {
            if (user.balance < amount) {
                return res.status(400).json({ message: `Insufficient USD balance for withdrawal.` });
            }
            user.balance -= amount;
        } 
        // Handle crypto asset withdrawal from the assets map
        else {
            const currentAssetAmount = user.assets.get(normalizedCurrency) || 0;
            if (currentAssetAmount < amount) {
                return res.status(400).json({ message: `Insufficient ${normalizedCurrency} balance for withdrawal.` });
            }
            user.assets.set(normalizedCurrency, currentAssetAmount - amount);
        }

        await user.save();

        const newWithdrawal = new Withdrawal({
            userId: userId,
            amount: amount,
            currency: normalizedCurrency,
            address: address,
            status: 'Pending',
        });

        await newWithdrawal.save();

        res.status(200).json({
            message: `Withdrawal request for ${amount} ${normalizedCurrency} submitted successfully. It is now pending administrator review.`,
            withdrawal: newWithdrawal
        });

    } catch (error) {
        console.error('Error processing withdrawal request:', error);
        res.status(500).json({ message: 'Server error during withdrawal.' });
    }
};

/**
 * Submits a deposit request for admin verification.
 * It creates a pending deposit record but does not update the user's balance.
 */
exports.rechargeWallet = async (req, res) => {
    const { amount, currency, txId } = req.body;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid User ID.' });
    }
    if (!currency || !txId) {
        return res.status(400).json({ message: 'Currency and transaction ID are required.' });
    }
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Amount must be a positive number.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const newDeposit = new Deposit({
            userId: userId,
            amount: amount,
            currency: currency.toUpperCase(), // Store currency in a standard format
            transactionId: txId,
            status: 'Pending',
        });

        await newDeposit.save();

        res.status(200).json({
            message: 'Deposit request submitted successfully. It will be reviewed by an administrator.',
            deposit: newDeposit
        });

    } catch (error) {
        console.error('Error processing deposit request:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error submitting deposit request.' });
    }
};

/**
 * Retrieves the deposit history for the authenticated user.
 */
exports.getDepositHistory = async (req, res) => {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid User ID.' });
    }

    try {
        const deposits = await Deposit.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json({ deposits });
    } catch (error) {
        console.error('Error fetching deposit history:', error);
        res.status(500).json({ message: 'Server error fetching deposit history.' });
    }
};

/**
 * Retrieves the withdrawal history for the authenticated user.
 */
exports.getWithdrawalHistory = async (req, res) => {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid User ID.' });
    }

    try {
        const withdrawals = await Withdrawal.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json({ withdrawals });
    } catch (error) {
        console.error('Error fetching withdrawal history:', error);
        res.status(500).json({ message: 'Server error fetching withdrawal history.' });
    }
};
