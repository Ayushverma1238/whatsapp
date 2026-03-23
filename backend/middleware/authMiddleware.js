const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith("Bearer ")) { // Added space check
      return response(res, 401, "Unauthorized access. Token missing."); 
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // FIX: Check for 'id', '_id', or 'userId' to be safe
    const actualId = decoded.id || decoded._id || decoded.userId;

    if (!actualId) {
      return response(res, 401, "Invalid token payload: User ID not found.");
    }

    req.user = {
      userId: actualId,
    };

    next();
  } catch (error) {
    // TEACHING TIP: Log the specific error to Render logs
    console.error("JWT Error:", error.message); 
    return response(res, 401, `Invalid token: ${error.message}`);
  }
};