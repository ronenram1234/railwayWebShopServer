const express = require("express");
const router = express.Router();
const Stock = require("../models/stock");
const Joi = require("joi");
const auth = require("../middlewares/auth");
const path = require("path");
const fs = require("fs");

// Stock schema validation
const StockSchema = Joi.object({
  Brand: Joi.string().allow("").default(""),
  Model: Joi.string().allow("").default(""),
  Quantity: Joi.number().default(0),
  "Price (USD)": Joi.string().allow("").default(""),
  Condition: Joi.string().allow("").default(""),
  Description: Joi.string().allow("").default(""),
  Detail: Joi.string().allow("").default(""),
  "Product Category": Joi.string().allow("").default(""),
  "Part Number": Joi.string().allow("").default(""),
  SKU: Joi.string().allow("").default(""),
  "Serial Number": Joi.string().allow("").default(""),
  Location: Joi.string().allow("").default(""),
  Status: Joi.string().allow("").default(""),
});

// Create new stock
router.post("/", auth, async (req, res) => {
  try {
    if (Object.keys(req.body).length === 0) {
      return res.status(400).send("Stock details are missing");
    }

    // Validate input
    const { error } = await StockSchema.validateAsync(req.body);
    if (error) return res.status(400).send("Invalid stock data");

    // Create stock
    const stock = new Stock(req.body);
    const newStock = await stock.save();

    return res.status(200).send(newStock);
  } catch (err) {
    console.log(err.message);
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

// Get all stocks
router.get("/", async (req, res) => {
  try {
    const stocks = await Stock.find();
    return res.status(200).send(stocks);
  } catch (err) {
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

// Get unique brands with their logos
router.get("/brands", async (req, res) => {
  try {
    const brands = await Stock.distinct("Brand");

    if (!brands || brands.length === 0) {
      return res.status(200).send([]);
    }

    // Filter out empty or null brands and trim whitespace
    const validBrands = brands.filter((brand) => brand.trim() !== "");

    const brandLogos = validBrands.map((brand) => {
      // Replace spaces and special chars with underscore, keep original case, add _logo suffix
      const fileName = `${brand.replace(/[^a-zA-Z0-9]/g, "_")}_logo.png`;
      const logoPath = `/logos/${fileName}`;
      return {
        brand,
        fileName,
        logoPath,
      };
    });

    return res.status(200).send(brandLogos);
  } catch (err) {
    console.error("Error in /brands route:", err);
    res.status(500).send(`Server error - ${err.message}`);
  }
});

// Get stock by ID
router.get("/:id", async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).send("Stock not found");
    return res.status(200).send(stock);
  } catch (err) {
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

// Delete stock (requires authentication)
router.delete("/:id", auth, async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).send("Stock not found");

    await Stock.findByIdAndDelete(req.params.id);
    return res.status(200).send("Stock deleted successfully");
  } catch (err) {
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

// Update stock (requires authentication)
router.patch("/:id", auth, async (req, res) => {
  try {
    // Find the stock first
    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).send("Stock not found");

    // Validate the update fields
    const { error } = await StockSchema.validateAsync(req.body);
    if (error) return res.status(400).send("Invalid stock data");

    // Update the stock
    const updatedStock = await Stock.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    return res.status(200).send(updatedStock);
  } catch (err) {
    console.error("Error updating stock:", err);
    res.status(400).send(`Invalid request - ${err.message}`);
  }
});

// Serve logo files
router.get("/logos/:filename", (req, res) => {
  const filename = req.params.filename;
  const logoPath = path.join(__dirname, "../public/logos", filename);

  if (fs.existsSync(logoPath)) {
    res.sendFile(logoPath);
  } else {
    res.status(404).send("Logo not found");
  }
});

module.exports = router;
