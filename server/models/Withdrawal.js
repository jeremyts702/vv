// server/models/Withdrawal.js
const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // IMPORTANT: Reference the User model
        required: true
    },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true },
    address: { type: String, required: true }, // Crypto address or bank details
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Completed'], // 'Completed' added here
        default: 'Pending'
    },
}, {
    timestamps: true // This automatically adds createdAt and updatedAt fields
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema);