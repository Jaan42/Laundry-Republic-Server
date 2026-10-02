const express = require("express");
const {
  getOrders,
  getOrderById,
  previewOrderCalculation,
  createOrder,
  updateOrder,
  deleteOrder,
} = require("../controllers/orderController");
const {
  updateOrderStatus,
  getOrderStatistics,
  getRevenueSummary,
  getPopularServices,
} = require("../controllers/orderProcessingController");

const router = express.Router();

router.post("/calculate", previewOrderCalculation);
router.get("/statistics", getOrderStatistics);
router.get("/revenue-summary", getRevenueSummary);
router.get("/popular-services", getPopularServices);
router.patch("/:id/status", updateOrderStatus);
router.route("/").get(getOrders).post(createOrder);
router.route("/:id").get(getOrderById).put(updateOrder).delete(deleteOrder);

module.exports = router;
