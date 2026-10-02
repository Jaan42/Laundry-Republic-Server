const express = require("express");
const cors = require("cors");
const customerRoutes = require("./routes/customerRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const promotionRoutes = require("./routes/promotionRoutes");
const orderRoutes = require("./routes/orderRoutes");
const requestLogger = require("./middleware/requestLogger");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(express.json());
app.use(cors());
app.use(requestLogger);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Laundry Republic API is running" });
});

app.use("/api/customers", customerRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/orders", orderRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use(errorHandler);

module.exports = app;
