
import dotenv from "dotenv";
import mongoose from "mongoose";
import mysql from "mysql2/promise";

import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js";
import Category from "../models/Category.js";
import RestaurantTable from "../models/RestaurantTable.js";
import MenuItem from "../models/MenuItem.js";
import Reservation from "../models/Reservation.js";
import Order from "../models/Order.js";

dotenv.config();

const mysqlConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "restaurant_db",
  port: Number(process.env.DB_PORT || 3306),
};

const collections = [
  "users",
  "restaurants",
  "categories",
  "restaurantTables",
  "menuItems",
  "reservations",
  "orders",
];

function parseSeats(value, reservationId) {
  if (value == null || String(value).trim() === "") {
    return [];
  }

  const seats = String(value).split(",").map((part) => {
    const seat = part.trim();

    if (!/^\d+$/.test(seat) || Number(seat) < 1) {
      throw new Error(
        `Invalid seat data for reservation ${reservationId}: ${value}`
      );
    }

    return Number(seat);
  });

  if (new Set(seats).size !== seats.length) {
    throw new Error(
      `Duplicate seats in reservation ${reservationId}: ${value}`
    );
  }

  return seats;
}

function validDate(value) {
  if (!value) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

function dateOnly(value) {
  if (value instanceof Date) {
    return [
      value.getUTCFullYear(),
      String(value.getUTCMonth() + 1).padStart(2, "0"),
      String(value.getUTCDate()).padStart(2, "0"),
    ].join("-");
  }

  return String(value).slice(0, 10);
}

function timeOnly(value) {
  if (value instanceof Date) {
    return [
      String(value.getUTCHours()).padStart(2, "0"),
      String(value.getUTCMinutes()).padStart(2, "0"),
      String(value.getUTCSeconds()).padStart(2, "0"),
    ].join(":");
  }

  return String(value ?? "");
}

async function migrate() {
  let connection;
  let mongoConnected = false;

  // Record only the documents created by this execution.
  const inserted = new Map(
    collections.map((name) => [name, []])
  );

  async function createTracked(Model, collection, data) {
    const document = await Model.create(data);
    inserted.get(collection).push(document._id);
    return document;
  }

  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing from backend/.env"
      );
    }

    console.log("Connecting to MySQL...");
    connection = await mysql.createConnection(mysqlConfig);

    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGODB_URI);
    mongoConnected = true;

    const db = mongoose.connection.db;

    console.log(`MongoDB database: ${db.databaseName}`);

    // Never mix this import with existing destination data.
    for (const name of collections) {
      const count = await db.collection(name).countDocuments();

      if (count > 0) {
        throw new Error(
          `Collection "${name}" already contains ${count} documents. ` +
          "Migration stopped. Inspect the collection before continuing."
        );
      }
    }

    // Read all MySQL tables.
    const [users] = await connection.query(
      "SELECT * FROM users ORDER BY id"
    );

    const [restaurants] = await connection.query(
      "SELECT * FROM restaurants ORDER BY id"
    );

    const [categories] = await connection.query(
      "SELECT * FROM categories ORDER BY id"
    );

    const [tables] = await connection.query(
      "SELECT * FROM restaurant_tables ORDER BY id"
    );

    const [menuItems] = await connection.query(
      "SELECT * FROM menu_items ORDER BY id"
    );

    const [reservations] = await connection.query(
      "SELECT * FROM reservations ORDER BY id"
    );

    const [orders] = await connection.query(
      "SELECT * FROM orders ORDER BY id"
    );

    const [orderItems] = await connection.query(
      "SELECT * FROM order_items ORDER BY id"
    );

    const sourceCounts = {
      users: users.length,
      restaurants: restaurants.length,
      categories: categories.length,
      restaurant_tables: tables.length,
      menu_items: menuItems.length,
      reservations: reservations.length,
      orders: orders.length,
      order_items: orderItems.length,
    };

    console.log("\nMySQL source counts:");
    console.table(sourceCounts);

    // Map old integer IDs to MongoDB ObjectIds.
    const userMap = new Map();
    const restaurantMap = new Map();
    const categoryMap = new Map();
    const tableMap = new Map();
    const menuMap = new Map();
    const reservationMap = new Map();

    // 1. Users. Existing password hashes are preserved.
    for (const row of users) {
      const createdAt = validDate(row.created_at);

      const doc = await createTracked(User, "users", {
        name: row.name,
        email: row.email,
        phone: row.phone,
        password: row.password,
        role: row.role,
        legacyId: Number(row.id),
        ...(createdAt ? { created_at: createdAt } : {}),
      });

      userMap.set(Number(row.id), doc._id);
    }

    // 2. Restaurants.
    for (const row of restaurants) {
      const doc = await createTracked(
        Restaurant,
        "restaurants",
        {
          name: row.name,
          description: row.description ?? "",
          address: row.address ?? "",
          phone: row.phone ?? null,
          legacyId: Number(row.id),
        }
      );

      restaurantMap.set(Number(row.id), doc._id);
    }

    // 3. Categories.
    for (const row of categories) {
      const doc = await createTracked(
        Category,
        "categories",
        {
          name: row.name,
          legacyId: Number(row.id),
        }
      );

      categoryMap.set(Number(row.id), doc._id);
    }

    // 4. Restaurant tables.
    for (const row of tables) {
      const restaurantId = restaurantMap.get(
        Number(row.restaurant_id)
      );

      if (!restaurantId) {
        throw new Error(
          `Restaurant missing for table ID ${row.id}`
        );
      }

      const doc = await createTracked(
        RestaurantTable,
        "restaurantTables",
        {
          restaurant_id: restaurantId,
          table_number: Number(row.table_number),
          capacity: Number(row.capacity),
          status: row.status || "AVAILABLE",
          legacyId: Number(row.id),
          legacyRestaurantId: Number(row.restaurant_id),
        }
      );

      tableMap.set(Number(row.id), doc._id);
    }

    // 5. Menu items.
    for (const row of menuItems) {
      const categoryId = categoryMap.get(
        Number(row.category_id)
      );

      if (!categoryId) {
        throw new Error(
          `Category missing for menu item ID ${row.id}`
        );
      }

      const doc = await createTracked(
        MenuItem,
        "menuItems",
        {
          category_id: categoryId,
          name: row.name,
          description: row.description ?? "",
          price: Number(row.price),
          image: row.image ?? "",
          available:
            row.available == null
              ? true
              : Number(row.available) === 1,
          legacyId: Number(row.id),
          legacyCategoryId: Number(row.category_id),
        }
      );

      menuMap.set(Number(row.id), doc._id);
    }

    // 6. Reservations.
    for (const row of reservations) {
      const userId = userMap.get(Number(row.user_id));
      const restaurantId = restaurantMap.get(
        Number(row.restaurant_id)
      );
      const tableId = tableMap.get(Number(row.table_id));

      if (!userId || !restaurantId || !tableId) {
        throw new Error(
          `Missing related record for reservation ID ${row.id}`
        );
      }

      const createdAt = validDate(row.created_at);

      const doc = await createTracked(
        Reservation,
        "reservations",
        {
          user_id: userId,
          restaurant_id: restaurantId,
          table_id: tableId,
          customer_name: row.customer_name || "Customer",
          selected_seats: parseSeats(
            row.selected_seats,
            row.id
          ),
          reservation_date: dateOnly(row.reservation_date),
          reservation_time: timeOnly(row.reservation_time),
          guests: Number(row.guests),
          status: row.status || "PENDING",
          legacyId: Number(row.id),
          legacyUserId: Number(row.user_id),
          legacyRestaurantId: Number(row.restaurant_id),
          legacyTableId: Number(row.table_id),
          ...(createdAt ? { created_at: createdAt } : {}),
        }
      );

      reservationMap.set(Number(row.id), doc._id);
    }

    // Group order_items by their original order ID.
    const itemsByOrder = new Map();

    for (const item of orderItems) {
      const orderId = Number(item.order_id);

      if (!itemsByOrder.has(orderId)) {
        itemsByOrder.set(orderId, []);
      }

      itemsByOrder.get(orderId).push(item);
    }

    const usersById = new Map(
      users.map((row) => [Number(row.id), row])
    );

    const menuById = new Map(
      menuItems.map((row) => [Number(row.id), row])
    );

    // 7. Orders with embedded order items.
    for (const row of orders) {
      const userId = userMap.get(Number(row.user_id));
      const restaurantId = restaurantMap.get(
        Number(row.restaurant_id)
      );

      if (!userId || !restaurantId) {
        throw new Error(
          `Missing related record for order ID ${row.id}`
        );
      }

      const oldUser = usersById.get(Number(row.user_id));

      const oldItems =
        itemsByOrder.get(Number(row.id)) || [];

      const embeddedItems = oldItems.map((item) => {
        const oldMenuItem = menuById.get(
          Number(item.menu_item_id)
        );

        return {
          menu_item_id:
            menuMap.get(Number(item.menu_item_id)) || null,
          item_name:
            oldMenuItem?.name ||
            `Legacy menu item ${item.menu_item_id}`,
          quantity: Number(item.quantity),
          price: Number(item.price),
          subtotal: Number(item.subtotal),
          legacyMenuItemId: Number(item.menu_item_id),
        };
      });

      let reservationId = null;

      if (row.reservation_id != null) {
        reservationId =
          reservationMap.get(Number(row.reservation_id)) || null;
      }

      const createdAt = validDate(row.created_at);

      await createTracked(Order, "orders", {
        user_id: userId,
        restaurant_id: restaurantId,
        reservation_id: reservationId,
        customer_name:
          row.customer_name || oldUser?.name || "Customer",
        customer_email:
          row.customer_email || oldUser?.email || null,
        items: embeddedItems,
        total_amount: Number(row.total_amount),
        status: row.status || "PENDING",
        legacyId: Number(row.id),
        legacyUserId: Number(row.user_id),
        legacyRestaurantId: Number(row.restaurant_id),
        legacyReservationId:
          row.reservation_id == null
            ? null
            : Number(row.reservation_id),
        ...(createdAt ? { created_at: createdAt } : {}),
      });
    }

    // Verify all seven MongoDB collection counts.
    const expectedCounts = {
      users: users.length,
      restaurants: restaurants.length,
      categories: categories.length,
      restaurantTables: tables.length,
      menuItems: menuItems.length,
      reservations: reservations.length,
      orders: orders.length,
    };

    console.log("\nVerifying MongoDB counts:");

    for (const [name, expected] of Object.entries(expectedCounts)) {
      const actual = await db.collection(name).countDocuments();

      console.log(`${name}: expected ${expected}, found ${actual}`);

      if (actual !== expected) {
        throw new Error(
          `Count mismatch in ${name}: expected ${expected}, found ${actual}`
        );
      }
    }

    // Verify embedded order items.
    const itemResult = await Order.aggregate([
      { $unwind: "$items" },
      { $count: "total" },
    ]);

    const embeddedCount = itemResult[0]?.total || 0;

    console.log(
      `Embedded order items: expected ${orderItems.length}, found ${embeddedCount}`
    );

    if (embeddedCount !== orderItems.length) {
      throw new Error(
        `Order item count mismatch: expected ${orderItems.length}, found ${embeddedCount}`
      );
    }

    console.log("\nMigration completed and count checks passed.");
    console.log(
      "Keep MySQL and your SQL backup until the application is fully tested."
    );
  } catch (error) {
    console.error("\nMigration stopped:", error.message);

    if (mongoConnected) {
      const hasInserted = [...inserted.values()].some(
        (ids) => ids.length > 0
      );

      if (hasInserted) {
        console.log(
          "Attempting to remove only documents created during this run..."
        );

        for (const [name, ids] of inserted.entries()) {
          if (ids.length === 0) continue;

          try {
            const result = await mongoose.connection.db
              .collection(name)
              .deleteMany({ _id: { $in: ids } });

            console.log(
              `${name}: rolled back ${result.deletedCount} documents`
            );
          } catch (rollbackError) {
            console.error(
              `Rollback failed for ${name}: ${rollbackError.message}`
            );
          }
        }
      } else {
        console.log("No documents were created by this run.");
      }
    }

    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end().catch(() => {});
    }

    if (mongoConnected) {
      await mongoose.disconnect().catch(() => {});
    }
  }
}

migrate();
