const jwt = require("jsonwebtoken");
const response = require("../utils/responseHandler.js");

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  console.log("Response function check:", typeof response);
  // 1. Check if header exists and starts with Bearer
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return response(res, 401, 'Authorization token missing. Please login again');
  }

  // 2. Extract token
  const token = authHeader.split(' ')[1];

  if (!token) {
    return response(res, 401, 'Token format is invalid');
  }

  try {
    // 3. Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Attach to request
    // IMPORTANT: Ensure your login logic uses { userId: user._id } when signing
    req.user = decoded; 
    
    next();
  } catch (error) {
    console.error("JWT Error:", error.message);
    
    // Handle specific JWT errors for better UX
    if (error.name === 'TokenExpiredError') {
      return response(res, 401, 'Token expired. Please login again');
    }
    
    return response(res, 401, 'Invalid token. Authorization denied');
  }
};

module.exports = authMiddleware;