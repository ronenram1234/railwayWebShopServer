const { Schema, model } = require("mongoose");

const stockSchema = new Schema(
  {
    Brand: {
      type: String,
      required: false,
      default: "",
    },
    Model: {
      type: String,
      required: false,
      default: "",
    },
    Quantity: {
      type: Number,
      required: false,
      default: 0,
    },
    "Price (USD)": {
      type: String,
      required: false,
      default: "",
    },
    Condition: {
      type: String,
      required: false,
      default: "",
    },
    Description: {
      type: String,
      required: false,
      default: "",
    },
    Detail: {
      type: String,
      required: false,
      default: "",
    },
    "Product Category": {
      type: String,
      required: false,
      default: "",
    },
    "Part Number": {
      type: String,
      required: false,
      default: "",
    },
    SKU: {
      type: String,
      required: false,
      default: "",
    },
    "Serial Number": {
      type: String,
      required: false,
      default: "",
    },
    Location: {
      type: String,
      required: false,
      default: "",
    },
    Status: {
      type: String,
      required: false,
      default: "",
    },
    favorites: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
    collection: "stocks",
  }
);

// Add index for better performance
stockSchema.index({ SKU: 1 }, { unique: true });

// Add validation middleware
stockSchema.pre("save", function (next) {
  // Validate SKU format if provided
  if (this.SKU && this.SKU.trim() !== "") {
    if (!/^[A-Za-z0-9-]+$/.test(this.SKU)) {
      next(new Error("SKU can only contain letters, numbers, and hyphens"));
      return;
    }
  }
  next();
});

const Stock = model("Stock", stockSchema);
module.exports = Stock;
// module.exports = mongoose.model("Stock", stockSchema);
