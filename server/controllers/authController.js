// server/controllers/authController.js
const User = require('../models/User'); // Import the Mongoose User model
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For generating JSON Web Tokens

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  const { email, phoneNumber, password } = req.body; // Destructure both email and phoneNumber

  // Basic validation: ensure either email OR phoneNumber is provided, along with password
  if ((!email && !phoneNumber) || !password) {
    return res.status(400).json({ message: 'Please enter a valid email or phone number, and a password.' });
  }

  try {
    // Check if user already exists by email or phone number
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (phoneNumber) {
      user = await User.findOne({ phoneNumber });
    }

    if (user) {
      const field = email ? 'email' : 'phone number';
      return res.status(400).json({ message: `User already exists with this ${field}.` });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user in MongoDB using the Mongoose User model
    user = await User.create({
      email: email || undefined, // Store email if provided, otherwise undefined
      phoneNumber: phoneNumber || undefined, // Store phoneNumber if provided, otherwise undefined
      password: hashedPassword,
      balance: 0.00, // Starting balance, adjust as needed
      role: 'user', // Default role for new users
      status: 'active',
      assets: new Map() // Initialize assets as an empty Map
    });

    // Generate JWT token upon successful registration
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email, phoneNumber: user.phoneNumber },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        balance: user.balance,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error during user registration:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  const { email, phoneNumber, password } = req.body; // Destructure all possible identifiers

  // Basic validation: ensure either email OR phoneNumber is provided, along with password
  if ((!email && !phoneNumber) || !password) {
    return res.status(400).json({ message: 'Please enter a valid email or phone number, and a password.' });
  }

  try {
    let user;
    // Check for user by email or phone number
    if (email) {
      user = await User.findOne({ email });
    } else if (phoneNumber) {
      user = await User.findOne({ phoneNumber });
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials (user not found).' });
    }

    // Compare provided password with hashed password in DB
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials (password incorrect).' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email, phoneNumber: user.phoneNumber },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token expires in 1 hour
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        balance: user.balance,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error during user login:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private (requires token)
exports.getProfile = async (req, res) => {
  try {
    // req.user is set by the protect middleware
    const user = await User.findById(req.user.id).select('-password'); // Exclude password
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
};