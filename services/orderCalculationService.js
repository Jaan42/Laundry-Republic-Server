const mongoose = require("mongoose");
const Service = require("../models/Service");
const Promotion = require("../models/Promotion");

const createServiceError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const roundCurrency = (value) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const normalizeAdditionalCharge = (value = 0) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw createServiceError(
      400,
      "additionalCharge must be a non-negative number",
    );
  }

  return roundCurrency(value);
};

const normalizeOrderDate = (value = new Date()) => {
  if (value === null || value === "") {
    throw createServiceError(400, "orderDate must be a valid date");
  }

  const orderDate = value instanceof Date ? new Date(value) : new Date(value);

  if (Number.isNaN(orderDate.getTime())) {
    throw createServiceError(400, "orderDate must be a valid date");
  }

  return orderDate;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const applySession = (query, session) =>
  session ? query.session(session) : query;

const loadAndPriceItems = async (items, session) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw createServiceError(400, "At least one order item is required");
  }

  items.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw createServiceError(400, `items[${index}] must be an object`);
    }

    if (!mongoose.isObjectIdOrHexString(item.serviceId)) {
      throw createServiceError(
        400,
        `Invalid Service ID at items[${index}]`,
      );
    }

    if (
      typeof item.quantity !== "number" ||
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0
    ) {
      throw createServiceError(
        400,
        `items[${index}].quantity must be greater than 0`,
      );
    }

    if (
      Object.hasOwn(item, "priceAtOrder") ||
      Object.hasOwn(item, "price") ||
      Object.hasOwn(item, "lineTotal")
    ) {
      throw createServiceError(
        400,
        `items[${index}] contains a server-calculated price field`,
      );
    }
  });

  const serviceIds = [...new Set(items.map((item) => String(item.serviceId)))];
  const serviceQuery = Service.find({ _id: { $in: serviceIds } });
  const services = await applySession(serviceQuery, session);
  const serviceById = new Map(
    services.map((service) => [String(service._id), service]),
  );

  return items.map((item) => {
    const service = serviceById.get(String(item.serviceId));

    if (!service) {
      throw createServiceError(404, `Service not found: ${item.serviceId}`);
    }

    const priceAtOrder = roundCurrency(service.price);
    const lineTotal = roundCurrency(priceAtOrder * item.quantity);

    return {
      service,
      quantity: item.quantity,
      priceAtOrder,
      lineTotal,
    };
  });
};

const validatePromotion = async ({
  promotionCode,
  baseTotal,
  orderDate,
  session,
}) => {
  if (
    promotionCode === undefined ||
    promotionCode === null ||
    promotionCode === ""
  ) {
    return null;
  }

  if (typeof promotionCode !== "string") {
    throw createServiceError(400, "promotionCode must be a string");
  }

  const normalizedCode = promotionCode.trim().toUpperCase();

  if (!normalizedCode) {
    return null;
  }

  const promotionQuery = Promotion.findOne({ code: normalizedCode });
  const promotion = await applySession(promotionQuery, session);

  if (!promotion) {
    throw createServiceError(400, "Promotion code not found");
  }

  if (!promotion.isActive) {
    throw createServiceError(400, "Promotion is inactive");
  }

  if (orderDate < promotion.startDate || orderDate > promotion.endDate) {
    throw createServiceError(
      400,
      "Promotion is not valid for the order date",
    );
  }

  if (baseTotal < promotion.minimumAmount) {
    throw createServiceError(
      400,
      `Promotion requires a minimum amount of ${promotion.minimumAmount}`,
    );
  }

  return promotion;
};

const calculateOrder = async ({
  items,
  promotionCode,
  additionalCharge = 0,
  orderDate = new Date(),
  session,
}) => {
  const normalizedOrderDate = normalizeOrderDate(orderDate);
  const normalizedAdditionalCharge = normalizeAdditionalCharge(additionalCharge);
  const calculatedItems = await loadAndPriceItems(items, session);
  const subtotal = roundCurrency(
    calculatedItems.reduce((total, item) => total + item.lineTotal, 0),
  );
  const baseTotal = roundCurrency(subtotal + normalizedAdditionalCharge);
  const promotion = await validatePromotion({
    promotionCode,
    baseTotal,
    orderDate: normalizedOrderDate,
    session,
  });
  const discountPercentage = promotion?.discountPercentage || 0;
  const discountAmount = roundCurrency(
    baseTotal * (discountPercentage / 100),
  );
  const grandTotal = roundCurrency(baseTotal - discountAmount);
  const maximumTurnaroundDays = Math.max(
    ...calculatedItems.map((item) => item.service.turnaroundDays),
  );
  const expectedCompletionDate = addDays(
    normalizedOrderDate,
    maximumTurnaroundDays,
  );

  return {
    items: calculatedItems,
    subtotal,
    additionalCharge: normalizedAdditionalCharge,
    baseTotal,
    promotion,
    discountPercentage,
    discountAmount,
    grandTotal,
    orderDate: normalizedOrderDate,
    expectedCompletionDate,
    maximumTurnaroundDays,
  };
};

const toCalculationResponse = (calculation) => ({
  items: calculation.items.map((item) => ({
    serviceId: item.service._id,
    service: {
      _id: item.service._id,
      name: item.service.name,
      pricingType: item.service.pricingType,
      turnaroundDays: item.service.turnaroundDays,
    },
    quantity: item.quantity,
    priceAtOrder: item.priceAtOrder,
    lineTotal: item.lineTotal,
  })),
  subtotal: calculation.subtotal,
  additionalCharge: calculation.additionalCharge,
  baseTotal: calculation.baseTotal,
  promotion: calculation.promotion
    ? {
        _id: calculation.promotion._id,
        code: calculation.promotion.code,
        discountPercentage: calculation.promotion.discountPercentage,
        minimumAmount: calculation.promotion.minimumAmount,
      }
    : null,
  discountPercentage: calculation.discountPercentage,
  discountAmount: calculation.discountAmount,
  grandTotal: calculation.grandTotal,
  orderDate: calculation.orderDate,
  expectedCompletionDate: calculation.expectedCompletionDate,
  maximumTurnaroundDays: calculation.maximumTurnaroundDays,
});

const calculateStoredTotals = ({ order, orderItems, promotion }) => {
  const items = orderItems.map((item) => ({
    ...item,
    lineTotal: roundCurrency(item.priceAtOrder * item.quantity),
  }));
  const subtotal = roundCurrency(
    items.reduce((total, item) => total + item.lineTotal, 0),
  );
  const additionalCharge = roundCurrency(order.additionalCharge || 0);
  const baseTotal = roundCurrency(subtotal + additionalCharge);
  const discountPercentage = promotion?.discountPercentage || 0;
  const discountAmount = roundCurrency(
    baseTotal * (discountPercentage / 100),
  );
  const grandTotal = roundCurrency(baseTotal - discountAmount);

  return {
    items,
    subtotal,
    additionalCharge,
    baseTotal,
    discountPercentage,
    discountAmount,
    grandTotal,
  };
};

const getDueStatus = (status, expectedCompletionDate, currentDate = new Date()) => {
  if (status === "Completed") {
    return "Completed";
  }

  const toUtcDay = (value) => {
    const date = new Date(value);
    return Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    );
  };

  const today = toUtcDay(currentDate);
  const expectedDay = toUtcDay(expectedCompletionDate);

  if (today > expectedDay) {
    return "Overdue";
  }

  if (today === expectedDay) {
    return "Due Today";
  }

  return "Upcoming";
};

module.exports = {
  calculateOrder,
  toCalculationResponse,
  calculateStoredTotals,
  getDueStatus,
};
