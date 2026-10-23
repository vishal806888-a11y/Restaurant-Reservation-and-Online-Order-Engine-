
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import mongoose from "mongoose";

dotenv.config();

async function testConnections() {
  let mysqlConnection;

  try {
    console.log("Testing MySQL connection...");

    mysqlConnection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "restaurant_db",
      port: Number(process.env.DB_PORT || 3306),
    });

    await mysqlConnection.query("SELECT 1");
    console.log("MySQL connection: SUCCESS");

    console.log("Testing MongoDB Atlas connection...");

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Atlas connection: SUCCESS");
    console.log("Connected database:", mongoose.connection.name);
  } catch (error) {
    // Do not print connection strings or credentials.
    console.error("Connection test failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end().catch(() => {});
    }

    await mongoose.disconnect().catch(() => {});
  }
}

testConnections();
