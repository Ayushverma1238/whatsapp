const jwt = require("jsonwebtoken");
const response = require("../utils/responseHandler");

const authMiddleware = (req, res, next) => {
  try {

    const authHeader = req.headers['authorization']
    if(!authHeader || !authHeader.startsWith("Bearer")){
      return response(res, 401, "Unauthorized access. authorized token missing"); 
    }

    const token = authHeader.split(' ')[1];

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

module.exports = authMiddleware;