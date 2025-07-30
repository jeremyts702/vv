// server/models/Order.js
const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coinId: {
        type: String, // e.g., 'bitcoin', 'ethereum'
        required: true
    },
    amount: {
        type: Number, // Amount of cryptocurrency being traded
        required: true,
        min: 0.00000001 // Smallest possible amount
    },
    priceAtTrade: {
        type: Number, // Price of the coin in USD at the time of trade
        required: true
    },
    tradeType: {
        type: String, // 'buy' or 'sell'
        enum: ['buy', 'sell', 'instant_swap'],
        required: true
    },
    tradeValueUSD: {
        type: Number, // Total value of the trade in USD (amount * priceAtTrade)
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Rejected'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update `updatedAt` on every save
OrderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Order', OrderSchema);