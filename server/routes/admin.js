// server/routes/admin.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');


const auth = require('../middleware/authMiddleware');
const authorize = require('../middleware/authorizeMiddleware');

// Middleware to protect admin routes
// authorize(['admin']) ensures only users with 'admin' role can access these routes
router.use(auth); // First, ensure user is authenticated
router.use(authorize(['admin'])); // Then, check if the authenticated user has the 'admin' role

// Admin Dashboard Data
router.get('/users', adminController.getUsers);
router.get('/withdrawals', adminController.getWithdrawals); // Existing route for all withdrawals
router.get('/deposits', adminController.getDeposits); // Existing route for all deposits

// NEW: Routes for pending deposits and withdrawals (used by frontend admin.js)
router.get('/withdrawals/pending', adminController.getPendingWithdrawals);
router.get('/deposits/pending', adminController.getPendingDeposits);

router.get('/orders/pending', adminController.getPendingOrders);

// Admin Actions (Users, Withdrawals, Deposits are already there)
router.put('/users/:id/balance', adminController.updateUserBalance); // For updating user balance
router.delete('/users/:id', adminController.deleteUser); // Route to delete a user
router.put('/withdrawals/:id/approve', adminController.approveWithdrawal);
router.put('/withdrawals/:id/reject', adminController.rejectWithdrawal); // This line is correct

router.put('/deposits/:id/approve', adminController.approveDeposit);

// --- CRITICAL FIX / DEBUGGING FOR THE 'deposits/reject' ROUTE ---
// Explicitly get the function reference and check its type before using it in the route.
// This helps isolate if the issue is with the variable itself changing, or something else.
const rejectDepositHandler = adminController.rejectDeposit;

console.log('Type of rejectDepositHandler (destructured variable):', typeof rejectDepositHandler); // New log for the destructured variable

// Conditional assignment: Only add the route if the handler is actually a function
if (typeof rejectDepositHandler === 'function') {
    router.put('/deposits/:id/reject', rejectDepositHandler); // Use the destructured variable
} else {
    // If it's not a function at this point, log a clear error to the console.
    // This will help confirm if the problem persists even with explicit handling.
    console.error('CRITICAL ERROR: adminController.rejectDeposit is NOT a function. Skipping route assignment for /deposits/:id/reject.');
    // You might also consider throwing an error here if this route is essential for your application
    // throw new Error('Failed to load adminController.rejectDeposit handler.');
}

// Admin Actions for Trade Orders
router.put('/orders/:id/approve', adminController.approveOrder);
router.put('/orders/:id/reject', adminController.rejectOrder);

module.exports = router;
