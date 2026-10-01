const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing from the environment.");
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully.");
  } catch (error) {
    throw new Error(
      "Unable to connect to MongoDB. Verify MONGO_URI and MongoDB Atlas network access."
    );
  }
};

module.exports = connectDB;