const jwt = require("jsonwebtoken");

const socketMiddleware = (socket, next) => {
  try {
    // 1. Extract token from either handshake auth or headers
    const token = 
      socket.handshake.auth?.token || 
      socket.handshake.headers['authorization']?.split(' ')[1];

    if (!token) {
      // Socket.io middleware expects an Error object in next()
      return next(new Error("Unauthorized access. Token missing."));
    }

    // 2. Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach user to the SOCKET object (Not 'req')
    // This allows you to access socket.user.userId in your controllers
    socket.user = {
      userId: decoded.id || decoded.userId, 
    };

    // 4. Success - proceed to connection
    next();

  } catch (error) {
    console.error("Socket Auth Error:", error.message);
    return next(new Error("Invalid token. Authentication failed."));
  }
};

module.exports = socketMiddleware;