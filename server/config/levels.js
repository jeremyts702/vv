// server/config/levels.js

/**
 * Defines the level tiers based on USD balance.
 * Each object specifies a level, the minimum USD balance required to reach that level,
 * an upgrade gift awarded upon reaching the level, and a weekly award.
 * It's important to keep this array sorted by `minBalanceUSD` in ascending order.
 */
const LEVEL_TIERS = [
    { level: 1, minBalanceUSD: 0, upgradeGiftUSD: 0, weeklyAwardUSD: 0 }, // Base level, no gift/award
    { level: 2, minBalanceUSD: 500, upgradeGiftUSD: 1, weeklyAwardUSD: 0 },
    { level: 3, minBalanceUSD: 5000, upgradeGiftUSD: 10, weeklyAwardUSD: 1 },
    { level: 4, minBalanceUSD: 30000, upgradeGiftUSD: 500, weeklyAwardUSD: 10 },
    { level: 5, minBalanceUSD: 80000, upgradeGiftUSD: 1000, weeklyAwardUSD: 50 },
    { level: 6, minBalanceUSD: 200000, upgradeGiftUSD: 3000, weeklyAwardUSD: 100 },
    { level: 7, minBalanceUSD: 500000, upgradeGiftUSD: 5000, weeklyAwardUSD: 500 },
    // Add more levels as needed, following the pattern
];

module.exports = LEVEL_TIERS;
