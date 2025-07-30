// server/server.js

require('dotenv').config(); // Load environment variables from .env file

const http = require("http");

const express = require("express");

const cors = require("cors");

const socketIO = require("socket.io");

const connectDB = require('./config/db'); // Assuming you have a db.js for connection

const path = require('path');

const fs = require('fs');

const jwt = require('jsonwebtoken'); // Import JWT for Socket.IO authentication



// --- NEW IMPORTS ---

const bcrypt = require('bcryptjs'); // For password hashing and comparison

const User = require('./models/User'); // Import your Mongoose User model

// --- END NEW IMPORTS ---



// Connect Database

connectDB();



const app = express();

const server = http.createServer(app);

const io = socketIO(server, {

    cors: {

        origin: "*", // Or specify your frontend origin, e.g., 'http://localhost:8000'

        credentials: true

    }

});



app.use(cors({

    origin: "*", // Adjust this to your specific frontend origin(s) in production

    credentials: true

}));

app.use(express.json()); // Middleware to parse JSON request bodies

app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

app.use((req, res, next) => {

    res.set('Cache-Control', 'no-store'); // Or 'no-cache' if you want ETag revalidation

    next();

});



// Serve static files from the 'client' directory (assuming your frontend is here)

app.use(express.static(path.join(__dirname, '..', 'client'))); // Adjusted from 'public' if your frontend is now in 'client'





// Serve static files from the 'uploads' directory



// Import controllers and middleware

const authMiddleware = require('./middleware/authMiddleware');

const authorizeMiddleware = require('./middleware/authorizeMiddleware');

const walletController = require('./controllers/walletController');

const walletRoutes = require('./routes/wallet');

const adminController = require('./controllers/adminController'); // Import admin controller



// Routes

// Basic auth routes

app.use("/api/auth", require("./routes/auth"));

app.use("/api/market", require("./routes/market")); // Assumed public access for market data



// Wallet Routes

// Deposit recharge route: protected by authMiddleware. If it involves a file upload, multer needs to be added here.

// Based on previous context, a file upload was expected for 'recharge'. If frontend sends JSON for proof, this is okay.

// If actual file upload is needed, uncomment and use `upload.single('proofImage')` as shown in previous examples.

app.post("/api/wallet/recharge", authMiddleware, walletController.rechargeWallet);



// Other wallet routes (e.g., getWalletInfo, withdrawWallet) are handled by walletRoutes

app.use("/api/wallet", authMiddleware, walletRoutes);

app.get("/api/wallet/deposits/history", authMiddleware, walletController.getDepositHistory);

app.get("/api/wallet/withdrawals/history", authMiddleware, walletController.getWithdrawalHistory);



// Trade routes (ensure authMiddleware is applied either here or within trade/index.js)

app.use("/api/trade", authMiddleware, require("./routes/trade")); // Applied authMiddleware here for consistency



// Admin routes: protected by authMiddleware AND authorizeMiddleware for 'admin' role

app.use('/api/admin', authMiddleware, authorizeMiddleware('admin'), require('./routes/admin'));





// --- Change Password API Endpoint ---

app.post('/api/user/change-password', authMiddleware, async (req, res) => {

    const { currentPassword, newPassword } = req.body;

    const userId = req.user.id; // User ID is available from authMiddleware



    if (!currentPassword || !newPassword) {

        return res.status(400).json({ message: 'Current password and new password are required.' });

    }



    try {

        const user = await User.findById(userId);



        if (!user) {

            return res.status(404).json({ message: 'User not found.' });

        }



        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

        if (!isPasswordValid) {

            return res.status(400).json({ message: 'Incorrect current password.' });

        }



        if (newPassword.length < 6) {

            return res.status(400).json({ message: 'New password must be at least 6 characters long.' });

        }

        if (currentPassword === newPassword) {

            return res.status(400).json({ message: 'New password cannot be the same as the current password.' });

        }



        const salt = await bcrypt.genSalt(10);

        const hashedNewPassword = await bcrypt.hash(newPassword, salt);



        user.password = hashedNewPassword;

        await user.save();



        res.status(200).json({ message: 'Password changed successfully!' });



    } catch (error) {

        console.error('Error changing password:', error);

        res.status(500).json({ message: 'Server error. Could not change password.' });

    }

});

// --- END Change Password API Endpoint ---





// --- LIVE CHAT SOCKET.IO LOGIC (Enhanced with Authentication) ---

const activeUsers = new Map(); // Maps userId to socket.id

const activeAdmins = new Set(); // Set of admin socket.ids



// Socket.IO Middleware for Authentication

io.use(async (socket, next) => {

    // Get the token from the handshake query or headers (e.g., localStorage on frontend)

    const token = socket.handshake.auth.token || socket.handshake.query.token;



    if (!token) {

        console.log(`Socket ${socket.id} connection denied: No token provided.`);

        return next(new Error('Authentication error: No token provided.'));

    }



    try {

       

        // Verify the JWT token

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to the socket object

        socket.user = { id: decoded.id, role: decoded.role };

        console.log(`Socket ${socket.id} authenticated as user ${socket.user.id} (${socket.user.role}).`);

        next();

    } catch (err) {

        console.error(`Socket ${socket.id} authentication failed:`, err.message);

        next(new Error('Authentication error: Invalid token.'));

    }

});



io.on('connection', (socket) => {

    console.log(`Authenticated Socket connected: ${socket.id} for user ${socket.user.id} (${socket.user.role})`);



    const userId = socket.user.id;

    const userRole = socket.user.role;



    // Register user or admin based on their authenticated role

    if (userRole === 'admin') {

        activeAdmins.add(socket.id);

        console.log(`Admin (socket: ${socket.id}) is online. Total admins: ${activeAdmins.size}.`);

        // Send list of currently online users to the newly connected admin

        const currentOnlineUsers = Array.from(activeUsers.keys());

        socket.emit('current_online_users', currentOnlineUsers);

    } else { // Assume 'user' role for non-admins

        if (activeUsers.has(userId) && activeUsers.get(userId) !== socket.id) {

            console.log(`User ${userId} reconnected. Disconnecting old socket ${activeUsers.get(userId)}`);

            // Optional: Disconnect the old socket if only one connection per user is allowed

            // io.to(activeUsers.get(userId)).disconnect();

        }

        activeUsers.set(userId, socket.id);

        console.log(`User ${userId} (socket: ${socket.id}) is online.`);

        // Notify admins that a user is online

        activeAdmins.forEach(adminSocketId => {

            io.to(adminSocketId).emit('user_online', userId);

        });

    }



    // Handle chat messages from users to admins

    socket.on('user_chat_message', ({ message }) => {

        // The sender's identity (userId) is now securely taken from the authenticated socket object

        if (socket.user.role !== 'user') { // Only 'user' role can send 'user_chat_message'

            console.warn(`Unauthorized message from non-user role ${socket.user.role} (socket ${socket.id}).`);

            socket.emit('chat_error', 'Unauthorized: You are not a regular user.');

return;

        }



        console.log(`Message from user ${socket.user.id}: "${message}"`);

       

        if (activeAdmins.size > 0) {

            activeAdmins.forEach(adminSocketId => {

                io.to(adminSocketId).emit('new_admin_message', { from: socket.user.id, message: message, userSocketId: socket.id });

            });

            console.log(`Message from user ${socket.user.id} relayed to ${activeAdmins.size} admin(s).`);

        } else {

            socket.emit('chat_error', 'No administrators are currently online. Please try again later.');

            console.log(`User ${socket.user.id} message "${message}" not delivered, no admins online.`);

        }

    });



    // Handle chat messages from admins to users

    socket.on('admin_chat_message', ({ message, toUserId }) => {

        // The sender's identity (admin) is now securely taken from the authenticated socket object

        if (socket.user.role !== 'admin') { // Only 'admin' role can send 'admin_chat_message'

            console.warn(`Unauthorized message from non-admin role ${socket.user.role} (socket ${socket.id}).`);

            socket.emit('chat_error', 'Unauthorized: You are not an admin.');

            return;

        }



        console.log(`Message from admin (socket: ${socket.id}) to user ${toUserId}: "${message}"`);

        const userSocketId = activeUsers.get(toUserId);



        if (userSocketId) {

            io.to(userSocketId).emit('new_user_message', { from: 'Admin', message: message });

            console.log(`Admin message relayed to user ${toUserId} (socket: ${userSocketId}).`);

        } else {

            socket.emit('chat_error', `User ${toUserId} is currently offline or not found.`);

            console.log(`Admin message to user ${toUserId} not delivered: user offline.`);

        }

    });



    socket.on('disconnect', () => {

        console.log(`Socket disconnected: ${socket.id}`);



        // Remove from active users/admins based on their role

        if (socket.user && socket.user.role === 'admin') {

            activeAdmins.delete(socket.id);

            console.log(`Admin (socket: ${socket.id}) went offline. Remaining admins: ${activeAdmins.size}.`);

        } else if (socket.user && socket.user.id) {

            activeUsers.delete(socket.user.id); // Delete by userId, not socketId, from map

            console.log(`User ${socket.user.id} went offline.`);

            activeAdmins.forEach(adminSocketId => {

                io.to(adminSocketId).emit('user_offline', socket.user.id);

            });

        }

    });

});

// --- END LIVE CHAT SOCKET.IO LOGIC ---





const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));