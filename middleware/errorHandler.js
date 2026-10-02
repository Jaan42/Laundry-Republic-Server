const mongoose = require("mongoose");

const formatValidationErrors = (error) =>
  Object.fromEntries(
    Object.entries(error.errors).map(([field, details]) => [
      field,
      details.message,
    ]),
  );

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: formatValidationErrors(error),
    });
  }

  if (error?.code === 11000) {
    const duplicateField =
      Object.keys(error.keyPattern || error.keyValue || {})[0] || "field";

    return res.status(400).json({
      message: "Duplicate value",
      errors: {
        [duplicateField]: `${duplicateField} must be unique`,
      },
    });
  }

  if (error instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      message: `Invalid value for ${error.path}`,
    });
  }

  if (error instanceof SyntaxError && error.status === 400 && error.body) {
    return res.status(400).json({ message: "Malformed JSON request body" });
  }

  if (error.statusCode) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(`Unexpected error while handling ${req.method} ${req.originalUrl}`);
  return res.status(500).json({ message: "Internal server error" });
};

module.exports = errorHandler;
