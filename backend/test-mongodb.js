import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

try {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("SUCCESS: Connected to MongoDB Atlas");
    console.log("Database:", mongoose.connection.name);
} catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exitCode = 1;
} finally {
    await mongoose.disconnect();
}