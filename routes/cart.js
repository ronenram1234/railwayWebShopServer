const express = require("express");
const router = express.Router();
const Stock = require("../models/stock");
const UserCart = require("../models/UserCart");
const auth = require("../middlewares/auth");

// Get user's cart items (requires authentication)
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.payload._id;

    // Get all cart items for the user
    const cartItems = await UserCart.find({ userId });

    // Get all stocks in the cart
    const stocks = await Stock.find({
      _id: { $in: cartItems.map((item) => item.stockId) },
    });

    // Add inCart field and quota info to each stock
    const stocksWithCartStatus = stocks.map((stock) => {
      const cartItem = cartItems.find(
        (item) => item.stockId.toString() === stock._id.toString()
      );
      return {
        ...stock.toObject(),
        inCart: true,
        requestedQuota: cartItem?.requestedQuota,
        quotaRequestDate: cartItem?.quotaRequestDate,
        quotaHandled: cartItem?.quotaHandled || false,
      };
    });

    return res.status(200).send(stocksWithCartStatus);
  } catch (err) {
    console.error("Error getting cart items:", err);
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

// Toggle cart for a stock (requires authentication)
router.patch("/:id", auth, async (req, res) => {
  try {
    // Check if stock exists
    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).send("Stock not found");

    const userId = req.payload._id;
    const stockId = req.params.id;

    // Try to find existing cart item
    const existingCartItem = await UserCart.findOne({ userId, stockId });

    if (existingCartItem) {
      // Remove from cart if it exists
      await UserCart.deleteOne({ _id: existingCartItem._id });
      return res.status(200).send({
        ...stock.toObject(),
        inCart: false,
      });
    } else {
      // Add new cart item
      const cartItem = new UserCart({ userId, stockId });
      await cartItem.save();
      return res.status(200).send({
        ...stock.toObject(),
        inCart: true,
      });
    }
  } catch (err) {
    console.error("Error toggling cart:", err);
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

// Get all cart items for admin users
router.get("/all", auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.payload.isAdmin) {
      return res.status(403).send("Access denied. Admin privileges required.");
    }

    // Get all cart items
    const cartItems = await UserCart.find()
      .populate("userId", "name email")
      .populate("stockId");

    // Group cart items by stock
    const stocksMap = new Map();
    cartItems.forEach((cartItem) => {
      const stock = cartItem.stockId.toObject();
      if (!stocksMap.has(stock._id)) {
        stocksMap.set(stock._id, {
          ...stock,
          inCartBy: [],
          requestedQuota: cartItem.requestedQuota,
          quotaRequestDate: cartItem.quotaRequestDate,
          quotaHandled: cartItem.quotaHandled,
        });
      }
      stocksMap.get(stock._id).inCartBy.push({
        userId: cartItem.userId._id,
        name: cartItem.userId.name,
        email: cartItem.userId.email,
        createdAt: cartItem.createdAt,
        quantity: cartItem.quantity,
        requestedQuota: cartItem.requestedQuota,
        quotaRequestDate: cartItem.quotaRequestDate,
        quotaHandled: cartItem.quotaHandled,
      });
    });

    return res.status(200).send(Array.from(stocksMap.values()));
  } catch (err) {
    console.error("Error getting all cart items:", err);
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

// Request quota for a cart item
router.post("/:id/request-quota", auth, async (req, res) => {
  try {
    const { requestedQuota } = req.body;
    if (!requestedQuota || requestedQuota < 1) {
      return res.status(400).send("Invalid quota request amount");
    }

    const userId = req.payload._id;
    const stockId = req.params.id;

    // Check if stock exists
    const stock = await Stock.findById(stockId);
    if (!stock) return res.status(404).send("Stock not found");

    // Find or create cart item
    let cartItem = await UserCart.findOne({ userId, stockId });
    if (!cartItem) {
      cartItem = new UserCart({ userId, stockId });
    }

    // Update quota request details
    cartItem.requestedQuota = requestedQuota;
    cartItem.quotaRequestDate = new Date();
    cartItem.quotaHandled = false;
    await cartItem.save();

    return res.status(200).send({
      ...stock.toObject(),
      inCart: true,
      requestedQuota: cartItem.requestedQuota,
      quotaRequestDate: cartItem.quotaRequestDate,
      quotaHandled: cartItem.quotaHandled,
    });
  } catch (err) {
    console.error("Error requesting quota:", err);
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

// Admin route to approve/reject quota requests
router.patch("/:id/quota-status", auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.payload.isAdmin) {
      return res.status(403).send("Access denied. Admin privileges required.");
    }

    const { status, rejectionReason } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).send("Invalid status");
    }

    const cartItem = await UserCart.findById(req.params.id);
    if (!cartItem) return res.status(404).send("Cart item not found");

    cartItem.quotaStatus = status;
    if (status === "approved") {
      cartItem.quotaApprovalDate = new Date();
    } else if (status === "rejected") {
      cartItem.quotaRejectionReason = rejectionReason;
    }
    await cartItem.save();

    return res.status(200).send(cartItem);
  } catch (err) {
    console.error("Error updating quota status:", err);
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

// Admin route to mark quota as handled
router.patch("/:id/mark-handled", auth, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.payload.isAdmin) {
      return res.status(403).send("Access denied. Admin privileges required.");
    }

    const stockId = req.params.id;

    // Find cart item with pending quota request for this stock
    const cartItem = await UserCart.findOne({
      stockId,
      requestedQuota: { $exists: true },
      quotaHandled: { $ne: true },
    });

    if (!cartItem) {
      return res
        .status(404)
        .send("No pending quota request found for this stock");
    }

    cartItem.quotaHandled = true;
    await cartItem.save();

    // Get updated cart items to return the full updated state
    const updatedCartItems = await UserCart.find({ stockId })
      .populate("userId", "name email")
      .populate("stockId");

    // Format the response similar to getAllCartItems
    const stock = updatedCartItems[0].stockId.toObject();
    const response = {
      ...stock,
      inCartBy: updatedCartItems.map((item) => ({
        userId: item.userId._id,
        name: item.userId.name,
        email: item.userId.email,
        createdAt: item.createdAt,
        quantity: item.quantity,
        requestedQuota: item.requestedQuota,
        quotaRequestDate: item.quotaRequestDate,
        quotaHandled: item.quotaHandled,
      })),
    };

    return res.status(200).send(response);
  } catch (err) {
    console.error("Error marking quota as handled:", err);
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

module.exports = router;
