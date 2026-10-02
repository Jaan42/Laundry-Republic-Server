const Customer = require("../models/Customer");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const {
  createHttpError,
  ensureValidObjectId,
  ensureObjectBody,
  parseDateFilter,
} = require("./controllerHelpers");
const {
  getOrderDetailsById,
  getAllOrderDetails,
} = require("../services/orderPresentationService");
const { roundCurrency } = require("../services/orderCalculationService");

const allowedTransitions = {
  Pending: ["Washing", "Cancelled"],
  Washing: ["Drying"],
  Drying: ["Ready for Pickup"],
  "Ready for Pickup": ["Completed"],
  Completed: [],
  Cancelled: [],
};

const updateOrderStatus = async (req, res, next) => {
  try {
    ensureValidObjectId(req.params.id, "Order");
    ensureObjectBody(req.body);

    const { status } = req.body;

    if (typeof status !== "string") {
      throw createHttpError(400, "status is required");
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      throw createHttpError(404, "Order not found");
    }

    const nextStatuses = allowedTransitions[order.status] || [];

    if (!nextStatuses.includes(status)) {
      throw createHttpError(400, "Invalid order status transition");
    }

    order.status = status;
    await order.save();

    const updatedOrder = await getOrderDetailsById(order._id);
    res.status(200).json(updatedOrder);
  } catch (error) {
    next(error);
  }
};

const getOrderStatistics = async (req, res, next) => {
  try {
    const [orders, totalCustomers] = await Promise.all([
      getAllOrderDetails(),
      Customer.countDocuments(),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const totalValue = orders.reduce(
      (total, order) => total + order.grandTotal,
      0,
    );

    res.status(200).json({
      totalOrders: orders.length,
      todayOrders: orders.filter(
        (order) => new Date(order.orderDate).toISOString().slice(0, 10) === today,
      ).length,
      pendingOrders: orders.filter((order) => order.status === "Pending")
        .length,
      inProgressOrders: orders.filter((order) =>
        ["Washing", "Drying"].includes(order.status),
      ).length,
      readyForPickup: orders.filter(
        (order) => order.status === "Ready for Pickup",
      ).length,
      completedOrders: orders.filter((order) => order.status === "Completed")
        .length,
      overdueOrders: orders.filter((order) => order.dueStatus === "Overdue")
        .length,
      totalCustomers,
      averageOrderValue:
        orders.length === 0 ? 0 : roundCurrency(totalValue / orders.length),
    });
  } catch (error) {
    next(error);
  }
};

const summarizeRevenueOrder = (order) => ({
  _id: order._id,
  orderNumber: order.orderNumber,
  customer: order.customer
    ? {
        _id: order.customer._id,
        name: order.customer.name,
      }
    : null,
  orderDate: order.orderDate,
  grandTotal: order.grandTotal,
});

const getRevenueSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const parsedStartDate =
      startDate === undefined
        ? null
        : parseDateFilter(startDate, "startDate");
    const parsedEndDate =
      endDate === undefined
        ? null
        : parseDateFilter(endDate, "endDate", true);

    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
      throw createHttpError(400, "startDate cannot be after endDate");
    }

    let orders = await getAllOrderDetails();

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

    const completedOrders = orders.filter(
      (order) => order.status === "Completed",
    );
    const totalRevenue = roundCurrency(
      completedOrders.reduce((total, order) => total + order.grandTotal, 0),
    );
    const sortedCompletedOrders = [...completedOrders].sort(
      (a, b) => a.grandTotal - b.grandTotal,
    );

    res.status(200).json({
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      totalRevenue,
      averageOrderValue:
        completedOrders.length === 0
          ? 0
          : roundCurrency(totalRevenue / completedOrders.length),
      highestOrder:
        completedOrders.length === 0
          ? null
          : summarizeRevenueOrder(
              sortedCompletedOrders[sortedCompletedOrders.length - 1],
            ),
      lowestOrder:
        completedOrders.length === 0
          ? null
          : summarizeRevenueOrder(sortedCompletedOrders[0]),
    });
  } catch (error) {
    next(error);
  }
};

const getPopularServices = async (req, res, next) => {
  try {
    const orderItems = await OrderItem.find().populate("serviceId").lean();
    const serviceTotals = new Map();

    orderItems.forEach((item) => {
      const service = item.serviceId;

      if (!service) {
        return;
      }

      const serviceId = String(service._id);
      const current = serviceTotals.get(serviceId) || {
        service: {
          _id: service._id,
          name: service.name,
          pricingType: service.pricingType,
        },
        orderIds: new Set(),
        totalQuantity: 0,
      };

      current.orderIds.add(String(item.orderId));
      current.totalQuantity += item.quantity;
      serviceTotals.set(serviceId, current);
    });

    const rankedServices = [...serviceTotals.values()]
      .map((entry) => ({
        service: entry.service,
        totalOrders: entry.orderIds.size,
        totalQuantity: entry.totalQuantity,
      }))
      .sort(
        (a, b) =>
          b.totalQuantity - a.totalQuantity ||
          b.totalOrders - a.totalOrders ||
          a.service.name.localeCompare(b.service.name),
      );

    res.status(200).json(rankedServices);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateOrderStatus,
  getOrderStatistics,
  getRevenueSummary,
  getPopularServices,
};
