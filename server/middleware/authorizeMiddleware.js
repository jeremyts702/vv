// server/middleware/authorizeMiddleware.js
// The User model is no longer directly required for fetching the role,
// as the role is expected to be present in req.user from authMiddleware.
// const User = require('../models/User'); // Uncomment if you specifically need to fetch the latest role from DB

/**
 * Middleware to authorize access based on user roles.
 * This middleware should be used AFTER authMiddleware, as it relies on req.user being populated.
 *
 * @param {string|Array<string>} roles - A single role string (e.g., 'admin') or an array of roles (e.g., ['admin', 'moderator']).
 * If an empty array is provided, any authenticated user is allowed.
 * @returns {Function} Express middleware function.
 */
module.exports = (roles = []) => {
    // Ensure roles is always an array for consistent processing
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => { // This can now be synchronous as no DB call is made
        // Check if req.user (populated by authMiddleware) contains necessary information
        if (!req.user || !req.user.id || !req.user.role) {
            // If authentication middleware failed to populate req.user, or missing role
            return res.status(401).json({ message: 'Authentication required: User information missing from token.' });
        }

        // If no specific roles are provided to the middleware, allow access for any authenticated user.
        // This means it acts as a simple "is authenticated" check (redundant if authMiddleware is always used first, but safe).
        if (roles.length === 0) {
            return next();
        }

        // Check if the user's role (from the token, attached by authMiddleware) is in the allowed roles list.
        // We directly use req.user.role, assuming it's up-to-date from the JWT.
        if (!roles.includes(req.user.role)) {
            // If the user's role is not authorized for this route
            return res.status(403).json({ message: 'Access denied: Insufficient permissions.' });
        }

        // User is authorized, proceed to the next middleware/route handler
        next();
    };
};
