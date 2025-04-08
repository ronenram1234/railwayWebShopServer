const { Schema, model } = require("mongoose");

const userFavoriteSchema = new Schema({
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
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
});

// Compound index to ensure a user can only favorite an item once
userFavoriteSchema.index({ userId: 1, stockId: 1 }, { unique: true });

const UserFavorite = model("UserFavorite", userFavoriteSchema);
module.exports = UserFavorite;
