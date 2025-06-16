// server/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
// User model is not directly used here as the user info (id, role) is taken from the decoded JWT.
// This middleware primarily focuses on validating the token itself.

module.exports = async function(req, res, next) {
    // Get token from header
    const authHeader = req.header('Authorization');

    // Check if Authorization header exists and is in "Bearer <token>" format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // Return 401 if no token or invalid format
        return res.status(401).json({ message: 'No token, authorization denied or invalid format.' });
    }

    // Extract the token part from the "Bearer <token>" string
    const token = authHeader.split(' ')[1];

    // Verify token
    try {
        // Verify the token using your JWT_SECRET from .env file
        // IMPORTANT: Ensure process.env.JWT_SECRET is correctly set in your environment
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Attach user ID and role directly from the decoded token to the request object.
        // This makes user information readily available to subsequent middleware and route handlers.
        req.user = { id: decoded.id, role: decoded.role };
        
        // Proceed to the next middleware or route handler
        next();

    } catch (err) {
        // Log the specific error for debugging purposes
        console.error('Auth middleware error:', err.message); 
        // Return 401 if the token is not valid (e.g., expired, malformed, or incorrect signature)
        res.status(401).json({ message: 'Token is not valid.' });
    }
};
