// server/models/User.js - CORRECTED VERSION (Ensuring User model is defined)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Only used for password hashing/comparison methods here

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true, // Email should still be unique if provided
    sparse: true, // Allows null values but enforces uniqueness for non-null values
    lowercase: true,
    trim: true,
    match: [/.+@.+\..+/, 'Please enter a valid email address'] // Basic email regex
  },
  phoneNumber: {
    type: String,
    unique: true, // Phone number should also be unique if provided
    sparse: true, // Allows null values but enforces uniqueness for non-null values
    trim: true,
    // You can add more specific phone number validation if needed
  },
  password: {
    type: String,
    required: true, // Password is always required
  },
  balance: {
    type: Number,
    default: 0.00, // Starting balance
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'pending'],
    default: 'active',
  },
  assets: {
    type: Map,
    of: Number, // Stores asset ticker (string) to amount (number)
    default: {},
  },
  depositedCryptoAssets: {
    type: Map,
    of: Number, // Stores asset ticker (string) to amount (number)
    default: {},
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt timestamps
});

// Custom schema-level validation to ensure EITHER email or phoneNumber is provided
userSchema.path('email').validate(function(email) {
    // If email is provided, it's valid
    if (email) return true;
    // If email is NOT provided, check if phoneNumber IS provided
    return !!this.phoneNumber; // Return true if phoneNumber exists, false otherwise
}, 'Either email or phone number is required.');

userSchema.path('phoneNumber').validate(function(phoneNumber) {
    // If phoneNumber is provided, it's valid
    if (phoneNumber) return true;
    // If phoneNumber is NOT provided, check if email IS provided
    return !!this.email; // Return true if email exists, false otherwise
}, 'Either email or phone number is required.');


const User = mongoose.model('User', userSchema);

module.exports = User;