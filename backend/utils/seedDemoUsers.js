import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
dotenv.config();

const run = async () => {
  try {
    const adminHash = await bcrypt.hash("Admin@123", 10);
    const customerHash = await bcrypt.hash("Customer@123", 10);

    await pool.query(`
      INSERT INTO users (name,email,phone,password,role)
      VALUES ('Restaurant Admin','admin@restaurant.com','9876543210',?,'STAFF')
      ON DUPLICATE KEY UPDATE password=VALUES(password),role='STAFF'`, [adminHash]);

    await pool.query(`
      INSERT INTO users (name,email,phone,password,role)
      VALUES ('Demo Customer','customer@example.com','9876543211',?,'CUSTOMER')
      ON DUPLICATE KEY UPDATE password=VALUES(password),role='CUSTOMER'`, [customerHash]);

    console.log("Demo accounts created.");
  } finally {
    await pool.end();
  }
};
run().catch(err => { console.error(err); process.exit(1); });
