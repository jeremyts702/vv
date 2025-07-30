// server/services/marketService.js

const axios = require('axios');

exports.fetchMarketPrices = async () => {
    const BINANCE_API_BASE = "https://api.binance.com/api/v3";

    // ++ UPDATED: Explicitly list the Binance symbols (trading pairs) you want to fetch and stream ++
    // Note: These are the full trading pairs with 'USDT' appended, matching Binance's API.
    const BINANCE_SYMBOLS_TO_LIST = [
        "BTCUSDT", "ETHUSDT", "LTCUSDT", "BNBUSDT", "TRXUSDT", "EOSUSDT", "DOGEUSDT", "BCHUSDT",
        "APTUSDT", "OPUSDT", "LDOUSDT", "ADAUSDT", "DOTUSDT", "ATOMUSDT", "LINKUSDT",
        "IMXUSDT", "FILUSDT", "MANAUSDT", "XRPUSDT", "XLMUSDT", "VETUSDT", "UNIUSDT",
        "SOLUSDT", "SHIBUSDT", "SANDUSDT", "NEARUSDT", "AAVEUSDT", "GRTUSDT", "ENSUSDT",
        "DYDXUSDT", "AXSUSDT", "AVAXUSDT", "TRUMPUSDT", "USDTUSDT", "ICPUSDT", "ETCUSDT",
        "MKRUSDT", "COMPUSDT", "SNXUSDT", "FTMUSDT", "ZECUSDT", "ENJUSDT", "CHZUSDT",
        "INJUSDT", "RNDRUSDT", "SUIUSDT", "GALAUSDT", "ARBCHUSDT", "FLOKIUSDT", "PEPEUSDT", "WIFUSDT"
    ];
    // --- END UPDATED ---

    try {
        console.log("Fetching ALL USDT-paired market data from Binance...");

        const response = await axios.get(`${BINANCE_API_BASE}/ticker/24hr`);

        if (response.data && response.data.length > 0) {
            const formattedMarketData = [];

            // Filter for USDT pairs that are in our predefined list and format the data
            response.data.forEach(item => {
                // Only process items that are in our BINANCE_SYMBOLS_TO_LIST
                if (BINANCE_SYMBOLS_TO_LIST.includes(item.symbol)) {
                    // Extract base symbol by removing 'USDT'
                    const baseSymbol = item.symbol.replace("USDT", "");
                    formattedMarketData.push({
                        id: baseSymbol.toLowerCase(), // Frontend will use this as identifier (e.g., "btc")
                        symbol: baseSymbol,          // Actual Binance base symbol (e.g., "BTC")
                        name: baseSymbol,            // Display name (can be same as symbol)
                        current_price: parseFloat(item.lastPrice),
                        price_change_percentage_24h: parseFloat(item.priceChangePercent)
                    });
                }
            });

            // Explicitly add USDT's price as 1 for internal calculations, if not already included
            // This ensures USDT is always present with a value of 1.0, even if not explicitly in the API response or if its symbol is 'USDTUSDT' which gets filtered out.
            if (!formattedMarketData.some(coin => coin.id === 'usdt')) {
                formattedMarketData.push({
                    id: 'usdt',
                    symbol: 'USDT',
                    name: 'Tether',
                    current_price: 1.0, // USDT is typically pegged to 1 USD
                    price_change_percentage_24h: 0 // USDT doesn't change much
                });
            }

            console.log(`Successfully fetched and formatted ${formattedMarketData.length} crypto prices from Binance (filtered by new list).`);
            return formattedMarketData;

        } else {
            console.warn("No data received from Binance market ticker endpoint.");
            return [];
        }
    } catch (error) {
        console.error('Failed to fetch market prices from Binance:', error.message);
        return [];
    }
};
