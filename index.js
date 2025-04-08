const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const expressListRoutes = require("express-list-routes");
const apiLimiter = require("./middlewares/rateLimiter");

const users = require("./routes/users");
const stocks = require("./routes/stocks");
const cart = require("./routes/cart");
const favorites = require("./routes/favorites");
const CustomerRequest = require("./routes/customersrequests");

const auth = require("./middlewares/auth");
const { logger, requestTimer, errorLogger } = require("./middlewares/logger");
const port = process.env.PORT || 5000;

const app = express();

mongoose
  .connect(process.env.DB)
  .then(() => console.log("👍connected to mongo db server⭐"))
  .catch((err) => console.log(err));

app.use(cors());
app.use(express.json());

// Apply rate limiting to all routes
app.use(apiLimiter);

// Serve static files from the public directory

app.use(requestTimer); //start time
app.use(logger); // Log request details
app.use(errorLogger); //error log Bonus 2 task

app.use("/api/users", users);
app.use("/api/stocks", stocks);
app.use("/api/cart", cart);
app.use("/api/favorites", favorites);
app.use("/api/logos", express.static(path.join(__dirname, "public", "logos")));
app.use("/api/customersrequests", CustomerRequest);
app.use("*", (req, res) => {
  res.status(404).json({ error: "Illegal path - Route not found" });
});

expressListRoutes(app);

app.listen(port, () => console.log(`👍port started ${port}⭐`));
