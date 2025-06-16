const express = require('express');
const axios = require('axios');
const router = express.Router();

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Route to get market data with pagination (existing route)
router.get('/coins', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Default to page 1
        const limit = parseInt(req.query.limit) || 6; // Default to limit 6, matching frontend

        // Ensure limit is within a reasonable range to prevent very large requests
        const actualLimit = Math.min(limit, 100); // Cap at 100 coins per page for safety

        const response = await axios.get(`${COINGECKO_API_BASE}/coins/markets`, {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc', // Order by market cap descending
                per_page: actualLimit,     // Number of results per page
                page: page,                // Current page number
                sparkline: true,           // Include 7-day sparkline data
                price_change_percentage: '24h' // Include 24h price change
            }
        });

        const coins = response.data;

        // For simplicity, we'll estimate total pages based on current page's limit and data.
        // In a real application, you might use CoinGecko's max pages if provided,
        // or make a separate request to get total count if available.
        // As CoinGecko's /coins/markets doesn't directly give total count,
        // we'll assume there are more pages if we get `actualLimit` coins.
        // This is an approximation for pagination control in the frontend.
        const totalPages = coins.length < actualLimit ? page : page + 1; // Basic logic: if we got fewer than limit, this is the last page, else there might be more.
        // A more robust solution might involve a fixed large number or fetching a small set to guess total.

        res.json({
            coins: coins,
            currentPage: page,
            totalPages: totalPages
        });

    } catch (error) {
        console.error('Error fetching market data from CoinGecko:', error.message);
        if (error.response) {
            console.error('CoinGecko API Response Error:', error.response.status, error.response.data);
            res.status(error.response.status).json({ message: 'Error fetching market data', details: error.response.data });
        } else if (error.request) {
            console.error('No response received from CoinGecko API:', error.request);
            res.status(500).json({ message: 'No response from CoinGecko API' });
        } else {
            console.error('Error setting up CoinGecko API request:', error.message);
            res.status(500).json({ message: 'Server error fetching market data' });
        }
    }
});

// NEW ROUTE: To get all coins for the trade page dropdown
router.get('/coins/all', async (req, res) => {
    try {
        // Fetch a larger number of coins, assuming the dropdown needs a more comprehensive list.
        // CoinGecko's /coins/markets endpoint is paginated, so we might need to fetch multiple pages
        // or accept a reasonable limit for the dropdown. A limit of 250 is usually sufficient for common coins.
        const response = await axios.get(`${COINGECKO_API_BASE}/coins/markets`, {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc', // Order by market cap descending
                per_page: 250,             // Fetch a larger number of popular coins
                page: 1,                   // Start from the first page
                sparkline: false,          // No need for sparkline data for the dropdown
                price_change_percentage: '24h' // Still useful for displaying initial info
            }
        });

        const allCoins = response.data;
        res.json(allCoins); // Send the array of all coins directly

    } catch (error) {
        console.error('Error fetching all coins from CoinGecko:', error.message);
        if (error.response) {
            console.error('CoinGecko API Response Error:', error.response.status, error.response.data);
            res.status(error.response.status).json({ message: 'Error fetching all coins', details: error.response.data });
        } else if (error.request) {
            console.error('No response received from CoinGecko API:', error.request);
            res.status(500).json({ message: 'No response from CoinGecko API' });
        } else {
            console.error('Error setting up CoinGecko API request:', error.message);
            res.status(500).json({ message: 'Server error fetching all coins' });
        }
    }
});

module.exports = router;