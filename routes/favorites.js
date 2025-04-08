const express = require("express");
const router = express.Router();
const Stock = require("../models/stock");
const UserFavorite = require("../models/UserFavorite");
const auth = require("../middlewares/auth");

// Get user's favorite items (requires authentication)
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.payload._id;

    // Get all favorites for the current user
    const favorites = await UserFavorite.find({ userId });

    // Get all stocks in favorites
    const stocks = await Stock.find({
      _id: { $in: favorites.map((item) => item.stockId) },
    });

    // Add isFavorite field to each stock
    const stocksWithFavorites = stocks.map((stock) => ({
      ...stock.toObject(),
      isFavorite: true,
    }));

    return res.status(200).send(stocksWithFavorites);
  } catch (err) {
    console.error("Error getting favorite items:", err);
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

// Toggle favorite for a stock (requires authentication)
router.patch("/:id", auth, async (req, res) => {
  try {
    // Check if stock exists
    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).send("Stock not found");

    const userId = req.payload._id;
    const stockId = req.params.id;

    // Try to find existing favorite
    const existingFavorite = await UserFavorite.findOne({ userId, stockId });

    if (existingFavorite) {
      // Remove from favorites if it exists
      await UserFavorite.deleteOne({ _id: existingFavorite._id });
      return res.status(200).send({
        ...stock.toObject(),
        isFavorite: false,
      });
    } else {
      // Add new favorite
      const favorite = new UserFavorite({ userId, stockId });
      await favorite.save();
      return res.status(200).send({
        ...stock.toObject(),
        isFavorite: true,
      });
    }
  } catch (err) {
    console.error("Error toggling favorite:", err);
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

// Get all favorites for admin users
router.get("/all", auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.payload.isAdmin) {
      return res.status(403).send("Access denied. Admin privileges required.");
    }

    // Get all favorites
    const favorites = await UserFavorite.find()
      .populate("userId", "name email")
      .populate("stockId");

    // Group favorites by stock
    const stocksMap = new Map();
    favorites.forEach((favorite) => {
      const stock = favorite.stockId.toObject();
      if (!stocksMap.has(stock._id)) {
        stocksMap.set(stock._id, {
          ...stock,
          favoritedBy: [],
        });
      }
      stocksMap.get(stock._id).favoritedBy.push({
        userId: favorite.userId._id,
        name: favorite.userId.name,
        email: favorite.userId.email,
        createdAt: favorite.createdAt,
      });
    });

    return res.status(200).send(Array.from(stocksMap.values()));
  } catch (err) {
    console.error("Error getting all favorites:", err);
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

module.exports = router;
