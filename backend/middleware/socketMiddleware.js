const jwt = require("jsonwebtoken");

const socketMiddleware = (socket, next) => {
 
  const token = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.split(' ')[1];
  if(token){
    return next(new Error('authentication token missing'))
  }
  try {
   
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    socket.user = decoded;
    console.log(req.user)
    next();

  } catch (error) {
    console.error("JWT Error:", error.message); 
    return next(new Error(`Invalid token: ${error.message}`));
  }
};

module.exports = socketMiddleware;