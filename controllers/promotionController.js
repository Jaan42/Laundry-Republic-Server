const Promotion = require("../models/Promotion");
const {
  createHttpError,
  ensureValidObjectId,
  ensureObjectBody,
} = require("./controllerHelpers");
const {
  checkPromotionEligibility,
} = require("../services/orderCalculationService");

const getPromotions = async (req, res, next) => {
  try {
    const promotions = await Promotion.find();
    res.status(200).json(promotions);
  } catch (error) {
    next(error);
  }
};

const getPromotionById = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "Promotion");

    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      throw createHttpError(404, "Promotion not found");
    }

    res.status(200).json(promotion);
  } catch (error) {
    next(error);
  }
};

const createPromotion = async (req, res, next) => {
  try {
    ensureObjectBody(req.body);

    const promotion = await Promotion.create(req.body);
    res.status(201).json(promotion);
  } catch (error) {
    next(error);
  }
};

const updatePromotion = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "Promotion");
    ensureObjectBody(req.body);

    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      throw createHttpError(404, "Promotion not found");
    }

    promotion.set(req.body);
    await promotion.save();

    res.status(200).json(promotion);
  } catch (error) {
    next(error);
  }
};

const deletePromotion = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "Promotion");

    const promotion = await Promotion.findByIdAndDelete(req.params.id);

    if (!promotion) {
      throw createHttpError(404, "Promotion not found");
    }

    res.status(200).json({ message: "Promotion deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const validatePromotionCode = async (req, res, next) => {
  try {
    ensureObjectBody(req.body);

    const { code, subtotal } = req.body;

    if (typeof code !== "string" || !code.trim()) {
      throw createHttpError(400, "code is required");
    }

    if (
      typeof subtotal !== "number" ||
      !Number.isFinite(subtotal) ||
      subtotal < 0
    ) {
      throw createHttpError(400, "subtotal must be a non-negative number");
    }

    const result = await checkPromotionEligibility({
      promotionCode: code,
      baseTotal: subtotal,
      orderDate: new Date(),
    });

    res.status(200).json({
      valid: result.valid,
      code: result.promotion?.code || code.trim().toUpperCase(),
      discountPercentage: result.valid
        ? result.promotion.discountPercentage
        : 0,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  validatePromotionCode,
};
