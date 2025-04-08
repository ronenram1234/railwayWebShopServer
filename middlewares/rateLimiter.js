const rateLimit = require("express-rate-limit");

// Create rate limiter middleware
const apiLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 5000, // Limit each IP to 5000 requests per windowMs
  message: {
    error: "Too many requests",
    message:
      "You have exceeded the 5000 requests limit for 24 hours. Please try again later.",
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

module.exports = apiLimiter;
