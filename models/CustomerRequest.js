const { Schema, model } = require("mongoose");
const customerSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  message: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ["pending", "in-progress", "completed", "rejected"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

const CustomerRequest = model("customerrequests", customerSchema);
module.exports = CustomerRequest;
