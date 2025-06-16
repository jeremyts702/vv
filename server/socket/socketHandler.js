// server/socket/socketHandler.js
const axios = require("axios");

module.exports = (io) => {
  const BINANCE_API_BASE = "https://api.binance.com/api/v3";
  const BINANCE_WEBSOCKET_BASE = "wss://stream.binance.com:9443/ws";

  // ++ NEW: Explicitly list the Binance symbols (trading pairs) you want to fetch and stream ++
  const BINANCE_SYMBOLS_TO_LIST = [
        "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT",
        "AVAXUSDT", "SHIBUSDT", "DOTUSDT", "LTCUSDT", "LINKUSDT", "TRXUSDT",
        "UNIUSDT", "ARBUSDT", // Corrected Arbitrum symbol
        "ATOMUSDT", "OPUSDT", "NEARUSDT", "IMXUSDT", "APTUSDT", "VETUSDT",
        "ETCUSDT", "FILUSDT", "QNTUSDT", "HBARUSDT", "XMRUSDT", "ICPUSDT",
        "FTMUSDT", "EOSUSDT", "GRTUSDT", "AAVEUSDT", "MANAUSDT", "SANDUSDT",
        "CHZUSDT", "INJUSDT", "FLOWUSDT", "MKRUSDT", "RNDRUSDT", "STXUSDT",
        "PEPEUSDT", "FLOKIUSDT", "BONKUSDT", "SEIUSDT", "SUIUSDT", "TIAUSDT",
        "PYTHUSDT", "WLDUSDT", "ORDIUSDT", "JOEUSDT", "USDTUSDT"
  ];
  // This array represents the exact symbols we'll query and track.

  let allCryptoData = []; // Will store formatted data: { id: "btc", symbol: "BTC", name: "BTC", current_price: X }

  // --- Fetching and Caching Crypto Data from Binance (REST API for snapshot) ---
  async function fetchAndCacheCryptoData() {
    try {
      console.log("Fetching crypto data from Binance REST API...");
      const response = await axios.get(`${BINANCE_API_BASE}/ticker/24hr`);

      if (response.data && response.data.length > 0) {
        const binanceDataMap = new Map();
        // Populate map only with the symbols we care about
        response.data.forEach(item => {
          if (BINANCE_SYMBOLS_TO_LIST.includes(item.symbol)) {
            binanceDataMap.set(item.symbol, item);
          }
        });

        // Reconstruct allCryptoData based on our desired symbols
        allCryptoData = BINANCE_SYMBOLS_TO_LIST.map(binanceSymbol => {
          const binanceCoin = binanceDataMap.get(binanceSymbol);
          if (binanceCoin) {
            const baseSymbol = binanceCoin.symbol.replace("USDT", "");
            return {
              id: baseSymbol.toLowerCase(), // Frontend still uses 'id' for array lookups, make it lowercase base symbol
              symbol: baseSymbol, // Actual base symbol (e.g., BTC)
              name: baseSymbol, // Name (can be same as symbol for simplicity)
              current_price: parseFloat(binanceCoin.lastPrice),
            };
          }
          return null; // If a symbol from our list isn't found on Binance, it will be null
        }).filter(Boolean); // Remove null entries

        console.log(`Fetched ${allCryptoData.length} crypto prices from Binance.`);
        io.emit("realtime-price-update", allCryptoData);
      } else {
        console.warn("No crypto data received from Binance REST API.");
      }
    } catch (error) {
      console.error("Error fetching and caching crypto data from Binance:", error.message);
      io.emit("realtime-price-update-error", "Failed to fetch crypto prices from Binance.");
    }
  }

  // Initial fetch for crypto data
  fetchAndCacheCryptoData();

  // Schedule periodic updates for crypto data
  setInterval(fetchAndCacheCryptoData, 60000); 

  // --- Socket.IO Connection Handling ---
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Emit initial crypto data upon client connection
    socket.emit("realtime-price-update", allCryptoData);
    console.log(`Client ${socket.id} connected. Sent initial ${allCryptoData.length} crypto items.`);

    // Handle requests for OHLC data (using Binance's /klines endpoint)
    socket.on('request-ohlc', async ({ coinId }) => { // coinId here is the base Binance Symbol (e.g., "BTC") from frontend
        console.log(`OHLC data request for ${coinId}.`);
        try {
            // ++ UPDATED: Reconstruct the full Binance trading pair symbol ++
            const binanceTradingPairSymbol = coinId.toUpperCase() + 'USDT'; 
            
            // Check if the requested symbol is in our allowed list to prevent arbitrary calls
            if (!BINANCE_SYMBOLS_TO_LIST.includes(binanceTradingPairSymbol)) {
                 return socket.emit('ohlc-error', { coinId, message: `Unsupported symbol for OHLC data: ${coinId}.` });
            }

            // Fetch 7 days of 1-day candlestick data
            const response = await axios.get(`${BINANCE_API_BASE}/klines`, {
                params: {
                    symbol: binanceTradingPairSymbol, // Use the full trading pair symbol
                    interval: '1d', 
                    limit: 7 
                }
            });

            const ohlcData = response.data.map(kline => [
                kline[0], 
                parseFloat(kline[1]), 
                parseFloat(kline[2]), 
                parseFloat(kline[3]), 
                parseFloat(kline[4])  
            ]);

            socket.emit('ohlc-data', { coinId, data: ohlcData });
        } catch (error) {
            console.error(`Error fetching OHLC data for ${coinId} from Binance:`, error.message);
            socket.emit('ohlc-error', { coinId, message: `Failed to fetch OHLC data for ${coinId}.` });
        }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};
