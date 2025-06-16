// server/controllers/adminController.js
const User = require('../models/User');
const Withdrawal = require('../models/Withdrawal');
const Deposit = require('../models/Deposit');
const Order = require('../models/Order');

// --- Functions from getUsers to rejectWithdrawal remain the same ---

// Get all users (for admin dashboard)
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error fetching users.' });
    }
};

// Admin action to update user balance
exports.updateUserBalance = async (req, res) => {
    const { id } = req.params;
    const { amount, type } = req.body;

    if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: 'Invalid amount provided. Must be a positive number.' });
    }
    if (type !== 'add' && type !== 'subtract') {
        return res.status(400).json({ message: 'Invalid operation type. Must be "add" or "subtract".' });
    }

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (type === 'add') {
            user.balance += amount;
        } else if (type === 'subtract') {
            if (user.balance < amount) {
                return res.status(400).json({ message: 'Insufficient balance to subtract this amount.' });
            }
            user.balance -= amount;
        }
        await user.save();
        res.status(200).json({ message: 'User balance updated successfully.', user });
    } catch (error) {
        console.error('Error updating user balance:', error);
        res.status(500).json({ message: 'Server error updating user balance.' });
    }
};

// NEW: Route to delete a user
exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const userToDelete = await User.findById(id);
        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found.' });
        }

        await Withdrawal.deleteMany({ userId: id });
        await Deposit.deleteMany({ userId: id });
        await Order.deleteMany({ userId: id });

        await User.findByIdAndDelete(id);
        res.status(200).json({ message: 'User and associated data deleted successfully.' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error deleting user.' });
    }
};

// Get all withdrawals
exports.getWithdrawals = async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find().populate('userId', 'email username');
        res.status(200).json(withdrawals);
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        res.status(500).json({ message: 'Server error fetching withdrawals.' });
    }
};

// Get all deposits
exports.getDeposits = async (req, res) => {
    try {
        const deposits = await Deposit.find().populate('userId', 'email username');
        res.status(200).json(deposits);
    } catch (error) {
        console.error('Error fetching deposits:', error);
        res.status(500).json({ message: 'Server error fetching deposits.' });
    }
};

// Get only PENDING deposits
exports.getPendingDeposits = async (req, res) => {
    try {
        const pendingDeposits = await Deposit.find({ status: 'Pending' }).populate('userId', 'email username _id');
        res.status(200).json(pendingDeposits);
    } catch (error) {
        console.error('Error fetching pending deposits:', error);
        res.status(500).json({ message: 'Server error fetching pending deposits.' });
    }
};

// Get only PENDING withdrawals
exports.getPendingWithdrawals = async (req, res) => {
    try {
        const pendingWithdrawals = await Withdrawal.find({ status: 'Pending' }).populate('userId', 'email username _id');
        res.status(200).json(pendingWithdrawals);
    } catch (error) {
        console.error('Error fetching pending withdrawals:', error);
        res.status(500).json({ message: 'Server error fetching pending withdrawals.' });
    }
};

// Approve a withdrawal request
exports.approveWithdrawal = async (req, res) => {
    const { id } = req.params;
    try {
        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) {
            return res.status(404).json({ message: 'Withdrawal request not found.' });
        }
        if (withdrawal.status !== 'Pending') {
            return res.status(400).json({ message: `Withdrawal is already ${withdrawal.status}.` });
        }

        withdrawal.status = 'Approved';
        await withdrawal.save();
        res.status(200).json({ message: 'Withdrawal approved successfully.', withdrawal });
    } catch (error) {
        console.error('Error approving withdrawal:', error);
        res.status(500).json({ message: 'Server error approving withdrawal.' });
    }
};

// Reject a withdrawal request
exports.rejectWithdrawal = async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    try {
        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) {
            return res.status(404).json({ message: 'Withdrawal request not found.' });
        }
        if (withdrawal.status !== 'Pending') {
            return res.status(400).json({ message: `Withdrawal is already ${withdrawal.status}.` });
        }

        withdrawal.status = 'Rejected';
        if (notes) withdrawal.notes = notes;
        await withdrawal.save();

        const user = await User.findById(withdrawal.userId);
        if (user) {
            user.balance += withdrawal.amount;
            await user.save();
        } else {
            console.warn(`User with ID ${withdrawal.userId} not found for withdrawal ${withdrawal._id}. Funds not refunded automatically.`);
        }

        res.status(200).json({ message: 'Withdrawal rejected. Funds refunded to user balance.', withdrawal });
    } catch (error) {
        console.error('Error rejecting withdrawal:', error);
        res.status(500).json({ message: 'Server error rejecting withdrawal request.' });
    }
};


// ++ MODIFIED: Approve a deposit request ++
exports.approveDeposit = async (req, res) => {
    const { id } = req.params;
    try {
        const deposit = await Deposit.findById(id);
        if (!deposit) {
            return res.status(404).json({ message: 'Deposit request not found.' });
        }
        if (deposit.status !== 'Pending') {
            return res.status(400).json({ message: `Deposit is already ${deposit.status}.` });
        }

        const user = await User.findById(deposit.userId);
        if (!user) {
            console.warn(`User with ID ${deposit.userId} not found for deposit ${deposit._id}. Balance not updated.`);
            return res.status(404).json({ message: 'User not found for this deposit.' });
        }

        user.assets = user.assets || new Map();
        const amount = deposit.amount;

        // ++ MODIFIED: Standardize asset key to UPPERCASE for consistency ++
        const assetKey = deposit.currency.toUpperCase();

        // Update user's assets using the consistent uppercase key
        const currentAmount = user.assets.get(assetKey) || 0;
        user.assets.set(assetKey, currentAmount + amount);
        console.log(`Deposit approved: Added ${amount} to ${assetKey} asset for user ${user._id}.`);
        
        // If USDT is deposited, some systems prefer to also update the main USD balance.
        // This part can be kept or removed based on your application's logic.
        // For consistency, we will only update the asset map here.
        // If you need to treat USDT as main balance, you would add:
        // if (assetKey.startsWith('USDT')) {
        //     user.balance = (user.balance || 0) + amount;
        // }

        deposit.status = 'Approved';
        await user.save();
        await deposit.save();

        res.status(200).json({ message: 'Deposit approved successfully. User assets updated.', deposit });
    } catch (error) {
        console.error('Error approving deposit:', error);
        res.status(500).json({ message: 'Server error approving deposit.' });
    }
};

// Reject a deposit request
exports.rejectDeposit = async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    try {
        const deposit = await Deposit.findById(id);
        if (!deposit) {
            return res.status(404).json({ message: 'Deposit request not found.' });
        }
        if (deposit.status !== 'Pending') {
            return res.status(400).json({ message: `Deposit is already ${deposit.status}.` });
        }

        deposit.status = 'Rejected';
        if (notes) deposit.notes = notes;
        await deposit.save();

        res.status(200).json({ message: 'Deposit rejected.', deposit });
    } catch (error) {
        console.error('Error rejecting deposit:', error);
        res.status(500).json({ message: 'Server error rejecting deposit request.' });
    }
};


// --- Functions from getPendingOrders to the end of the file remain the same ---

exports.getPendingOrders = async (req, res) => {
    try {
        const orders = await Order.find({ status: 'Pending' }).populate('userId', 'email username _id');
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching pending orders:', error);
        res.status(500).json({ message: 'Server error fetching pending orders.' });
    }
};

exports.approveOrder = async (req, res) => {
    const { id } = req.params;
    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Trade order not found.' });
        }
        if (order.status !== 'Pending') {
            return res.status(400).json({ message: `Order is already ${order.status}.` });
        }

        const user = await User.findById(order.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found for this order.' });
        }

        let message = 'Trade order approved successfully.';

        if (order.tradeType === 'buy') {
            if (user.balance < order.tradeValueUSD) {
                order.status = 'Failed';
                await order.save();
                return res.status(400).json({ message: 'User has insufficient USD balance to complete this buy order. Order set to Failed.' });
            }
            user.balance -= order.tradeValueUSD;
            const currentCoinAmount = user.assets.get(order.coinId) || 0;
            user.assets.set(order.coinId, currentCoinAmount + order.amount);
            message = 'Buy order approved. USD deducted, crypto added.';
        } else if (order.tradeType === 'sell') {
            const currentCoinAmount = user.assets.get(order.coinId) || 0;
            if (currentCoinAmount < order.amount) {
                order.status = 'Failed';
                await order.save();
                return res.status(400).json({ message: 'User has insufficient cryptocurrency to complete this sell order. Order set to Failed.' });
            }
            user.assets.set(order.coinId, currentCoinAmount - order.amount);
            user.balance += order.tradeValueUSD;
            message = 'Sell order approved. Crypto deducted, USD added.';
        }

        await user.save();
        order.status = 'Completed';
        await order.save();

        res.status(200).json({ message, order });
    } catch (error) {
        console.error('Error approving order:', error);
        res.status(500).json({ message: 'Server error approving order request.' });
    }
};

exports.rejectOrder = async (req, res) => {
    const { id } = req.params;
    const { notes } = req.body;
    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Trade order not found.' });
        }
        if (order.status !== 'Pending') {
            return res.status(400).json({ message: `Order is already ${order.status}.` });
        }

        let message = 'Trade order rejected.';

        const user = await User.findById(order.userId);
        if (!user) {
            console.warn(`User with ID ${order.userId} not found for order ${order._id}. Cannot refund assets/balance.`);
            return res.status(404).json({ message: 'User not found for this order. Order rejected, but refund may require manual intervention.' });
        }

        if (order.tradeType === 'buy') {
            user.balance += order.tradeValueUSD;
            await user.save();
            message = 'Buy order rejected. USD refunded to user.';
        } else if (order.tradeType === 'sell') {
            const currentCoinAmount = user.assets.get(order.coinId) || 0;
            user.assets.set(order.coinId, currentCoinAmount + order.amount);
            await user.save();
            message = 'Sell order rejected. Cryptocurrency refunded to user.';
        }

        order.status = 'Rejected';
        if (notes) order.notes = notes;
        await order.save();

        res.status(200).json({ message, order });
    } catch (error) {
        console.error('Error rejecting order:', error);
        res.status(500).json({ message: 'Server error rejecting order request.' });
    }
};