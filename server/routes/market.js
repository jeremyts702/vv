const express = require('express');
const { fetchMarketPrices } = require('../services/marketService');
const router = express.Router();

// --- Caching variables ---
let cachedMarketData = null;
let lastFetchTime = 0;
const CACHE_DURATION = 50 * 1000; // Cache data for 30 seconds (adjust as needed)
// --- End Caching variables ---


// Helper function to get market data, using cache
async function getMarketDataWithCache() {
    const currentTime = Date.now();
    // Check if cache is still valid
    if (cachedMarketData && (currentTime - lastFetchTime < CACHE_DURATION)) {
        console.log("Serving market data from cache.");
        return cachedMarketData;
    }

    // If cache is stale or empty, fetch new data
    console.log("Fetching new market data for cache...");
    try {
        const data = await fetchMarketPrices();
        cachedMarketData = data;
        lastFetchTime = currentTime;
        console.log("Market data cached successfully.");
        return data;
    } catch (error) {
        console.error("Failed to fetch new market data for caching:", error.message);
        // If fetching new data fails, try to return stale cache if available
        if (cachedMarketData) {
            console.warn("Returning stale cache due to new fetch failure.");
            return cachedMarketData;
        }
        throw error; // If no cache and fetch failed, re-throw error
    }
}


// Route to get market data with pagination
router.get('/coins', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 6; // Default to limit 6, matching frontend

        const actualLimit = Math.min(limit, 100); // Cap at 100 coins per page for safety

        // Fetch all market data using the caching mechanism
        const allCoins = await getMarketDataWithCache();

        // Implement pagination manually
        const startIndex = (page - 1) * actualLimit;
        const endIndex = page * actualLimit;
        const paginatedCoins = allCoins.slice(startIndex, endIndex);

        // Estimate total pages
        const totalPages = Math.ceil(allCoins.length / actualLimit);

        const formattedPaginatedCoins = paginatedCoins.map(coin => ({
            id: coin.id,
            symbol: coin.symbol.toLowerCase(),
            name: coin.name,
            image: `https://placehold.co/32x32/cccccc/000000?text=${coin.symbol}`, // Placeholder for image
            current_price: coin.current_price,
            price_change_percentage_24h: coin.price_change_percentage_24h,
            sparkline_in_7d: { price: [] } // Not available from Binance /ticker/24hr
        }));

        res.json({
            coins: formattedPaginatedCoins,
            currentPage: page,
            totalPages: totalPages
        });

    } catch (error) {
        console.error('Error in /coins route:', error.message);
        if (error.response) {
            res.status(error.response.status).json({ message: 'Error fetching market data', details: error.response.data });
        } else if (error.request) {
            res.status(500).json({ message: 'No response from API' });
        } else {
            res.status(500).json({ message: 'Server error fetching market data' });
        }
    }
});

// Route to get all coins for the trade page dropdown
router.get('/coins/all', async (req, res) => {
    try {
        // Fetch all market data using the caching mechanism
        const allCoins = await getMarketDataWithCache();

        const formattedAllCoins = allCoins.map(coin => ({
            id: coin.id,
            symbol: coin.symbol.toLowerCase(),
            name: coin.name,
            image: `https://placehold.co/32x32/cccccc/000000?text=${coin.symbol}`, // Placeholder for image
            current_price: coin.current_price,
            price_change_percentage_24h: coin.price_change_percentage_24h
        }));

        res.json(formattedAllCoins);

    } catch (error) {
        console.error('Error in /coins/all route:', error.message);
        if (error.response) {
            res.status(error.response.status).json({ message: 'Error fetching all coins', details: error.response.data });
        } else if (error.request) {
            res.status(500).json({ message: 'No response from API' });
        } else {
            res.status(500).json({ message: 'Server error fetching all coins' });
        }
    }
});

module.exports = router;
