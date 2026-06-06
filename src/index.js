import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import { connectDB } from "./db/index.js";
import { app } from "./app.js";


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