// public/js/admin.js

document.addEventListener('DOMContentLoaded', async () => {
    const BASE_URL = 'http://localhost:5000'; // Make sure this matches your backend URL
    // Retrieve the token and user ID/role (if needed for admin context)
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId'); // Assuming you store userId for admin too

    // Initialize Socket.IO connection with the token
    const socket = io(BASE_URL, {
        query: { token: token, userId: userId } // Pass token and any other relevant info
    });

    const userTableBody = document.getElementById('userTableBody');
    const depositTableBody = document.getElementById('depositTableBody');
    const withdrawalTableBody = document.getElementById('withdrawalTableBody');
    const tradeOrderTableBody = document.getElementById('tradeOrderTableBody');

    // User Edit Modal Elements
    const editBalanceModal = document.getElementById('editBalanceModal');
    const editUserIdInput = document.getElementById('editUserId');
    const editUserEmailPhone = document.getElementById('editUserEmailPhone');
    const editUserCurrentBalance = document.getElementById('editUserCurrentBalance');
    const balanceAmountInput = document.getElementById('balanceAmount');
    const balanceTypeSelect = document.getElementById('balanceType');
    const editBalanceForm = document.getElementById('editBalanceForm');
    const closeEditBalanceModalBtn = document.querySelector('#editBalanceModal .close-button');

    // Chat Elements
    const onlineUsersListContent = document.getElementById('onlineUsersListContent');
    const currentChatUserDisplay = document.getElementById('currentChatUser');
    const adminMessagesDisplay = document.getElementById('adminMessagesDisplay');
    const adminMessageInput = document.getElementById('adminMessageInput');
    const sendAdminMessageBtn = document.getElementById('sendAdminMessageBtn');

    let currentChatUserId = null; // Stores the ID of the user currently being chatted with
    const chatHistory = new Map(); // Stores chat messages for each user: Map<userId, Array<{sender: 'user'|'admin', message: string}>>
    const onlineUsers = new Map(); // Stores online users: Map<userId, userSocketId> - useful for displaying unique users

    // --- Helper to get JWT token ---
    function getToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            // Using custom message box instead of alert
            showMessage('Admin token not found. Please log in as an administrator.', 'error');
            setTimeout(() => {
                window.location.href = 'login.html'; // Redirect after a short delay
            }, 1500);
            return null;
        }
        return token;
    }

    // --- Custom Message Box (instead of alert/confirm) ---
    function showMessage(message, type = 'info') {
        const messageBox = document.createElement('div');
        messageBox.className = `message-box ${type}`;
        messageBox.textContent = message;
        document.body.appendChild(messageBox);

        // Basic styling for message box (add to your CSS if not already there)
        messageBox.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 1em;
            color: white;
            z-index: 1001;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        `;
        if (type === 'success') {
            messageBox.style.backgroundColor = '#4CAF50';
        } else if (type === 'error') {
            messageBox.style.backgroundColor = '#E53935';
        } else {
            messageBox.style.backgroundColor = '#2196F3';
        }

        setTimeout(() => {
            messageBox.style.opacity = 1;
        }, 10); // Small delay to trigger transition

        setTimeout(() => {
            messageBox.style.opacity = 0;
            messageBox.addEventListener('transitionend', () => messageBox.remove());
        }, 3000);
    }

    // Helper for confirmation dialog with optional input
    async function showConfirm(message, includeInput = false, inputPlaceholder = '') {
        return new Promise((resolve) => {
            const confirmBox = document.createElement('div');
            confirmBox.className = 'confirm-box';
            let inputHtml = '';
            if (includeInput) {
                inputHtml = `<input type="text" id="confirmInput" placeholder="${inputPlaceholder}" style="width: 90%; padding: 8px; margin-top: 10px; border: 1px solid #ddd; border-radius: 4px;">`;
            }
            confirmBox.innerHTML = `
                <p>${message}</p>
                ${inputHtml}
                <div class="confirm-buttons">
                    <button class="confirm-yes action-button">Yes</button>
                    <button class="confirm-no action-button">No</button>
                </div>
            `;
            document.body.appendChild(confirmBox);

            // Basic styling for confirm box (add to your CSS if not already there)
            confirmBox.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.3);
                z-index: 1002;
                text-align: center;
                max-width: 400px;
                font-family: 'Poppins', sans-serif;
            `;
            const confirmButtons = confirmBox.querySelector('.confirm-buttons');
            confirmButtons.style.cssText = `
                display: flex;
                justify-content: center;
                gap: 15px;
                margin-top: 20px;
            `;

            const confirmInput = includeInput ? confirmBox.querySelector('#confirmInput') : null;

            confirmBox.querySelector('.confirm-yes').onclick = () => {
                const inputValue = confirmInput ? confirmInput.value : '';
                confirmBox.remove();
                resolve({ confirmed: true, inputValue: inputValue });
            };
            confirmBox.querySelector('.confirm-no').onclick = () => {
                confirmBox.remove();
                resolve({ confirmed: false, inputValue: '' });
            };
        });
    }


    // Helper function to format date and time
    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString(); // e.g., "6/3/2025, 10:30:18 PM"
    };

    // --- Fetch and Display Functions ---

    // Generic function to fetch and display table data
    async function fetchTableData(url, tableBodyElement, noDataMessage, columns, formatRow) {
        const token = getToken();
        if (!token) return;
        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                showMessage(errorData.message || `Failed to fetch ${noDataMessage.toLowerCase()}.`, 'error');
                return;
            }

            const data = await response.json();
            tableBodyElement.innerHTML = ''; // Clear existing rows

            if (data.length === 0) {
                tableBodyElement.innerHTML = `<tr><td colspan="${columns}" class="text-center">${noDataMessage}</td></tr>`;
                return;
            }

            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = formatRow(item);
                tableBodyElement.appendChild(row);
            });

        } catch (error) {
            console.error(`Error fetching ${noDataMessage.toLowerCase()}:`, error);
            showMessage(`Error fetching ${noDataMessage.toLowerCase()}: ${error.message}`, 'error');
            tableBodyElement.innerHTML = `<tr><td colspan="${columns}" class="text-center">Error loading ${noDataMessage.toLowerCase()}.</td></tr>`;
        }
    }

    // Fetch and display users
    async function fetchUsers() {
        await fetchTableData(
            `${BASE_URL}/api/admin/users`,
            userTableBody,
            'No users found.',
            6, // Number of columns in the user table
            (user) => {
                const userDisplay = user.email || user.username || user._id;
                // Display totalPortfolioValueUSD if available, otherwise fallback to balance, then 0
                const displayBalance = typeof user.totalPortfolioValueUSD === 'number' ? user.totalPortfolioValueUSD : (typeof user.balance === 'number' ? user.balance : 0);
                return `
                    <td>${user._id}</td>
                    <td>${userDisplay}</td>
                    <td>${user.role}</td>
                    <td>$${displayBalance.toFixed(2)}</td>
                    <td>${formatDateTime(user.createdAt)}</td>
                    <td>
                        <div class="button-group">
                            <button class="action-button btn-edit-balance" data-user-id="${user._id}" data-user-email="${userDisplay}" data-user-balance="${user.balance || 0}">Edit Balance</button>
                            <button class="action-button delete-user" data-user-id="${user._id}">Delete</button>
                        </div>
                    </td>
                `;
            }
        );
    }

    // Fetch and display pending deposits
    async function fetchPendingDeposits() {
        await fetchTableData(
            `${BASE_URL}/api/admin/deposits/pending`,
            depositTableBody,
            'No pending deposit requests.',
            8, // Number of columns
            (deposit) => {
                const userDisplay = deposit.userId ? (deposit.userId.email || deposit.userId.username || deposit.userId._id) : 'N/A';
                // Fix: Ensure deposit.amount is a number before calling toFixed()
                const depositAmount = typeof deposit.amount === 'number' ? deposit.amount : 0;
                return `
                    <td>${deposit._id}</td>
                    <td>${userDisplay}</td>
                    <td>$${depositAmount.toFixed(2)}</td>
                    <td>${deposit.currency}</td>
                    <td>${deposit.transactionId}</td>
                    <td>${deposit.status}</td>
                    <td>${formatDateTime(deposit.createdAt)}</td>
                    <td>
                        <div class="button-group">
                            <button class="action-button approve-deposit" data-deposit-id="${deposit._id}">Approve</button>
                            <button class="action-button reject-deposit" data-deposit-id="${deposit._id}">Reject</button>
                        </div>
                    </td>
                `;
            }
        );
    }

    // Fetch and display pending withdrawals
    async function fetchPendingWithdrawals() {
        await fetchTableData(
            `${BASE_URL}/api/admin/withdrawals/pending`,
            withdrawalTableBody,
            'No pending withdrawal requests.',
            8, // Number of columns
            (withdrawal) => {
                const userDisplay = withdrawal.userId ? (withdrawal.userId.email || withdrawal.userId.username || withdrawal.userId._id) : 'N/A';
                // Fix: Ensure withdrawal.amount is a number before calling toFixed()
                const withdrawalAmount = typeof withdrawal.amount === 'number' ? withdrawal.amount : 0;
                return `
                    <td>${withdrawal._id}</td>
                    <td>${userDisplay}</td>
                    <td>$${withdrawalAmount.toFixed(2)}</td>
                    <td>${withdrawal.currency}</td>
                    <td>${withdrawal.address}</td>
                    <td>${withdrawal.status}</td>
                    <td>${formatDateTime(withdrawal.createdAt)}</td>
                    <td>
                        <div class="button-group">
                            <button class="action-button approve-withdrawal" data-withdrawal-id="${withdrawal._id}">Approve</button>
                            <button class="action-button reject-withdrawal" data-withdrawal-id="${withdrawal._id}">Reject</button>
                        </div>
                    </td>
                `;
            }
        );
    }

    // Fetch and display trade orders
    async function fetchPendingOrders() {
        await fetchTableData(
            `${BASE_URL}/api/admin/orders/pending`,
            tradeOrderTableBody,
            'No pending trade orders found.',
            10, // Number of columns
            (order) => {
                const userIdDisplay = order.userId ? (order.userId.email || order.userId.username || order.userId._id) : 'N/A';
                // Fix: Ensure order.amount, order.priceUSD, order.tradeValueUSD are numbers
                const orderAmount = typeof order.amount === 'number' ? order.amount : 0;
                const orderPriceUSD = typeof order.priceUSD === 'number' ? order.priceUSD : 0;
                const orderTradeValueUSD = typeof order.tradeValueUSD === 'number' ? order.tradeValueUSD : 0;

                return `
                    <td>${order._id}</td>
                    <td>${userIdDisplay}</td>
                    <td>${order.tradeType}</td>
                    <td>${order.coinId}</td>
                    <td>${orderAmount.toFixed(8)}</td>
                    <td>$${orderPriceUSD.toFixed(2)}</td>
                    <td>$${orderTradeValueUSD.toFixed(2)}</td>
                    <td>${order.status}</td>
                    <td>${formatDateTime(order.createdAt)}</td>
                    <td>
                        <div class="button-group">
                            <button class="action-button approve-order" data-order-id="${order._id}">Approve</button>
                            <button class="action-button reject-order" data-order-id="${order._id}">Reject</button>
                        </div>
                    </td>
                `;
            }
        );
    }


    // --- Event Listeners for Actions ---

    // Edit Balance Modal (Existing functionality)
    userTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit-balance')) {
            const userId = e.target.dataset.userId;
            const userEmail = e.target.dataset.userEmail;
            const userBalance = e.target.dataset.userBalance; // This will already be a number or '0' due to the fix in fetchUsers

            editUserIdInput.value = userId;
            editUserEmailPhone.textContent = userEmail;
            editUserCurrentBalance.textContent = parseFloat(userBalance).toFixed(2); // Ensure it's parsed just in case
            balanceAmountInput.value = ''; // Clear previous amount
            balanceTypeSelect.value = 'add'; // Default to add
            editBalanceModal.style.display = 'flex'; // Use flex for centering
        }
    });

    closeEditBalanceModalBtn.addEventListener('click', () => {
        editBalanceModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target == editBalanceModal) {
            editBalanceModal.style.display = 'none';
        }
    });

    editBalanceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('balanceAmount').value);
        const type = document.getElementById('balanceType').value;
        const userId = editUserIdInput.value; // Get userId from the hidden input

        if (isNaN(amount) || amount <= 0) {
            showMessage('Please enter a valid positive amount.', 'error');
            return;
        }

        try {
            const token = getToken();
            if (!token) return;

            const response = await fetch(`${BASE_URL}/api/admin/users/${userId}/balance`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ amount, type })
            });

            const data = await response.json();
            if (response.ok) {
                showMessage(data.message, 'success');
                editBalanceModal.style.display = 'none'; // Hide the modal
                fetchUsers(); // Refresh users table
            } else {
                showMessage(`Error: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Network or server error updating balance:', error);
            showMessage('A network error occurred. Please try again.', 'error');
        }
    });

    // Delete User Action
    userTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-user')) {
            const userIdToDelete = e.target.dataset.userId;
            const { confirmed } = await showConfirm('Are you sure you want to delete this user and all associated data? This action cannot be undone.');
            
            if (confirmed) {
                try {
                    const token = getToken();
                    if (!token) return;

                    const response = await fetch(`${BASE_URL}/api/admin/users/${userIdToDelete}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    const data = await response.json();
                    if (response.ok) {
                        showMessage(data.message, 'success');
                        fetchUsers(); // Refresh the user list
                        fetchPendingDeposits(); // Refresh other tables that might be affected
                        fetchPendingWithdrawals();
                        fetchPendingOrders();
                    } else {
                        showMessage(`Error deleting user: ${data.message || 'Something went wrong.'}`, 'error');
                    }
                } catch (error) {
                    console.error('Error deleting user:', error);
                    showMessage('A network error occurred. Please try again.', 'error');
                }
            }
        }
    });


    // Deposit Actions
    depositTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('approve-deposit')) {
            const depositId = e.target.dataset.depositId;
            const { confirmed } = await showConfirm('Are you sure you want to approve this deposit? This will add funds to the user\'s balance.');
            if (confirmed) {
                await sendActionRequest(`${BASE_URL}/api/admin/deposits/${depositId}/approve`, 'PUT', 'Deposit approved successfully.', 'success');
                fetchPendingDeposits(); // Refresh deposits table
                fetchUsers(); // Refresh users table as balance might change
            }
        } else if (e.target.classList.contains('reject-deposit')) {
            const depositId = e.target.dataset.depositId;
            const { confirmed, inputValue: notes } = await showConfirm('Are you sure you want to reject this deposit?', true, 'Enter rejection reason (optional)');
            if (confirmed) {
                await sendActionRequest(`${BASE_URL}/api/admin/deposits/${depositId}/reject`, 'PUT', 'Deposit rejected.', 'info', { notes });
                fetchPendingDeposits(); // Refresh deposits table
            }
        }
    });

    // Withdrawal Actions
    withdrawalTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('approve-withdrawal')) {
            const withdrawalId = e.target.dataset.withdrawalId;
            const { confirmed } = await showConfirm('Are you sure you want to approve this withdrawal?');
            if (confirmed) {
                await sendActionRequest(`${BASE_URL}/api/admin/withdrawals/${withdrawalId}/approve`, 'PUT', 'Withdrawal approved successfully.', 'success');
                fetchPendingWithdrawals(); // Refresh withdrawals table
            }
        } else if (e.target.classList.contains('reject-withdrawal')) {
            const withdrawalId = e.target.dataset.withdrawalId;
            const { confirmed, inputValue: notes } = await showConfirm('Are you sure you want to reject this withdrawal? Funds will be returned to user.', true, 'Enter rejection reason (optional)');
            if (confirmed) {
                await sendActionRequest(`${BASE_URL}/api/admin/withdrawals/${withdrawalId}/reject`, 'PUT', 'Withdrawal rejected. Funds refunded to user.', 'info', { notes });
                fetchPendingWithdrawals(); // Refresh withdrawals table
                fetchUsers(); // Refresh users table as balance might change
            }
        }
    });

    // Trade Order Actions
    tradeOrderTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('approve-order')) {
            const orderId = e.target.dataset.orderId;
            const { confirmed } = await showConfirm('Are you sure you want to approve this trade order? This will complete the trade and update user assets/balance.');
            if (confirmed) {
                await sendActionRequest(`${BASE_URL}/api/admin/orders/${orderId}/approve`, 'PUT', 'Trade order approved successfully.', 'success');
                fetchPendingOrders(); // Refresh trade orders table
                fetchUsers(); // Refresh users table as assets/balance might change
            }
        } else if (e.target.classList.contains('reject-order')) {
            const orderId = e.target.dataset.orderId;
            const { confirmed, inputValue: notes } = await showConfirm('Are you sure you want to reject this trade order? Funds/assets will be refunded.', true, 'Enter rejection reason (optional)');
            if (confirmed) {
                await sendActionRequest(`${BASE_URL}/api/admin/orders/${orderId}/reject`, 'PUT', 'Order rejected. Funds/assets refunded to user.', 'info', { notes });
                fetchPendingOrders(); // Refresh trade orders table
                fetchUsers(); // Refresh users table as balance/assets might change
            }
        }
    });


    // Generic function to send API requests for actions
    async function sendActionRequest(url, method, successMessage, messageType = 'info', bodyData = {}) {
        try {
            const token = getToken();
            if (!token) return;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(bodyData)
            });

            const data = await response.json();
            if (response.ok) {
                showMessage(successMessage || data.message, messageType);
            } else {
                showMessage(`Error: ${data.message || 'An error occurred.'}`, 'error');
            }
        } catch (error) {
            console.error('Error sending action request:', error);
            showMessage('A network error occurred. Please try again.', 'error');
        }
    }


    // --- Socket.IO Chat Logic ---
    
    socket.on('connect', () => {
        console.log('[Admin JS] Admin connected to chat server.');
        socket.emit('admin_connected'); // Notify server this is an admin
    });

    socket.on('current_online_users', (users) => {
        console.log('[Admin JS] Received initial online users:', users); // Debug log
        // Initial list of online users when admin connects
        onlineUsers.clear(); // Clear existing to prevent duplicates on re-connect
        users.forEach(userId => {
            onlineUsers.set(userId, null); // Store userId, socketId is not needed here on client
        });
        updateOnlineUsersList();
    });

    socket.on('user_online', (userId) => {
        console.log(`[Admin JS] User ${userId} came online.`);
        onlineUsers.set(userId, null);
        updateOnlineUsersList();
        showMessage(`User ${userId} is now online!`, 'info');
    });

    socket.on('user_offline', (userId) => {
        console.log(`[Admin JS] User ${userId} went offline.`);
        onlineUsers.delete(userId);
        updateOnlineUsersList();
        showMessage(`User ${userId} went offline.`, 'info');
        if (currentChatUserId === userId) {
            currentChatUserId = null;
            currentChatUserDisplay.textContent = 'No user selected';
            adminMessagesDisplay.innerHTML = '<p class="no-user-selected-message">Select a user from the left to start chatting.</p>';
            adminMessageInput.disabled = true;
            sendAdminMessageBtn.disabled = true;
            showMessage(`Chat with ${userId} ended as they went offline.`, 'info');
        }
    });

    socket.on('new_admin_message', (data) => {
        const { from: userId, message, userSocketId } = data;
        console.log(`[Admin JS] Message from user ${userId}: "${message}" (user socket: ${userSocketId})`); // Added quotes for clarity

        // Store message in chat history
        if (!chatHistory.has(userId)) {
            chatHistory.set(userId, []);
        }
        chatHistory.get(userId).push({ sender: 'user', message: message });

        // If this is the active chat, display the message
        if (currentChatUserId === userId) {
            appendMessage(message, 'message-from-user');
        } else {
            // Optionally, highlight the user in the online list or show a notification
            const userListItem = document.getElementById(`user-item-${userId}`);
            if (userListItem) {
                userListItem.classList.add('new-message-indicator'); // Add a class for visual cue
                // Consider adding a simple notification to the admin
                showMessage(`New message from ${userId}: "${message.substring(0, 50)}..."`, 'info');
            }
        }
    });

    socket.on('chat_error', (message) => {
        showMessage(`Chat Error: ${message}`, 'error');
        console.error('[Admin JS] Chat error:', message);
    });

    socket.on('disconnect', () => {
        console.log('[Admin JS] Admin disconnected from chat server.');
        // Clear online users list on disconnect
        onlineUsers.clear();
        updateOnlineUsersList();
        if (currentChatUserId) {
            currentChatUserId = null;
            currentChatUserDisplay.textContent = 'No user selected';
            adminMessagesDisplay.innerHTML = '<p class="no-user-selected-message">Disconnected. Select a user once connected.</p>';
            adminMessageInput.disabled = true;
            sendAdminMessageBtn.disabled = true;
        }
    });

    function updateOnlineUsersList() {
        onlineUsersListContent.innerHTML = '';
        if (onlineUsers.size === 0) {
            onlineUsersListContent.innerHTML = '<div class="online-user-item text-center">No users currently online.</div>';
            return;
        }
        onlineUsers.forEach((_socketId, userId) => {
            const userItem = document.createElement('div');
            userItem.classList.add('online-user-item');
            userItem.id = `user-item-${userId}`; // Add an ID for easy access
            userItem.dataset.userId = userId;
            userItem.innerHTML = `<span class="online-status-indicator"></span>${userId}`; // Display user ID
            if (userId === currentChatUserId) {
                userItem.classList.add('active');
            }
            onlineUsersListContent.appendChild(userItem);
        });
    }

    // Handle clicking on an online user to open chat
    onlineUsersListContent.addEventListener('click', (e) => {
        let target = e.target;
        // Traverse up to find the .online-user-item
        while (target && !target.classList.contains('online-user-item')) {
            target = target.parentElement;
        }

        if (target && target.dataset.userId) {
            const userId = target.dataset.userId;
            if (currentChatUserId !== userId) {
                // Remove active class from previously active user
                const prevActive = document.querySelector('.online-user-item.active');
                if (prevActive) {
                    prevActive.classList.remove('active');
                }
                // Add active class to current user
                target.classList.add('active');
                target.classList.remove('new-message-indicator'); // Clear new message indicator

                currentChatUserId = userId;
                currentChatUserDisplay.textContent = userId;
                adminMessageInput.disabled = false;
                sendAdminMessageBtn.disabled = false;
                adminMessageInput.focus();
                
                // Load chat history for the selected user
                renderChatHistory(userId);
            }
        }
    });

    function renderChatHistory(userId) {
        adminMessagesDisplay.innerHTML = ''; // Clear current messages
        const history = chatHistory.get(userId) || [];
        if (history.length === 0) {
            adminMessagesDisplay.innerHTML = '<p class="no-user-selected-message">No messages yet with this user.</p>';
        } else {
            history.forEach(msg => {
                const messageClass = msg.sender === 'user' ? 'message-from-user' : 'message-from-admin';
                appendMessage(msg.message, messageClass);
            });
        }
        scrollToBottom(adminMessagesDisplay);
    }

    function appendMessage(message, messageClass) {
        const messageElement = document.createElement('p');
        messageElement.classList.add(messageClass);
        messageElement.textContent = message;
        adminMessagesDisplay.appendChild(messageElement);
        scrollToBottom(adminMessagesDisplay);
    }

    function scrollToBottom(element) {
        element.scrollTop = element.scrollHeight;
    }

    // Send message from admin
    sendAdminMessageBtn.addEventListener('click', () => {
        sendMessage();
    });

    adminMessageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const message = adminMessageInput.value.trim();
        if (message && currentChatUserId) {
            socket.emit('admin_chat_message', { message: message, toUserId: currentChatUserId });
            
            // Add message to local history and display
            if (!chatHistory.has(currentChatUserId)) {
                chatHistory.set(currentChatUserId, []);
            }
            chatHistory.get(currentChatUserId).push({ sender: 'admin', message: message });
            appendMessage(message, 'message-from-admin');
            adminMessageInput.value = ''; // Clear input
        }
    }


    // --- Initial fetches on page load ---
    await fetchUsers();
    await fetchPendingDeposits(); // Fetch pending deposits
    await fetchPendingWithdrawals(); // Fetch pending withdrawals
    await fetchPendingOrders(); // Fetch pending trade orders
});
