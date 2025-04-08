const express = require("express");
const router = express.Router();

const CustomerRequest = require("../models/CustomerRequest");

const Joi = require("joi");

// verify data
const CustomerRequestSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  message: Joi.string(),
  createdAt: Joi.date().default(Date.now),
});

router.post("/", async (req, res) => {
  try {
    const newRequest = new CustomerRequest(req.body);
    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
