//require("dotenv").config();
import dotenv from "dotenv";
import express from "express";
import { connectDB } from "./db/index.js";

dotenv.config({
  path: "../.env",
});

const app = express();

// middleware
app.use(express.json());

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server running on port ${process.env.PORT || 8000}`);
    });
  })
  .catch((error) => {
    console.log("Database connection failed:", error);
    process.exit(1);
  });









