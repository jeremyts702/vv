// public/js/level.js

document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('userId');
    const token = localStorage.getItem('token');
    const BASE_URL = 'http://localhost:5000'; // Your backend base URL

    const currentLevelDisplay = document.getElementById('currentLevelDisplay');
    const levelCards = document.querySelectorAll('.level-card'); // All level cards

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    async function fetchAndDisplayUserLevel() {
        try {
            const response = await fetch(`${BASE_URL}/api/wallet`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (response.ok) {
                const userLevel = data.currentLevel;
                // ++ MODIFIED: Use totalPortfolioValueUSD for description, as this is what the level is based on ++
                const totalPortfolioValue = data.totalPortfolioValueUSD;

                if (currentLevelDisplay) {
                    currentLevelDisplay.innerHTML = `Lv ${userLevel} <a href="wallet.html#deposit" class="upgrade-button">Go to Upgrade <i class="fas fa-chevron-right"></i></a>`;
                }

                // Update description section
                const descriptionSection = document.querySelector('.description-section p');
                if (descriptionSection) {
                    // ++ MODIFIED: Display totalPortfolioValue for "total assets" ++
                    descriptionSection.textContent = `Your current total assets are $${totalPortfolioValue.toFixed(2)} , putting you at Lv ${userLevel}.`;
                }


                // Highlight the current level card
                levelCards.forEach(card => {
                    card.classList.remove('active-level'); // Remove any existing active class
                    // Ensure the class name matches 'lvX' format, e.g., 'level-card lv1'
                    const cardLevelMatch = card.classList.value.match(/lv(\d+)/);
                    if (cardLevelMatch && parseInt(cardLevelMatch[1]) === userLevel) {
                        card.style.border = '2px solid #36dae2'; // Highlight with a border
                        card.style.boxShadow = '0 0 15px rgba(54, 218, 226, 0.5)';
                    } else {
                        // Reset styles for non-active cards if they were previously highlighted
                        card.style.border = '';
                        card.style.boxShadow = '';
                    }
                });

            } else {
                console.error('Failed to fetch wallet info for level:', data.message);
                if (currentLevelDisplay) {
                    currentLevelDisplay.textContent = 'Error loading level.';
                }
            }
        } catch (error) {
            console.error('Network or server error fetching level info:', error);
            if (currentLevelDisplay) {
                currentLevelDisplay.textContent = 'Network error.';
            }
        }
    }

    fetchAndDisplayUserLevel();
});
