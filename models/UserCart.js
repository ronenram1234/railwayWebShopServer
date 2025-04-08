const { Schema, model } = require("mongoose");

const userCartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  stockId: {
    type: Schema.Types.ObjectId,
    ref: "Stock",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
  },
  requestedQuota: {
    type: Number,
    required: false,
    min: 1,
  },
  quotaRequestDate: {
    type: Date,
    required: false,
  },
  quotaHandled: {
    type: Boolean,
    required: false,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure a user can only have one cart entry per item
userCartSchema.index({ userId: 1, stockId: 1 }, { unique: true });

// Update the updatedAt timestamp on save
userCartSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const UserCart = model("UserCart", userCartSchema);
module.exports = UserCart;
