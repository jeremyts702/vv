// public/js/wallet.js

document.addEventListener('DOMContentLoaded', async () => {
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    const token = localStorage.getItem('token');
    const BASE_URL = 'http://localhost:5000'; // Your backend base URL

    // Helper function to show floating messages
    function showMessage(message, type) {
        const authMessage = document.getElementById('authMessage');
        if (!authMessage) {
            console.error('authMessage element not found.');
            return;
        }
        authMessage.textContent = message;
        authMessage.className = `auth-message show ${type}`; // Add show and type classes
        setTimeout(() => {
            authMessage.classList.remove('show');
            authMessage.classList.add('hidden'); // Ensure it's fully hidden after transition
        }, 5000); // Message disappears after 5 seconds
        authMessage.classList.remove('hidden'); // Make sure it's visible when showing
    }

    // Redirect if not authenticated or not a regular user for wallet page
    if (!token || (userRole !== 'user' && userRole !== 'admin')) {
        window.location.href = 'login.html';
        return; // Stop execution
    }

    // --- Main Wallet View Elements ---
    const mainWalletView = document.getElementById('mainWalletView');
    const balanceUSDElement = document.getElementById('balanceUSD');
    const totalPortfolioValueElement = document.getElementById('totalPortfolioValue'); // NEW: For total value
    const assetsList = document.getElementById('assetsList');
    const depositButton = document.getElementById('depositBtn');
    const withdrawalButton = document.getElementById('withdrawalBtn');
    const historyButton = document.getElementById('historyBtn');

    // --- Deposit Section Elements ---
    const depositSection = document.getElementById('depositSection');
    const depositCurrencySelect = document.getElementById('depositCurrency');
    const addressText = document.getElementById('addressText');
    const copyAddressBtn = document.getElementById('copyAddressBtn');
    const depositForm = document.getElementById('depositForm');
    const depositAmountInput = document.getElementById('depositAmount');
    const depositTxIdInput = document.getElementById('depositTxId');
    const backToWalletFromDepositBtn = document.getElementById('backToWalletFromDeposit');
    const depositTxIdLabel = document.querySelector('label[for="depositTxId"]'); // Label for deposit Tx ID
    const depositedAssetsList = document.getElementById('depositedAssetsList'); // NEW: Deposited Assets List element

    // --- Withdrawal Section Elements ---
    const withdrawalSection = document.getElementById('withdrawalSection');
    const withdrawalForm = document.getElementById('withdrawalForm');
    const withdrawalCurrencySelect = document.getElementById('withdrawalCurrency');
    const withdrawalAmountInput = document.getElementById('withdrawalAmount');
    const withdrawalAddressInput = document.getElementById('withdrawalAddress'); // The input field for withdrawal address
    const withdrawalAddressLabel = document.querySelector('label[for="withdrawalAddress"]');
    const backToWalletFromWithdrawalBtn = document.getElementById('backToWalletFromWithdrawal');

    // --- History Section Elements ---
    const historySection = document.getElementById('historySection');
    const depositHistoryContainer = document.getElementById('depositHistoryContainer');
    const withdrawalHistoryContainer = document.getElementById('withdrawalHistoryContainer');
    const backToWalletFromHistoryBtn = document.getElementById('backToWalletFromHistory');

    // Define deposit addresses (editable in code) - these would typically come from backend
    const depositAddresses = {
        'USDT': 'TRC20_OR_ERC20_ADDRESS_HERE_FOR_USDT_EXAMPLE',
        'ETH': 'ETH_ADDRESS_HERE_EXAMPLE',
        'BTC': 'BTC_ADDRESS_HERE_EXAMPLE',
        'BNB': 'BNB_ADDRESS_HERE_EXAMPLE' 
    };

    /**
     * Helper to get JWT token from localStorage.
     * @returns {string|null} The JWT token or null if not found.
     */
    function getToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('Authentication token not found. Redirecting to login.');
            window.location.href = 'login.html';
            return null;
        }
        return token;
    }

    // Fetch and display wallet information
    async function fetchWalletInfo() {
        try {
            const response = await fetch(`${BASE_URL}/api/wallet`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok) {
                balanceUSDElement.textContent = data.balanceUSD.toFixed(2); 
                totalPortfolioValueElement.textContent = data.totalPortfolioValueUSD.toFixed(2); 

                assetsList.innerHTML = ''; 

                // Display crypto assets
                if (data.assets && data.assets.length > 0) {
                    data.assets.forEach(asset => {
                        const assetItem = document.createElement('div');
                        assetItem.classList.add('asset-item');
                        assetItem.innerHTML = `
                            <span>${asset.symbol.toUpperCase()}:</span>
                            <span>${asset.amount.toFixed(6)}</span>
                            <span class="asset-usd-value">($${asset.usdValue.toFixed(2)})</span>
                        `;
                        assetsList.appendChild(assetItem);
                    });
                } else {
                    assetsList.innerHTML = '<p style="text-align: center;">No crypto assets held.</p>';
                }

                // Populate deposit and withdrawal currency dropdowns dynamically
                // Pass the assets from the wallet info, which should now be filtered by backend
                populateCurrencyDropdowns(data.assets); 
            } else {
                showMessage(`Error fetching wallet info: ${data.message || 'Something went wrong.'}`, 'error');
            }
        } catch (error) {
            showMessage(`Network error: ${error.message}`, 'error');
            console.error('Error fetching wallet info:', error);
        }
    }

    // Function to populate currency dropdowns
    // ++ MODIFIED: Prioritizes assets from backend, then adds common defaults if not present ++
    function populateCurrencyDropdowns(userAssets) {
        depositCurrencySelect.innerHTML = '<option value="">Select Currency</option>';
        withdrawalCurrencySelect.innerHTML = '<option value="">Select Currency</option>';

        const addedSymbols = new Set(); 

        // 1. Add assets that the user actually holds (and have price data)
        userAssets.forEach(asset => {
            if (asset.symbol && asset.currentPriceUSD !== 0 && !addedSymbols.has(asset.symbol.toUpperCase())) { 
                const symbol = asset.symbol.toUpperCase();
                addedSymbols.add(symbol);

                const depositOption = document.createElement('option');
                depositOption.value = symbol; 
                depositOption.textContent = symbol;
                depositCurrencySelect.appendChild(depositOption);

                const withdrawalOption = document.createElement('option');
                withdrawalOption.value = symbol; 
                withdrawalOption.textContent = symbol;
                withdrawalCurrencySelect.appendChild(withdrawalOption);
            }
        });

        // 2. Add 'USD' specifically for deposit/withdrawal if not already present via a held 'USD' asset
       
        // 3. Add a few common default crypto options if they are not already present from user assets
        // This list should ideally align with the BINANCE_SYMBOLS_TO_LIST in your backend services
        const commonDefaultCryptos = ["BTC", "ETH", "USDT", "BNB"]; 
        commonDefaultCryptos.forEach(symbol => {
            const upperSymbol = symbol.toUpperCase();
            if (!addedSymbols.has(upperSymbol)) { 
                addedSymbols.add(upperSymbol); 

                const depositOption = document.createElement('option');
                depositOption.value = upperSymbol;
                depositOption.textContent = upperSymbol;
                depositCurrencySelect.appendChild(depositOption);

                const withdrawalOption = document.createElement('option');
                withdrawalOption.value = upperSymbol;
                withdrawalOption.textContent = upperSymbol;
                withdrawalCurrencySelect.appendChild(withdrawalOption);
            }
        });
    }

    // --- History Fetching ---
    async function fetchDepositHistory() {
        try {
            const response = await fetch(`${BASE_URL}/api/wallet/deposits/history`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok) {
                if (data.deposits && data.deposits.length > 0) {
                    depositHistoryContainer.innerHTML = ''; 
                    data.deposits.forEach(deposit => {
                        const depositCard = document.createElement('div');
                        depositCard.classList.add('history-card');
                        const date = new Date(deposit.createdAt).toLocaleString();
                        const displayStatus = deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1);
                        let statusClass = '';
                        if (deposit.status === 'pending') statusClass = 'status-pending';
                        else if (deposit.status === 'completed') statusClass = 'status-completed';
                        else if (deposit.status === 'rejected') statusClass = 'status-rejected';

                        depositCard.innerHTML = `
                            <div class="history-card-header">
                                <span class="history-card-amount">+ $${deposit.amount.toFixed(2)}</span>
                                <span class="history-card-status ${statusClass}">${displayStatus}</span>
                            </div>
                            <div class="history-card-details">
                                <p><strong>Type:</strong> Deposit</p>
                                <p><strong>Currency:</strong> ${deposit.currency.toUpperCase()}</p>
                                <p><strong>Tx ID:</strong> ${deposit.txId || 'N/A'}</p>
                                <p><strong>Date:</strong> ${date}</p>
                            </div>
                        `;
                        depositHistoryContainer.appendChild(depositCard);
                    });
                } else {
                    depositHistoryContainer.innerHTML = '<p style="text-align: center;">No deposit history found.</p>';
                }
            } else {
                showMessage(`Error fetching deposit history: ${data.message || 'Something went wrong.'}`, 'error');
            }
        } catch (error) {
            showMessage(`Network error: ${error.message}`, 'error');
            console.error('Error fetching deposit history:', error);
        }
    }

    // Function to fetch and display withdrawal history as cards
    async function fetchWithdrawalHistory() {
        try {
            const response = await fetch(`${BASE_URL}/api/wallet/withdrawals/history`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            if (response.ok) {
                if (data.withdrawals && data.withdrawals.length > 0) {
                    withdrawalHistoryContainer.innerHTML = ''; 
                    data.withdrawals.forEach(withdrawal => {
                        const withdrawalCard = document.createElement('div');
                        withdrawalCard.classList.add('history-card');
                        const date = new Date(withdrawal.createdAt).toLocaleString();
                        const displayStatus = withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1);
                        let statusClass = '';
                        if (withdrawal.status === 'pending') statusClass = 'status-pending';
                        else if (withdrawal.status === 'completed') statusClass = 'status-completed';
                        else if (withdrawal.status === 'rejected') statusClass = 'status-rejected';

                        withdrawalCard.innerHTML = `
                            <div class="history-card-header">
                                <span class="history-card-amount">- $${withdrawal.amount.toFixed(2)}</span>
                                <span class="history-card-status ${statusClass}">${displayStatus}</span>
                            </div>
                            <div class="history-card-details">
                                <p><strong>Type:</strong> Withdrawal</p>
                                <p><strong>Currency:</strong> ${withdrawal.currency.toUpperCase()}</p>
                                <p><strong>Address/Details:</strong> ${withdrawal.address}</p>
                                <p><strong>Date:</strong> ${date}</p>
                            </div>
                        `;
                        withdrawalHistoryContainer.appendChild(withdrawalCard);
                    });
                } else {
                    withdrawalHistoryContainer.innerHTML = '<p style="text-align: center;">No withdrawal history found.</p>';
                }
            } else {
                showMessage(`Error fetching withdrawal history: ${data.message || 'Something went wrong.'}`, 'error');
            }
        } catch (error) {
            showMessage(`Network error: ${error.message}`, 'error');
            console.error('Error fetching withdrawal history:', error);
        }
    }

    // Function to hide all sections and show a specific one
    function showSection(sectionToShow) {
        mainWalletView.classList.add('hidden');
        depositSection.classList.add('hidden');
        withdrawalSection.classList.add('hidden');
        historySection.classList.add('hidden'); 

        sectionToShow.classList.remove('hidden');
    }


    // --- Event Listeners for Navigation ---
    depositButton.addEventListener('click', () => {
        showSection(depositSection);
        addressText.textContent = 'Please select a cryptocurrency to see the address.';
        copyAddressBtn.classList.add('hidden'); 
    });

    withdrawalButton.addEventListener('click', () => {
        showSection(withdrawalSection);
    });

    historyButton.addEventListener('click', () => {
        showSection(historySection);
        fetchDepositHistory();
        fetchWithdrawalHistory();
    });

    backToWalletFromDepositBtn.addEventListener('click', () => {
        showSection(mainWalletView);
        fetchWalletInfo(); 
    });

    backToWalletFromWithdrawalBtn.addEventListener('click', () => {
        showSection(mainWalletView);
        fetchWalletInfo(); 
    });

    backToWalletFromHistoryBtn.addEventListener('click', () => {
        showSection(mainWalletView);
        fetchWalletInfo(); 
    });


    // --- Deposit Form Logic ---
    depositCurrencySelect.addEventListener('change', () => {
        const selectedCurrencySymbol = depositCurrencySelect.value; 
        if (selectedCurrencySymbol) {
            let depositAddress = depositAddresses[selectedCurrencySymbol.toUpperCase()] || `GENERATED_ADDRESS_FOR_${selectedCurrencySymbol.toUpperCase()}_HERE`;
            
            if (selectedCurrencySymbol.toUpperCase() === 'USDT') {
                depositTxIdLabel.textContent = 'Transaction Hash/ID (Optional for USDT)'; 
            } else if (selectedCurrencySymbol.toUpperCase() === 'BTC') {
                depositTxIdLabel.textContent = 'Transaction ID';
            } else if (selectedCurrencySymbol.toUpperCase() === 'ETH') {
                depositTxIdLabel.textContent = 'Transaction Hash/ID';
            } else {
                depositTxIdLabel.textContent = 'Transaction ID';
            }
            addressText.textContent = `Deposit Address for ${selectedCurrencySymbol.toUpperCase()}: ${depositAddress}`;
            copyAddressBtn.classList.remove('hidden'); 
        } else {
            addressText.textContent = 'Please select a cryptocurrency to see the address.';
            copyAddressBtn.classList.add('hidden');
        }
    });

    copyAddressBtn.addEventListener('click', () => {
        const address = addressText.textContent.split(': ')[1]; 
        if (address) {
            document.execCommand('copy'); 
            showMessage('Deposit address copied to clipboard!', 'success');
        } else {
            showMessage('Failed to copy address.', 'error');
        }
    });
    
    depositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currencySymbol = depositCurrencySelect.value; 
        const amount = parseFloat(depositAmountInput.value);
        const txId = depositTxIdInput.value.trim();

        if (!currencySymbol || !amount || amount <= 0) {
            return showMessage('Please select currency and enter a valid amount.', 'error');
        }

        try {
            const response = await fetch(`${BASE_URL}/api/wallet/recharge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ currency: currencySymbol.toUpperCase(), amount, txId }) 
            });
            const data = await response.json();

            if (response.ok) {
                showMessage(data.message, 'success');
                depositForm.reset();
                addressText.textContent = 'Please select a cryptocurrency to see the address.';
                copyAddressBtn.classList.add('hidden');
                fetchWalletInfo(); 
            } else {
                showMessage(`Deposit failed: ${data.message || 'Something went wrong.'}`, 'error');
                console.error('Deposit error:', data.message);
            }
        } catch (error) {
            showMessage(`Network error: ${error.message}`, 'error');
            console.error('Deposit fetch error:', error);
        }
    });

    // --- Withdrawal Form Logic ---
    withdrawalCurrencySelect.addEventListener('change', () => {
        const selectedCurrencySymbol = withdrawalCurrencySelect.value; 
        if (selectedCurrencySymbol) {
            withdrawalAddressLabel.textContent = `Enter ${selectedCurrencySymbol.toUpperCase()} Address:`;
            withdrawalAddressInput.placeholder = `Enter your ${selectedCurrencySymbol.toUpperCase()} address`;
        } else {
            withdrawalAddressLabel.textContent = `Withdrawal Address / Bank Details:`;
            withdrawalAddressInput.placeholder = `Enter crypto address or bank info`;
        }
    });


    // --- Withdrawal Form Handling ---
    withdrawalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currencySymbol = withdrawalCurrencySelect.value; 
        const amount = parseFloat(withdrawalAmountInput.value);
        const address = withdrawalAddressInput.value.trim();

        if (!currencySymbol || !amount || amount <= 0 || !address) {
            return showMessage('Please select currency, enter a valid amount, and withdrawal address.', 'error');
        }
        if (address.length < 10) { 
            return showMessage('Please enter a valid withdrawal address (at least 10 characters).', 'error');
        }

        try {
            const response = await fetch(`${BASE_URL}/api/wallet/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ currency: currencySymbol.toUpperCase(), amount, address }) 
            });
            const data = await response.json();

            if (response.ok) {
                showMessage(data.message, 'success');
                withdrawalForm.reset();
                fetchWalletInfo(); 
            } else {
                showMessage(`Withdrawal failed: ${data.message || 'Something went wrong.'}`, 'error');
                console.error('Withdrawal error:', data.message);
            }
        } catch (error) {
            showMessage(`Network error: ${error.message}`, 'error');
            console.error('Withdrawal fetch error:', error);
        }
    });

    // --- NEW: Handle URL Hash on Page Load and Hash Change ---
    function handleUrlHash() {
        const hash = window.location.hash.substring(1); 

        switch (hash) {
            case 'deposit':
                showSection(depositSection);
                break;
            case 'withdraw':
                showSection(withdrawalSection);
                break;
            case 'history':
                showSection(historySection);
                fetchDepositHistory(); 
                fetchWithdrawalHistory();
                break;
            default:
                showSection(mainWalletView);
                fetchWalletInfo(); 
                break;
        }
    }

    // Initial load: Call the handler on page load
    handleUrlHash();

    // Listen for hash changes (e.g., if user clicks internal links that only change the hash)
    window.addEventListener('hashchange', handleUrlHash);
});
