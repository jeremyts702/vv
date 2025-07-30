const mongoose = require('mongoose');

const DepositSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    currency: {
        type: String,
        required: true,
        default: 'USD',
    },
    transactionId: { // Hash from blockchain or bank reference
        type: String,
        required: true,
        unique: true, // Assuming transaction IDs should be unique
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    },
}, { timestamps: true }); // timestamps: true correctly handles createdAt and updatedAt
module.exports = mongoose.model('Deposit', DepositSchema);