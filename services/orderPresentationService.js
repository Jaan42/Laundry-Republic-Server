const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const {
  calculateStoredTotals,
  getDueStatus,
} = require("./orderCalculationService");

const buildOrderResponse = (order, orderItems) => {
  const customer = order.customerId || null;
  const promotion = order.promotionId || null;
  const totals = calculateStoredTotals({ order, orderItems, promotion });

  return {
    _id: order._id,
    orderNumber: order.orderNumber,
    customerId: customer?._id || null,
    customer,
    status: order.status,
    orderDate: order.orderDate,
    expectedCompletionDate: order.expectedCompletionDate,
    dueStatus: getDueStatus(order.status, order.expectedCompletionDate),
    promotionId: promotion?._id || null,
    promotion,
    items: totals.items.map((item) => {
      const service = item.serviceId || null;

      return {
        _id: item._id,
        serviceId: service?._id || null,
        service,
        quantity: item.quantity,
        priceAtOrder: item.priceAtOrder,
        lineTotal: item.lineTotal,
      };
    }),
    subtotal: totals.subtotal,
    additionalCharge: totals.additionalCharge,
    baseTotal: totals.baseTotal,
    discountPercentage: totals.discountPercentage,
    discountAmount: totals.discountAmount,
    grandTotal: totals.grandTotal,
    notes: order.notes,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

const getOrderDetailsById = async (id) => {
  const order = await Order.findById(id)
    .populate("customerId")
    .populate("promotionId")
    .lean();

  if (!order) {
    return null;
  }

  const orderItems = await OrderItem.find({ orderId: id })
    .populate("serviceId")
    .lean();

  return buildOrderResponse(order, orderItems);
};

const getAllOrderDetails = async () => {
  const orders = await Order.find()
    .populate("customerId")
    .populate("promotionId")
    .lean();
  const orderIds = orders.map((order) => order._id);
  const orderItems = await OrderItem.find({ orderId: { $in: orderIds } })
    .populate("serviceId")
    .lean();
  const itemsByOrder = new Map();

  orderItems.forEach((item) => {
    const orderId = String(item.orderId);
    const items = itemsByOrder.get(orderId) || [];
    items.push(item);
    itemsByOrder.set(orderId, items);
  });

  return orders.map((order) =>
    buildOrderResponse(order, itemsByOrder.get(String(order._id)) || []),
  );
};

module.exports = {
  getOrderDetailsById,
  getAllOrderDetails,
};
