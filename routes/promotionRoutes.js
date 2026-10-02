const express = require("express");
const {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  validatePromotionCode,
} = require("../controllers/promotionController");

const router = express.Router();

router.post("/validate", validatePromotionCode);
router.route("/").get(getPromotions).post(createPromotion);
router
  .route("/:id")
  .get(getPromotionById)
  .put(updatePromotion)
  .delete(deletePromotion);

module.exports = router;
