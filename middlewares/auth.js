const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    // console.log("Auth")
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res.status(401).json({
        error: "No token provided",
        message: "Please login to access this resource",
      });
    }

    // Handle Bearer token format
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      return res.status(401).json({
        error: "Invalid token format",
        message: "Please provide a valid authentication token",
      });
    }

    const decoded = jwt.verify(token, process.env.JWTKEY);
    req.payload = decoded;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
        message: "Your session has expired. Please login again.",
      });
    }
    res.status(400).json({
      error: "Invalid token",
      message: error.message,
    });
  }
};
