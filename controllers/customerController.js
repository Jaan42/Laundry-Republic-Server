const Customer = require("../models/Customer");
const {
  createHttpError,
  ensureValidObjectId,
  ensureObjectBody,
} = require("./controllerHelpers");

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getCustomers = async (req, res, next) => {
  try {
    const { search } = req.query;

    if (search !== undefined && typeof search !== "string") {
      throw createHttpError(400, "search must be a string");
    }

    const filter = {};
    const searchTerm = search?.trim();

    if (searchTerm) {
      const searchPattern = new RegExp(escapeRegex(searchTerm), "i");
      filter.$or = [
        { name: searchPattern },
        { contactNumber: searchPattern },
        { email: searchPattern },
      ];
    }

    const customers = await Customer.find(filter);
    res.status(200).json(customers);
  } catch (error) {
    next(error);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "Customer");

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      throw createHttpError(404, "Customer not found");
    }

    res.status(200).json(customer);
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    ensureObjectBody(req.body);

    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "Customer");
    ensureObjectBody(req.body);

    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      throw createHttpError(404, "Customer not found");
    }

    customer.set(req.body);
    await customer.save();

    res.status(200).json(customer);
  } catch (error) {
    next(error);
  }
};

const deleteCustomer = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "Customer");

    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      throw createHttpError(404, "Customer not found");
    }

    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
