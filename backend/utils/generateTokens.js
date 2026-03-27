const jwt = require("jsonwebtoken");

const generateTokens = (userId) => {

  const token = jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET,
    { expiresIn: "1y" }
  );
  return token;
};

module.exports = generateTokens;