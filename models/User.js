const { Schema, model } = require("mongoose");
const userSchema = new Schema({
  name: {
    first: { type: String, required: true },
    middle: { type: String },
    last: { type: String, required: true },
  },
  phone: {
    type: String,
    required: true,
  },
  email: { type: String, required: true, unique: true },
  password: {
    type: String,
    required: true,
    minlength: 7,
  },
  address: {
    state: { type: String, default: "" },
    country: { type: String, required: true },
    city: { type: String, required: true },
    street: { type: String, required: true },
    houseNumber: { type: Number, required: true },
    zip: { type: Number },
  },
  isAdmin: { type: Boolean, default: false },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

const User = model("User", userSchema);
module.exports = User;
