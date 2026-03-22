const jwt = require("jsonwebtoken");
const response = require("../utils/responseHandler");

const socketMiddleware = (socket, next) => {
    
    const authHeader = req.headers['authorization']
    

    const token = socket.handShake.auth?.token || socket.handshake.headers['authorization']?.split(' ')[1];

    if(!token){
      return next(new Error("Unauthorized access. authorized token missing"))
    }
  try {
    // const token = req.cookies.auth_token;

    // if (!token) {
    //   return response(res, 401, "Unauthorized access");
    // }


    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: decoded.id,
    };

    next();

  } catch (error) {
    console.log(error);
    return response(res, 401, "Invalid token");
  }
};

module.exports = socketMiddleware;