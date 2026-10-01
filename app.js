const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.status(200).json({ message: "Laundry Republic API is running" });
});

// Business API routes will be mounted here as they are implemented.

module.exports = app;
