// server/controllers/tradeController.js

const User = require('../models/User');

const Order = require('../models/Order');

const { fetchMarketPrices } = require("../services/marketService");

const mongoose = require('mongoose');



// This is the existing function for Spot Buy/Sell trades

exports.handleTrade = async (req, res) => {

    const userId = req.user.id;

    // ++ CHANGED: coinId is now expected to be a Binance Symbol (e.g., "BTC", "ETH") ++

    const { coinId, amount, tradeType, quantity } = req.body;



    if (!mongoose.Types.ObjectId.isValid(userId)) {

        return res.status(400).json({ message: 'Invalid User ID.' });

    }

    if (!coinId || (!amount && !quantity) || (amount <= 0 && quantity <= 0) || !tradeType) {

        return res.status(400).json({ message: 'Missing or invalid trade parameters.' });

    }

    if (tradeType !== 'buy' && tradeType !== 'sell') {

        return res.status(400).json({ message: 'Invalid trade type. Must be "buy" or "sell".' });

    }



    try {

        const user = await User.findById(userId);

        if (!user) {

            return res.status(404).json({ message: 'User not found.' });

        }



        const marketData = await fetchMarketPrices();

        // ++ CHANGED: Find targetCoin by symbol, not ID. Ensure comparison is case-insensitive. ++

        const targetCoin = marketData.find(coin => coin.symbol.toUpperCase() === coinId.toUpperCase());



        if (!targetCoin) {

            return res.status(404).json({ message: `Coin ${coinId} not found in market data.` });

        }



        const currentPrice = targetCoin.current_price;

        let tradeValueUSD;

        let cryptoQuantity;



        user.assets = user.assets || new Map();

        const userBalance = user.balance || 0;

       

        // ++ UPDATED: Consistently use 'USDT' as the key (uppercase Binance symbol) ++

        const currentTetherAmount = user.assets.get('USDT') || 0;

        const totalLiquidBalance = userBalance + currentTetherAmount; // Represents combined USD and USDT balance



        let message = '';



        if (tradeType === 'buy') {

            tradeValueUSD = amount; // For buying, 'amount' is the USD value

            cryptoQuantity = tradeValueUSD / currentPrice;



            if (totalLiquidBalance < tradeValueUSD) {

                return res.status(400).json({ message: 'Insufficient USD/USDT balance to place buy order.' });

            }



            let remainingAmountToDeduct = tradeValueUSD;



            // Prioritize deducting from USD balance, then USDT asset

            if (userBalance >= remainingAmountToDeduct) {

                user.balance -= remainingAmountToDeduct;

            } else {

                remainingAmountToDeduct -= userBalance;

                user.balance = 0;

                // ++ UPDATED: Deduct from 'USDT' key ++

                user.assets.set('USDT', currentTetherAmount - remainingAmountToDeduct);

            }



            // ++ UPDATED: Store and retrieve crypto assets using their UPPERCASE Binance symbol ++

            const currentCryptoAmount = user.assets.get(coinId.toUpperCase()) || 0;

            user.assets.set(coinId.toUpperCase(), currentCryptoAmount + cryptoQuantity);



            message = `Successfully bought ${cryptoQuantity.toFixed(8)} ${coinId.toUpperCase()} for $${tradeValueUSD.toFixed(2)}.`;



        } else if (tradeType === 'sell') {

            cryptoQuantity = quantity; // For selling, 'quantity' is the crypto amount from frontend

            tradeValueUSD = cryptoQuantity * currentPrice;



            // ++ UPDATED: Retrieve crypto asset by UPPERCASE Binance symbol ++

            const currentCoinAmount = user.assets.get(coinId.toUpperCase()) || 0;

            if (currentCoinAmount < cryptoQuantity) {

                return res.status(400).json({ message: `Insufficient ${coinId.toUpperCase()} quantity to sell.` });

            }



            // ++ UPDATED: Deduct crypto asset by UPPERCASE Binance symbol ++

            user.assets.set(coinId.toUpperCase(), currentCoinAmount - cryptoQuantity);

            user.balance = user.balance + tradeValueUSD; // Add USD value back to fiat balance



            message = `Successfully sold ${cryptoQuantity.toFixed(8)} ${coinId.toUpperCase()} for $${tradeValueUSD.toFixed(2)}.`;

        }



        await user.save();



        const newOrder = new Order({

            userId,

            // ++ UPDATED: Store coinId as UPPERCASE Binance symbol in Order ++

            coinId: coinId.toUpperCase(),

            amount: cryptoQuantity,

            priceAtTrade: currentPrice,

            tradeType,

            status: 'Completed',

            tradeValueUSD,

        });

        await newOrder.save();



        res.status(200).json({

            message: message,

            userBalance: user.balance,

            userAssets: Object.fromEntries(user.assets),

            order: newOrder

        });



    } catch (error) {

        console.error('Error processing trade:', error);

        res.status(500).json({ message: 'Server error processing trade request.' });

    }

};



// This is the function for the "Instant Spot" converter tab

exports.handleInstantTrade = async (req, res) => {

    const userId = req.user.id;

    // ++ CHANGED: issuedCurrency and obtainedCurrency are now expected to be Binance Symbols (e.g., "BTC", "USDT") ++

    const { issuedCurrency, issuedAmount, obtainedCurrency, obtainedAmount } = req.body;



    if (!issuedCurrency || !issuedAmount || issuedAmount <= 0 || !obtainedCurrency || !obtainedAmount || obtainedAmount <= 0) {

        return res.status(400).json({ message: 'Missing or invalid parameters for instant trade.' });

    }

    if (issuedCurrency.toUpperCase() === obtainedCurrency.toUpperCase()) { // Case-insensitive comparison

        return res.status(400).json({ message: 'Cannot trade a currency for itself.' });

    }



    try {

        const user = await User.findById(userId);

        if (!user) {

            return res.status(404).json({ message: 'User not found.' });

        }



        const marketData = await fetchMarketPrices();

        // ++ UPDATED: Find coins by symbol, not ID. Ensure case-insensitive comparison. ++

        const issuedCoinData = marketData.find(coin => coin.symbol.toUpperCase() === issuedCurrency.toUpperCase());

        const obtainedCoinData = marketData.find(coin => coin.symbol.toUpperCase() === obtainedCurrency.toUpperCase());



        // ++ Add explicit checks for USD as it won't be in marketData fetched from Binance ++

        let issuedPrice;

        if (issuedCurrency.toUpperCase() === 'USD') {

            issuedPrice = 1;

        } else if (issuedCoinData) {

            issuedPrice = issuedCoinData.current_price;

        } else {

            return res.status(404).json({ message: `Issued currency ${issuedCurrency} not found in market data.` });

        }



        let obtainedPrice;

        if (obtainedCurrency.toUpperCase() === 'USD') {

            obtainedPrice = 1;

        } else if (obtainedCoinData) {

            obtainedPrice = obtainedCoinData.current_price;

        } else {

            return res.status(404).json({ message: `Obtained currency ${obtainedCurrency} not found in market data.` });

        }



        // Validate that both prices are available before proceeding

        if (issuedPrice === undefined || issuedPrice === null || obtainedPrice === undefined || obtainedPrice === null) {

            return res.status(500).json({ message: 'Could not retrieve price data for one or both currencies.' });

        }

       

        // ++ Re-calculate serverRate based on retrieved prices ++

        const serverRate = issuedPrice / obtainedPrice;

        const expectedObtainedAmount = issuedAmount * serverRate;

        // Allow a small tolerance for floating point errors or minor price fluctuations

        if (Math.abs(expectedObtainedAmount - obtainedAmount) / obtainedAmount > 0.015) { // 1.5% tolerance

             return res.status(400).json({ message: 'The exchange rate has changed. Please confirm the new rate and try again.' });

        }

       

        user.assets = user.assets || new Map();

        const userUsdBalance = user.balance || 0;



        // ++ Determine the actual key for the user's asset Map for issued/obtained currencies ++

        const issuedAssetKey = issuedCurrency.toUpperCase();

        const obtainedAssetKey = obtainedCurrency.toUpperCase();



        // Case A: Spending USD or USDT

        if (issuedAssetKey === 'USD' || issuedAssetKey === 'USDT') {

            const userTetherBalance = user.assets.get('USDT') || 0; // Use 'USDT' as the key

            // If spending USD, treat it as part of the liquid pool; otherwise, only USDT asset

            const combinedLiquidBalance = (issuedAssetKey === 'USD' ? userUsdBalance : 0) + userTetherBalance;



            if (issuedAmount > combinedLiquidBalance) {

                return res.status(400).json({ message: `Insufficient funds. You have a combined balance of ${combinedLiquidBalance.toFixed(2)} USD/USDT.` });

            }



            let remainingToDeduct = issuedAmount;



            // Prioritize deducting from user.balance (fiat USD) if spending USD, otherwise deduct from USDT

            if (issuedAssetKey === 'USD' && userUsdBalance >= remainingToDeduct) {

                user.balance -= remainingToDeduct;

            } else if (issuedAssetKey === 'USD') { // Spending USD but not enough in fiat, use USDT

                remainingToDeduct -= userUsdBalance;

                user.balance = 0;

                user.assets.set('USDT', userTetherBalance - remainingToDeduct);

            } else { // Spending USDT

                user.assets.set('USDT', userTetherBalance - issuedAmount);

            }

           

            // Add obtained amount to the respective asset

            const currentObtainedBalance = user.assets.get(obtainedAssetKey) || 0;

            user.assets.set(obtainedAssetKey, currentObtainedBalance + obtainedAmount);

        }

        // Case B: Receiving USD or USDT

        else if (obtainedAssetKey === 'USD' || obtainedAssetKey === 'USDT') {

            const userIssuedBalance = user.assets.get(issuedAssetKey) || 0;

            if (userIssuedBalance < issuedAmount) {

                return res.status(400).json({ message: `Insufficient ${issuedCurrency.toUpperCase()} balance.` });

            }

           

            // Deduct issued amount from the respective asset

            user.assets.set(issuedAssetKey, userIssuedBalance - issuedAmount);



            // Add obtained amount to USD balance or USDT asset

            if (obtainedAssetKey === 'USD') {

                user.balance += obtainedAmount;

            } else { // obtainedAssetKey === 'USDT'

                const currentTetherBalance = user.assets.get('USDT') || 0;

                user.assets.set('USDT', currentTetherBalance + obtainedAmount);

            }

        }

        // Case C: Standard Crypto-to-Crypto trade

        else {

            const userIssuedBalance = user.assets.get(issuedAssetKey) || 0;

            if (userIssuedBalance < issuedAmount) {

                return res.status(400).json({ message: `Insufficient ${issuedCurrency.toUpperCase()} balance.` });

            }



            user.assets.set(issuedAssetKey, userIssuedBalance - issuedAmount);

            const currentObtainedBalance = user.assets.get(obtainedAssetKey) || 0;

            user.assets.set(obtainedAssetKey, currentObtainedBalance + obtainedAmount);

        }



        await user.save();

       

        const newOrder = new Order({

            userId,

            // ++ Store obtainedCurrency as UPPERCASE Binance symbol in Order ++

            coinId: obtainedAssetKey,

            amount: obtainedAmount,

            priceAtTrade: obtainedPrice, // Use the price fetched

            tradeType: 'buy', // Always 'buy' from the perspective of the obtained currency

            status: 'Completed',

            // ++ Calculate tradeValueUSD based on obtainedAmount and its price ++

            tradeValueUSD: obtainedAmount * obtainedPrice,

        });

        await newOrder.save();

       

        res.status(200).json({

            message: `Successfully traded ${issuedAmount} ${issuedCurrency.toUpperCase()} for ${obtainedAmount.toFixed(8)} ${obtainedCurrency.toUpperCase()}`,

        });



    } catch (error) {

        console.error('Error processing instant trade:', error);

        res.status(500).json({ message: 'Server error processing instant trade.' });

    }

};