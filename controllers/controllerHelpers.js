const mongoose = require("mongoose");

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const ensureValidObjectId = (id, resourceName) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    throw createHttpError(400, `Invalid ${resourceName} ID`);
  }
};

const ensureObjectBody = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createHttpError(400, "Request body must be a JSON object");
  }
};

const parseDateFilter = (value, fieldName, useEndOfDay = false) => {
  if (typeof value !== "string" || !value.trim()) {
    throw createHttpError(400, `${fieldName} must be a valid date`);
  }

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, `${fieldName} must be a valid date`);
  }

  if (useEndOfDay && isDateOnly) {
    date.setUTCHours(23, 59, 59, 999);
  }

  return date;
};

module.exports = {
  createHttpError,
  ensureValidObjectId,
  ensureObjectBody,
  parseDateFilter,
};
