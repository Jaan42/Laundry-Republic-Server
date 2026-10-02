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

module.exports = {
  createHttpError,
  ensureValidObjectId,
  ensureObjectBody,
};
