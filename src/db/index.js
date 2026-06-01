import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";



export const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${connectionInstance.connection.host}`);
    return connectionInstance;
  } catch (error) {
    console.log("MongoDB connection error:", error);
    process.exit(1);
  }
};
