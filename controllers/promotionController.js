const Promotion = require("../models/Promotion");
const {
  createHttpError,
  ensureValidObjectId,
  ensureObjectBody,
} = require("./controllerHelpers");

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

module.exports = {
  getPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
};
