const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Washing",
        "Drying",
        "Ready for Pickup",
        "Completed",
        "Cancelled",
      ],
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    expectedCompletionDate: {
      type: Date,
    },
    promotionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion",
    },
    additionalCharge: {
      type: Number,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  { timestamps: true, collection: "orders" },
);

module.exports = mongoose.model("Order", orderSchema);
