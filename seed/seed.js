require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Customer = require("../models/Customer");
const Service = require("../models/Service");
const Promotion = require("../models/Promotion");
const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");

const customers = [
  {
    name: "Maria Santos",
    contactNumber: "09171234501",
    email: "maria.santos@example.com",
    address: "Quezon City, Metro Manila",
  },
  {
    name: "Carlo Reyes",
    contactNumber: "09181234502",
    email: "carlo.reyes@example.com",
    address: "Makati City, Metro Manila",
  },
  {
    name: "Angela Dela Cruz",
    contactNumber: "09191234503",
    email: "angela.delacruz@example.com",
    address: "Pasig City, Metro Manila",
  },
  {
    name: "Miguel Bautista",
    contactNumber: "09201234504",
    email: "miguel.bautista@example.com",
    address: "Mandaluyong City, Metro Manila",
  },
  {
    name: "Sofia Garcia",
    contactNumber: "09211234505",
    email: "sofia.garcia@example.com",
    address: "Taguig City, Metro Manila",
  },
  {
    name: "Paolo Mendoza",
    contactNumber: "09221234506",
    email: "paolo.mendoza@example.com",
    address: "Marikina City, Metro Manila",
  },
  {
    name: "Nina Flores",
    contactNumber: "09231234507",
    email: "nina.flores@example.com",
    address: "San Juan City, Metro Manila",
  },
  {
    name: "Gabriel Ramos",
    contactNumber: "09241234508",
    email: "gabriel.ramos@example.com",
    address: "Manila, Metro Manila",
  },
  {
    name: "Leah Navarro",
    contactNumber: "09251234509",
    email: "leah.navarro@example.com",
    address: "Paranaque City, Metro Manila",
  },
  {
    name: "Daniel Aquino",
    contactNumber: "09261234510",
    email: "daniel.aquino@example.com",
    address: "Las Pinas City, Metro Manila",
  },
];

const services = [
  {
    name: "Wash Only",
    description: "Machine washing for everyday clothes, priced by weight.",
    price: 35,
    pricingType: "perKg",
    turnaroundDays: 1,
    isActive: true,
  },
  {
    name: "Dry Only",
    description: "Machine drying for freshly washed laundry, priced by weight.",
    price: 30,
    pricingType: "perKg",
    turnaroundDays: 1,
    isActive: true,
  },
  {
    name: "Wash & Dry",
    description: "Combined machine wash and dry service for regular laundry.",
    price: 55,
    pricingType: "perKg",
    turnaroundDays: 2,
    isActive: true,
  },
  {
    name: "Wash, Dry & Fold",
    description: "Complete wash, dry, and neatly folded laundry service.",
    price: 70,
    pricingType: "perKg",
    turnaroundDays: 2,
    isActive: true,
  },
  {
    name: "Comforter Cleaning",
    description: "Deep cleaning for comforters and other bulky bedding.",
    price: 180,
    pricingType: "perPiece",
    turnaroundDays: 3,
    isActive: true,
  },
  {
    name: "Shoe Cleaning",
    description: "Detailed exterior and interior cleaning for one pair of shoes.",
    price: 150,
    pricingType: "perPair",
    turnaroundDays: 4,
    isActive: true,
  },
  {
    name: "Ironing",
    description: "Careful pressing and ironing for individual garments.",
    price: 25,
    pricingType: "perPiece",
    turnaroundDays: 1,
    isActive: true,
  },
];

const createBaseDate = () => {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  return date;
};

const shiftDays = (date, days) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const buildPromotions = (baseDate) => [
  {
    code: "WELCOME5",
    description: "Five percent off qualifying first-time laundry orders.",
    discountPercentage: 5,
    minimumAmount: 300,
    startDate: shiftDays(baseDate, -365),
    endDate: shiftDays(baseDate, 365),
    isActive: true,
  },
  {
    code: "CLEAN10",
    description: "Ten percent off laundry orders worth at least 700 pesos.",
    discountPercentage: 10,
    minimumAmount: 700,
    startDate: shiftDays(baseDate, -180),
    endDate: shiftDays(baseDate, 180),
    isActive: true,
  },
  {
    code: "FRESH15",
    description: "Expired seasonal promotion retained for validation testing.",
    discountPercentage: 15,
    minimumAmount: 500,
    startDate: shiftDays(baseDate, -240),
    endDate: shiftDays(baseDate, -30),
    isActive: true,
  },
  {
    code: "VIP20",
    description: "Inactive promotional offer retained for validation testing.",
    discountPercentage: 20,
    minimumAmount: 1000,
    startDate: shiftDays(baseDate, -30),
    endDate: shiftDays(baseDate, 180),
    isActive: false,
  },
];

const orderTemplates = [
  {
    customerIndex: 0,
    status: "Pending",
    daysAgo: 0,
    promotionCode: "WELCOME5",
    additionalCharge: 0,
    notes: "Use fragrance-free detergent.",
    items: [{ serviceName: "Wash, Dry & Fold", quantity: 5 }],
  },
  {
    customerIndex: 1,
    status: "Pending",
    daysAgo: 1,
    promotionCode: "WELCOME5",
    additionalCharge: 0,
    notes: "Handle the comforters with care.",
    items: [{ serviceName: "Comforter Cleaning", quantity: 2 }],
  },
  {
    customerIndex: 2,
    status: "Pending",
    daysAgo: 0,
    promotionCode: "WELCOME5",
    additionalCharge: 50,
    items: [{ serviceName: "Shoe Cleaning", quantity: 2 }],
  },
  {
    customerIndex: 3,
    status: "Pending",
    daysAgo: 2,
    additionalCharge: 0,
    items: [{ serviceName: "Wash Only", quantity: 8 }],
  },
  {
    customerIndex: 4,
    status: "Washing",
    daysAgo: 1,
    promotionCode: "WELCOME5",
    additionalCharge: 0,
    items: [{ serviceName: "Wash & Dry", quantity: 7 }],
  },
  {
    customerIndex: 5,
    status: "Washing",
    daysAgo: 2,
    promotionCode: "CLEAN10",
    additionalCharge: 0,
    items: [{ serviceName: "Wash, Dry & Fold", quantity: 10 }],
  },
  {
    customerIndex: 6,
    status: "Washing",
    daysAgo: 3,
    promotionCode: "WELCOME5",
    additionalCharge: 0,
    items: [
      { serviceName: "Comforter Cleaning", quantity: 1 },
      { serviceName: "Wash & Dry", quantity: 4 },
    ],
  },
  {
    customerIndex: 7,
    status: "Drying",
    daysAgo: 2,
    promotionCode: "CLEAN10",
    additionalCharge: 50,
    items: [{ serviceName: "Wash & Dry", quantity: 12 }],
  },
  {
    customerIndex: 8,
    status: "Drying",
    daysAgo: 4,
    promotionCode: "CLEAN10",
    additionalCharge: 30,
    items: [
      { serviceName: "Wash, Dry & Fold", quantity: 6 },
      { serviceName: "Ironing", quantity: 10 },
    ],
  },
  {
    customerIndex: 9,
    status: "Drying",
    daysAgo: 1,
    promotionCode: "WELCOME5",
    additionalCharge: 0,
    items: [
      { serviceName: "Wash Only", quantity: 5 },
      { serviceName: "Dry Only", quantity: 5 },
    ],
  },
  {
    customerIndex: 0,
    status: "Ready for Pickup",
    daysAgo: 3,
    promotionCode: "CLEAN10",
    additionalCharge: 0,
    items: [
      { serviceName: "Comforter Cleaning", quantity: 3 },
      { serviceName: "Shoe Cleaning", quantity: 2 },
    ],
  },
  {
    customerIndex: 1,
    status: "Ready for Pickup",
    daysAgo: 5,
    promotionCode: "CLEAN10",
    additionalCharge: 0,
    items: [
      { serviceName: "Wash, Dry & Fold", quantity: 8 },
      { serviceName: "Ironing", quantity: 6 },
    ],
  },
  {
    customerIndex: 2,
    status: "Ready for Pickup",
    daysAgo: 2,
    promotionCode: "WELCOME5",
    additionalCharge: 0,
    items: [{ serviceName: "Wash & Dry", quantity: 6 }],
  },
  {
    customerIndex: 3,
    status: "Completed",
    daysAgo: 7,
    promotionCode: "WELCOME5",
    additionalCharge: 0,
    items: [{ serviceName: "Wash Only", quantity: 10 }],
  },
  {
    customerIndex: 4,
    status: "Completed",
    daysAgo: 12,
    promotionCode: "CLEAN10",
    additionalCharge: 0,
    items: [{ serviceName: "Wash, Dry & Fold", quantity: 15 }],
  },
  {
    customerIndex: 5,
    status: "Completed",
    daysAgo: 20,
    promotionCode: "CLEAN10",
    additionalCharge: 0,
    items: [{ serviceName: "Comforter Cleaning", quantity: 4 }],
  },
  {
    customerIndex: 6,
    status: "Completed",
    daysAgo: 30,
    additionalCharge: 0,
    items: [{ serviceName: "Wash & Dry", quantity: 8 }],
  },
  {
    customerIndex: 7,
    status: "Completed",
    daysAgo: 6,
    promotionCode: "WELCOME5",
    additionalCharge: 0,
    notes: "Customer requested careful cleaning of white shoes.",
    items: [{ serviceName: "Shoe Cleaning", quantity: 3 }],
  },
  {
    customerIndex: 8,
    status: "Cancelled",
    daysAgo: 4,
    additionalCharge: 0,
    notes: "Cancelled before washing began.",
    items: [{ serviceName: "Wash, Dry & Fold", quantity: 4 }],
  },
  {
    customerIndex: 9,
    status: "Cancelled",
    daysAgo: 15,
    promotionCode: "WELCOME5",
    additionalCharge: 0,
    notes: "Customer collected the items before processing.",
    items: [
      { serviceName: "Comforter Cleaning", quantity: 1 },
      { serviceName: "Shoe Cleaning", quantity: 1 },
    ],
  },
];

const clearCollections = async () => {
  await OrderItem.deleteMany({});
  await Order.deleteMany({});
  await Promotion.deleteMany({});
  await Service.deleteMany({});
  await Customer.deleteMany({});
};

const seedDatabase = async () => {
  try {
    console.warn(
      "WARNING: Seeding replaces existing development data in the five Laundry Republic collections.",
    );

    await connectDB();
    await clearCollections();

    const baseDate = createBaseDate();
    const customerDocuments = await Customer.insertMany(customers);
    const serviceDocuments = await Service.insertMany(services);
    const promotionDocuments = await Promotion.insertMany(
      buildPromotions(baseDate),
    );

    const serviceByName = new Map(
      serviceDocuments.map((service) => [service.name, service]),
    );
    const promotionByCode = new Map(
      promotionDocuments.map((promotion) => [promotion.code, promotion]),
    );

    const orderData = orderTemplates.map((template, index) => {
      const orderDate = shiftDays(baseDate, -template.daysAgo);
      const turnaroundDays = Math.max(
        ...template.items.map(
          (item) => serviceByName.get(item.serviceName).turnaroundDays,
        ),
      );

      return {
        orderNumber: `LR-${String(index + 1).padStart(4, "0")}`,
        customerId: customerDocuments[template.customerIndex]._id,
        status: template.status,
        orderDate,
        expectedCompletionDate: shiftDays(orderDate, turnaroundDays),
        promotionId: template.promotionCode
          ? promotionByCode.get(template.promotionCode)._id
          : undefined,
        additionalCharge: template.additionalCharge,
        notes: template.notes,
      };
    });

    const orderDocuments = await Order.insertMany(orderData);
    const orderItemData = orderTemplates.flatMap((template, orderIndex) =>
      template.items.map((item) => {
        const service = serviceByName.get(item.serviceName);

        return {
          orderId: orderDocuments[orderIndex]._id,
          serviceId: service._id,
          quantity: item.quantity,
          priceAtOrder: service.price,
        };
      }),
    );
    const orderItemDocuments = await OrderItem.insertMany(orderItemData);

    console.log("Seed completed successfully.");
    console.log(`Customers inserted: ${customerDocuments.length}`);
    console.log(`Services inserted: ${serviceDocuments.length}`);
    console.log(`Promotions inserted: ${promotionDocuments.length}`);
    console.log(`Orders inserted: ${orderDocuments.length}`);
    console.log(`Order items inserted: ${orderItemDocuments.length}`);
  } catch (error) {
    console.error(`Seed failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedDatabase();
