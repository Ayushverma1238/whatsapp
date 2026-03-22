const jwt = require("jsonwebtoken");

const generateTokens = (user) => {

  const token = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return token;
};

module.exports = generateTokens;