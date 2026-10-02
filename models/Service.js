const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      maxlength: 300,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    pricingType: {
      type: String,
      enum: ["perKg", "perPiece", "perPair"],
    },
    turnaroundDays: {
      type: Number,
      required: true,
      min: 0,
      max: 14,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, collection: "services" },
);

module.exports = mongoose.model("Service", serviceSchema);
