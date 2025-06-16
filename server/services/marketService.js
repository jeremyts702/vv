// server/services/marketService.js
const axios = require('axios');

exports.fetchMarketPrices = async () => {
    const BINANCE_API_BASE = "https://api.binance.com/api/v3";

    try {
        console.log("Fetching ALL USDT-paired market data from Binance...");
        // Fetch 24hr ticker data for ALL symbols.
        const response = await axios.get(`${BINANCE_API_BASE}/ticker/24hr`);

        if (response.data && response.data.length > 0) {
            const formattedMarketData = [];
            // Filter for USDT pairs and format the data
            response.data.forEach(item => {
                if (item.symbol.endsWith('USDT') && item.symbol !== 'USDTUSDT') { // Exclude USDTUSDT if you consider USDT as fiat
                    const baseSymbol = item.symbol.replace("USDT", "");
                    formattedMarketData.push({
                        id: baseSymbol.toLowerCase(), // Frontend will use this as identifier (e.g., "btc")
                        symbol: baseSymbol,           // Actual Binance base symbol (e.g., "BTC")
                        name: baseSymbol,             // Display name (can be same as symbol)
                        current_price: parseFloat(item.lastPrice),
                    });
                }
            });

            // Explicitly add USDT's price as 1 for internal calculations
            formattedMarketData.push({
                id: 'usdt',
                symbol: 'USDT',
                name: 'Tether',
                current_price: 1.0 // USDT is typically pegged to 1 USD
            });

            console.log(`Successfully fetched and formatted ${formattedMarketData.length} crypto prices from Binance.`);
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
