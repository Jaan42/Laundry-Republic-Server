const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      validate: {
        validator: (value) => value > 0,
        message: "Quantity must be greater than 0.",
      },
    },
    priceAtOrder: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true, collection: "orderItems" },
);

module.exports = mongoose.model("OrderItem", orderItemSchema);
