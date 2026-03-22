const jwt = require("jsonwebtoken");
const response = require("../utils/responseHandler");

const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies.auth_token;

    if (!token) {
      return response(res, 401, "Unauthorized access");
    }

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