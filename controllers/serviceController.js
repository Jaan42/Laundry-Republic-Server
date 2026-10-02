const Service = require("../models/Service");
const {
  createHttpError,
  ensureValidObjectId,
  ensureObjectBody,
} = require("./controllerHelpers");

const pricingTypes = ["perKg", "perPiece", "perPair"];

const getServices = async (req, res, next) => {
  try {
    const { active, pricingType } = req.query;
    const filter = {};

    if (active !== undefined) {
      if (typeof active !== "string" || !["true", "false"].includes(active)) {
        throw createHttpError(400, "active must be true or false");
      }

      filter.isActive = active === "true";
    }

    if (pricingType !== undefined) {
      if (
        typeof pricingType !== "string" ||
        !pricingTypes.includes(pricingType)
      ) {
        throw createHttpError(
          400,
          "pricingType must be perKg, perPiece, or perPair",
        );
      }

      filter.pricingType = pricingType;
    }

    const services = await Service.find(filter);
    res.status(200).json(services);
  } catch (error) {
    next(error);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "Service");

    const service = await Service.findById(req.params.id);

    if (!service) {
      throw createHttpError(404, "Service not found");
    }

    res.status(200).json(service);
  } catch (error) {
    next(error);
  }
};

const createService = async (req, res, next) => {
  try {
    ensureObjectBody(req.body);

    const service = await Service.create(req.body);
    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "Service");
    ensureObjectBody(req.body);

    const service = await Service.findById(req.params.id);

    if (!service) {
      throw createHttpError(404, "Service not found");
    }

    service.set(req.body);
    await service.save();

    res.status(200).json(service);
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "Service");

    const service = await Service.findByIdAndDelete(req.params.id);

    if (!service) {
      throw createHttpError(404, "Service not found");
    }

    res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
