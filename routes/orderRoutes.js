const express = require("express");
const {
  getOrders,
  getOrderById,
  previewOrderCalculation,
  createOrder,
  updateOrder,
  deleteOrder,
} = require("../controllers/orderController");

const router = express.Router();

router.post("/calculate", previewOrderCalculation);
router.route("/").get(getOrders).post(createOrder);
router.route("/:id").get(getOrderById).put(updateOrder).delete(deleteOrder);

module.exports = router;
