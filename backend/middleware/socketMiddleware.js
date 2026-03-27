const jwt = require("jsonwebtoken");

const socketMiddleware = (socket, next) => {
  // 1. Extract the token
  const token = socket.handshake.auth?.token || 
                socket.handshake.headers['authorization']?.split(' ')[1];

  // 2. LOGIC FIX: If there is NO token, throw the error
  if (!token) {
    console.error("❌ Socket connection failed: Token missing");
    return next(new Error('authentication token missing'));
  }

  try {
    // 3. Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach to socket (Not 'req')
    socket.user = decoded; 
    
    // console.log("Socket authenticated for user:", socket.user.userId);
    next();

  } catch (error) {
    console.error("JWT Socket Error:", error.message); 
    return next(new Error(`Invalid token: ${error.message}`));
  }
};

module.exports = socketMiddleware;