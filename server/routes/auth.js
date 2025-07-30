// server/routes/auth.js
const express = require("express");
const router = express.Router();
const { registerUser, loginUser } = require("../controllers/authController"); // Correctly import both functions

// Route for user registration
router.post("/register", registerUser);

// Route for user login
router.post("/login", loginUser);

module.exports = router;