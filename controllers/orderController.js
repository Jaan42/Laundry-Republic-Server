const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Promotion = require("../models/Promotion");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const {
  createHttpError,
  ensureValidObjectId,
  ensureObjectBody,
  parseDateFilter,
} = require("./controllerHelpers");
const {
  calculateOrder,
  toCalculationResponse,
} = require("../services/orderCalculationService");
const {
  getOrderDetailsById,
  getAllOrderDetails,
} = require("../services/orderPresentationService");

const serverControlledFields = [
  "orderNumber",
  "status",
  "promotionId",
  "subtotal",
  "baseTotal",
  "discountPercentage",
  "discountAmount",
  "grandTotal",
  "expectedCompletionDate",
  "priceAtOrder",
];

const hasOwn = (object, property) => Object.hasOwn(object, property);

const rejectServerControlledFields = (body) => {
  const suppliedField = serverControlledFields.find((field) =>
    hasOwn(body, field),
  );

  if (suppliedField) {
    throw createHttpError(
      400,
      `${suppliedField} is controlled by the server`,
    );
  }
};

const ensureCustomerExists = async (customerId, session) => {
  if (customerId === undefined || customerId === null || customerId === "") {
    throw createHttpError(400, "customerId is required");
  }

  ensureValidObjectId(customerId, "Customer");

  let query = Customer.findById(customerId);
  if (session) query = query.session(session);
  const customer = await query;

  if (!customer) {
    throw createHttpError(404, "Customer not found");
  }

  return customer;
};

const generateOrderNumber = async (session) => {
  const existingOrders = await Order.find({
    orderNumber: /^LR-\d+$/,
  })
    .select("orderNumber")
    .session(session)
    .lean();
  const highestNumber = existingOrders.reduce((highest, order) => {
    const numericPart = Number(order.orderNumber.replace("LR-", ""));
    return Number.isFinite(numericPart)
      ? Math.max(highest, numericPart)
      : highest;
  }, 0);

  return `LR-${String(highestNumber + 1).padStart(4, "0")}`;
};

const createOrderItemData = (orderId, calculatedItems) =>
  calculatedItems.map((item) => ({
    orderId,
    serviceId: item.service._id,
    quantity: item.quantity,
    priceAtOrder: item.priceAtOrder,
  }));

const parseTotalFilter = (value, fieldName) => {
  if (typeof value !== "string" || !value.trim()) {
    throw createHttpError(400, `${fieldName} must be a non-negative number`);
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw createHttpError(400, `${fieldName} must be a non-negative number`);
  }

  return number;
};

const getOrders = async (req, res, next) => {
  try {
    const { search, status, startDate, endDate, minTotal, maxTotal, sort } =
      req.query;
    const statusValues = Order.schema.path("status").enumValues;
    const sortValues = ["newest", "oldest", "highestTotal", "lowestTotal"];

    if (search !== undefined && typeof search !== "string") {
      throw createHttpError(400, "search must be a string");
    }

    if (
      status !== undefined &&
      (typeof status !== "string" || !statusValues.includes(status))
    ) {
      throw createHttpError(400, "Invalid order status filter");
    }

    if (
      sort !== undefined &&
      (typeof sort !== "string" || !sortValues.includes(sort))
    ) {
      throw createHttpError(400, "Invalid order sort value");
    }

    const parsedStartDate =
      startDate === undefined
        ? null
        : parseDateFilter(startDate, "startDate");
    const parsedEndDate =
      endDate === undefined
        ? null
        : parseDateFilter(endDate, "endDate", true);
    const parsedMinTotal =
      minTotal === undefined
        ? null
        : parseTotalFilter(minTotal, "minTotal");
    const parsedMaxTotal =
      maxTotal === undefined
        ? null
        : parseTotalFilter(maxTotal, "maxTotal");

    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      throw createHttpError(400, "startDate cannot be after endDate");
    }

    if (
      parsedMinTotal !== null &&
      parsedMaxTotal !== null &&
      parsedMinTotal > parsedMaxTotal
    ) {
      throw createHttpError(400, "minTotal cannot be greater than maxTotal");
    }

    let orders = await getAllOrderDetails();
    const searchTerm = search?.trim().toLowerCase();

    if (searchTerm) {
      orders = orders.filter((order) =>
        [
          order.orderNumber,
          order.customer?.name,
          order.customer?.contactNumber,
          order.customer?.email,
        ].some((value) => value?.toLowerCase().includes(searchTerm)),
      );
    }

    if (status !== undefined) {
      orders = orders.filter((order) => order.status === status);
    }

    if (parsedStartDate) {
      orders = orders.filter(
        (order) => new Date(order.orderDate) >= parsedStartDate,
      );
    }

    if (parsedEndDate) {
      orders = orders.filter(
        (order) => new Date(order.orderDate) <= parsedEndDate,
      );
    }

    if (parsedMinTotal !== null) {
      orders = orders.filter((order) => order.grandTotal >= parsedMinTotal);
    }

    if (parsedMaxTotal !== null) {
      orders = orders.filter((order) => order.grandTotal <= parsedMaxTotal);
    }

    const selectedSort = sort || "newest";
    const sorters = {
      newest: (a, b) => new Date(b.orderDate) - new Date(a.orderDate),
      oldest: (a, b) => new Date(a.orderDate) - new Date(b.orderDate),
      highestTotal: (a, b) => b.grandTotal - a.grandTotal,
      lowestTotal: (a, b) => a.grandTotal - b.grandTotal,
    };
    orders.sort(sorters[selectedSort]);

    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "Order");

    const order = await getOrderDetailsById(req.params.id);

    if (!order) {
      throw createHttpError(404, "Order not found");
    }

    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

const previewOrderCalculation = async (req, res, next) => {
  try {
    ensureObjectBody(req.body);
    rejectServerControlledFields(req.body);

    const calculation = await calculateOrder({
      items: req.body.items,
      promotionCode: req.body.promotionCode,
      additionalCharge: req.body.additionalCharge,
      orderDate: new Date(),
    });

    res.status(200).json(toCalculationResponse(calculation));
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req, res, next) => {
  let session;

  try {
    ensureObjectBody(req.body);
    rejectServerControlledFields(req.body);

    session = await mongoose.startSession();
    let createdOrderId;

    await session.withTransaction(async () => {
      await ensureCustomerExists(req.body.customerId, session);

      const calculation = await calculateOrder({
        items: req.body.items,
        promotionCode: req.body.promotionCode,
        additionalCharge: req.body.additionalCharge,
        orderDate: hasOwn(req.body, "orderDate")
          ? req.body.orderDate
          : new Date(),
        session,
      });
      const orderNumber = await generateOrderNumber(session);
      const [order] = await Order.create(
        [
          {
            orderNumber,
            customerId: req.body.customerId,
            status: "Pending",
            orderDate: calculation.orderDate,
            expectedCompletionDate: calculation.expectedCompletionDate,
            promotionId: calculation.promotion?._id,
            additionalCharge: calculation.additionalCharge,
            notes: req.body.notes,
          },
        ],
        { session },
      );

      await OrderItem.insertMany(
        createOrderItemData(order._id, calculation.items),
        { session },
      );
      createdOrderId = order._id;
    });

    const createdOrder = await getOrderDetailsById(createdOrderId);
    res.status(201).json(createdOrder);
  } catch (error) {
    next(error);
  } finally {
    if (session) await session.endSession();
  }
};

const updateOrder = async (req, res, next) => {
  let session;

  try {
    ensureValidObjectId(req.params.id, "Order");
    ensureObjectBody(req.body);
    rejectServerControlledFields(req.body);

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const order = await Order.findById(req.params.id).session(session);

      if (!order) {
        throw createHttpError(404, "Order not found");
      }

      if (hasOwn(req.body, "customerId")) {
        await ensureCustomerExists(req.body.customerId, session);
        order.customerId = req.body.customerId;
      }

      if (hasOwn(req.body, "notes")) {
        order.notes = req.body.notes;
      }

      const requiresRecalculation = [
        "items",
        "promotionCode",
        "additionalCharge",
        "orderDate",
      ].some((field) => hasOwn(req.body, field));

      if (requiresRecalculation) {
        let items = req.body.items;

        if (!hasOwn(req.body, "items")) {
          const existingItems = await OrderItem.find({ orderId: order._id })
            .session(session)
            .lean();
          items = existingItems.map((item) => ({
            serviceId: item.serviceId,
            quantity: item.quantity,
          }));
        }

        let promotionCode = req.body.promotionCode;

        if (!hasOwn(req.body, "promotionCode") && order.promotionId) {
          const existingPromotion = await Promotion.findById(
            order.promotionId,
          ).session(session);
          promotionCode = existingPromotion?.code;
        }

        const calculation = await calculateOrder({
          items,
          promotionCode,
          additionalCharge: hasOwn(req.body, "additionalCharge")
            ? req.body.additionalCharge
            : order.additionalCharge,
          orderDate: hasOwn(req.body, "orderDate")
            ? req.body.orderDate
            : order.orderDate,
          session,
        });

        order.orderDate = calculation.orderDate;
        order.expectedCompletionDate = calculation.expectedCompletionDate;
        order.promotionId = calculation.promotion?._id;
        order.additionalCharge = calculation.additionalCharge;

        await OrderItem.deleteMany({ orderId: order._id }).session(session);
        await OrderItem.insertMany(
          createOrderItemData(order._id, calculation.items),
          { session },
        );
      }

      await order.save({ session });
    });

    const updatedOrder = await getOrderDetailsById(req.params.id);
    res.status(200).json(updatedOrder);
  } catch (error) {
    next(error);
  } finally {
    if (session) await session.endSession();
  }
};

const deleteOrder = async (req, res, next) => {
  let session;

  try {
    ensureValidObjectId(req.params.id, "Order");
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const order = await Order.findById(req.params.id).session(session);

      if (!order) {
        throw createHttpError(404, "Order not found");
      }

      await OrderItem.deleteMany({ orderId: order._id }).session(session);
      await Order.deleteOne({ _id: order._id }).session(session);
    });

    res.status(200).json({
      message: "Order and associated order items deleted successfully",
    });
  } catch (error) {
    next(error);
  } finally {
    if (session) await session.endSession();
  }
};

module.exports = {
  getOrders,
  getOrderById,
  previewOrderCalculation,
  createOrder,
  updateOrder,
  deleteOrder,
};
