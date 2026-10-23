
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import connectDB from "./config/db.js";
import User from "./models/User.js";
import Restaurant from "./models/Restaurant.js";
import Category from "./models/Category.js";
import RestaurantTable from "./models/RestaurantTable.js";
import MenuItem from "./models/MenuItem.js";
import Reservation from "./models/Reservation.js";
import Order from "./models/Order.js";
import passwordResetRouter from "./routes/passwordReset.js";

import {
    requireAuth,
    requireRole,
    requireStaff,
} from "./middleware/auth.js";

import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();

app.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
    })
);

app.use(express.json({ limit: "1mb" }));
app.use("/api/auth/password-reset", passwordResetRouter);

/* =========================================================
   ROLE DEFINITIONS
========================================================= */

const OWNER = "OWNER";
const MANAGER = "MANAGER";
const WORKER = "WORKER";
const CUSTOMER = "CUSTOMER";
const DELIVERY = "DELIVERY";

const MANAGEMENT_ROLES = [OWNER, MANAGER];
const STAFF_ROLES = [OWNER, MANAGER, WORKER, "STAFF"];
const DELIVERY_MANAGEMENT_ROLES = [OWNER, MANAGER];

const isManagement = (role) =>
    MANAGEMENT_ROLES.includes(role);

const isWorker = (role) =>
    role === WORKER || role === "STAFF";

/* =========================================================
   HELPERS
========================================================= */

const signToken = (user) =>
    jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        }
    );

const legacyId = (document) =>
    document ? document.legacyId : null;

const publicUser = (user) => ({
    id: legacyId(user),
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
});

const publicRestaurant = (restaurant) => ({
    id: legacyId(restaurant),
    name: restaurant.name,
    description: restaurant.description,
    address: restaurant.address,
    phone: restaurant.phone,
});

const publicCategory = (category) => ({
    id: legacyId(category),
    name: category.name,
});

const publicTable = (table) => ({
    id: legacyId(table),
    restaurant_id: table.legacyRestaurantId,
    table_number: table.table_number,
    capacity: table.capacity,
    status: table.status,
});

const publicMenuItem = (item, categoryName = null) => ({
    id: legacyId(item),
    category_id: item.legacyCategoryId,
    name: item.name,
    description: item.description,
    price: item.price,
    image: item.image,
    available: item.available,
    ...(categoryName !== null
        ? { category_name: categoryName }
        : {}),
});

const publicReservation = (reservation, table) => ({
    id: legacyId(reservation),
    user_id: reservation.legacyUserId,
    restaurant_id: reservation.legacyRestaurantId,
    table_id: reservation.legacyTableId,
    customer_name: reservation.customer_name,
    reservation_date: reservation.reservation_date,
    reservation_time: reservation.reservation_time,
    guests: reservation.guests,
    status: reservation.status,
    selected_seats: reservation.selected_seats || [],
    created_at: reservation.created_at,
    table_number: table?.table_number ?? null,
    capacity: table?.capacity ?? null,
});

const publicOrder = (order, restaurant, user = null) => {
    const items = (order.items || []).map((item) => ({
        menu_item_id: item.legacyMenuItemId ?? null,
        name: item.item_name,
        item_name: item.item_name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
    }));

    const subtotal = items.reduce(
        (sum, item) => sum + Number(item.subtotal || 0),
        0
    );

    const gstAmount = Math.round(subtotal * 5) / 100;
    const location = order.delivery_location;

    return {
        id: legacyId(order),
        user_id: order.legacyUserId,
        restaurant_id: order.legacyRestaurantId,
        reservation_id: order.legacyReservationId ?? null,

        customer_name:
            order.customer_name || user?.name || "Customer",

        customer_email:
            order.customer_email || user?.email || null,

        customer_phone: order.customer_phone ?? null,
        order_type: order.order_type ?? "DINE_IN",
        delivery_address: order.delivery_address ?? null,
        delivery_status: order.delivery_status ?? "NOT_APPLICABLE",
        delivery_person: order.delivery_person ?? null,

        delivery_location:
            location &&
            location.latitude != null &&
            location.longitude != null &&
            Number.isFinite(Number(location.latitude)) &&
            Number.isFinite(Number(location.longitude))
                ? {
                    latitude: Number(location.latitude),
                    longitude: Number(location.longitude),
                    updated_at: location.updated_at ?? null,
                }
                : null,

        payment_method: order.payment_method ?? "CASH",
        subtotal: Number(subtotal.toFixed(2)),
        gst_amount: Number(gstAmount.toFixed(2)),
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.created_at,

        restaurant_name: restaurant?.name ?? null,
        restaurant_address: restaurant?.address ?? null,
        restaurant_phone: restaurant?.phone ?? null,

        items,
    };
};

const parsePositiveId = (value) => {
    const id = Number(value);

    return Number.isSafeInteger(id) && id > 0
        ? id
        : null;
};

const parseDate = (value) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value);

const parseTime = (value) =>
    typeof value === "string" &&
    /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);

const timeKey = (value) =>
    String(value || "").slice(0, 5);

const isDuplicateKey = (error) =>
    error?.code === 11000;

const getRestaurant = async () =>
    Restaurant.findOne().sort({ legacyId: 1 });

const getTableByLegacyId = async (id) =>
    RestaurantTable.findOne({ legacyId: id });

const getUserByLegacyId = async (id) =>
    User.findOne({ legacyId: id });

const getReservationByLegacyId = async (id) =>
    Reservation.findOne({ legacyId: id });

const getOrderByLegacyId = async (id) =>
    Order.findOne({ legacyId: id });

const getNextLegacyId = async (Model) => {
    const highest = await Model.findOne({
        legacyId: { $type: "number" },
    })
        .sort({ legacyId: -1 })
        .select("legacyId")
        .lean();

    return (highest?.legacyId || 0) + 1;
};

const normalizeEmail = (value) =>
    typeof value === "string"
        ? value.trim().toLowerCase()
        : "";

const isValidEmail = (value) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const normalizeDeliveryAddress = (address) => {
    if (!address || typeof address !== "object") {
        return null;
    }

    const fields = [
        "houseNumber",
        "street",
        "area",
        "city",
        "pinCode",
        "landmark",
    ];

    const result = {};

    for (const field of fields) {
        const value = address[field];

        result[field] =
            typeof value === "string"
                ? value.trim()
                : "";
    }

    return result;
};

const validateDeliveryAddress = (address) => {
    if (!address) return "Delivery address is required";
    if (!address.houseNumber) return "House number is required";
    if (!address.street) return "Street is required";
    if (!address.area) return "Area is required";
    if (!address.city) return "City is required";

    if (!/^\d{6}$/.test(address.pinCode)) {
        return "Please enter a valid 6-digit PIN code";
    }

    if (
        address.houseNumber.length > 100 ||
        address.street.length > 200 ||
        address.area.length > 100 ||
        address.city.length > 100 ||
        address.pinCode.length > 10 ||
        address.landmark.length > 150
    ) {
        return "One or more delivery address fields are too long";
    }

    return null;
};

const getCurrentUser = async (req) => {
    const id = parsePositiveId(req.user?.id);

    if (!id) return null;

    return getUserByLegacyId(id);
};

const getOrderContext = async (order) => {
    const [restaurant, user] = await Promise.all([
        Restaurant.findById(order.restaurant_id),
        User.findById(order.user_id),
    ]);

    return { restaurant, user };
};

const getReservationContext = async (reservation) =>
    RestaurantTable.findById(reservation.table_id);

const isAssignedDeliveryPerson = (order, user) =>
    Boolean(
        order.delivery_person?.user_id &&
        String(order.delivery_person.user_id) === String(user._id)
    );

const isTerminalOrder = (order) =>
    ["COMPLETED", "CANCELLED"].includes(order.status);

const isTerminalDelivery = (order) =>
    ["DELIVERED", "CANCELLED"].includes(order.delivery_status);

/* =========================================================
   HEALTH
========================================================= */

app.get("/api/health", async (req, res) => {
    const connected = mongoose.connection.readyState === 1;

    res.status(connected ? 200 : 503).json({
        ok: connected,
        message: connected
            ? "API and MongoDB Atlas are connected"
            : "API is running but MongoDB is not connected",
    });
});

/* =========================================================
   AUTH: REGISTER
   Public registrations can NEVER select their own role.
========================================================= */

app.post("/api/auth/register", async (req, res, next) => {
    try {
        const {
            name,
            email,
            phone,
            password,
            confirmPassword,
        } = req.body;

        if (
            typeof name !== "string" ||
            !name.trim() ||
            name.trim().length > 100 ||
            typeof email !== "string" ||
            !isValidEmail(normalizeEmail(email)) ||
            typeof password !== "string" ||
            password.length < 8
        ) {
            return res.status(400).json({
                message:
                    "Enter a valid name, email and password of at least 8 characters",
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match",
            });
        }

        if (
            phone != null &&
            (typeof phone !== "string" || phone.trim().length > 20)
        ) {
            return res.status(400).json({
                message: "Invalid phone number",
            });
        }

        const normalizedEmail = normalizeEmail(email);

        const existing = await User.findOne({
            email: normalizedEmail,
        });

        if (existing) {
            return res.status(409).json({
                message: "Email already registered",
            });
        }

        const hash = await bcrypt.hash(password, 10);
        const nextId = await getNextLegacyId(User);

        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            phone:
                typeof phone === "string"
                    ? phone.trim() || null
                    : null,
            password: hash,
            role: CUSTOMER,
            legacyId: nextId,
        });

        const responseUser = {
            id: user.legacyId,
            name: user.name,
            email: user.email,
            role: user.role,
        };

        return res.status(201).json({
            user: responseUser,
            token: signToken(responseUser),
        });
    } catch (error) {
        if (isDuplicateKey(error)) {
            return res.status(409).json({
                message: "Email already registered",
            });
        }

        next(error);
    }
});

/* =========================================================
   AUTH: LOGIN
========================================================= */

app.post("/api/auth/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }

        const user = await User.findOne({
            email: normalizeEmail(email),
        }).select("+password");

        if (
            !user ||
            !(await bcrypt.compare(password, user.password))
        ) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        const responseUser = {
            id: user.legacyId,
            name: user.name,
            email: user.email,
            role: user.role,
        };

        return res.json({
            user: responseUser,
            token: signToken(responseUser),
        });
    } catch (error) {
        next(error);
    }
});

/* =========================================================
   AUTH: PROFILE
========================================================= */

app.get(
    "/api/auth/profile",
    requireAuth,
    async (req, res, next) => {
        try {
            const user = await getCurrentUser(req);

            if (!user) {
                return res.status(404).json({
                    message: "User not found",
                });
            }

            return res.json(publicUser(user));
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   OWNER: USER MANAGEMENT
========================================================= */

// List users without returning password or OTP fields.
app.get(
    "/api/users",
    requireAuth,
    requireRole(OWNER),
    async (req, res, next) => {
        try {
            const users = await User.find()
                .select("name email phone role legacyId created_at")
                .sort({ legacyId: 1 });

            return res.json(users.map(publicUser));
        } catch (error) {
            next(error);
        }
    }
);

// Only the owner can change roles.
// This prevents managers from promoting themselves or others to owner.
app.put(
    "/api/users/:id/role",
    requireAuth,
    requireRole(OWNER),
    async (req, res, next) => {
        try {
            const id = parsePositiveId(req.params.id);
            const { role } = req.body;

            const allowedRoles = [
                OWNER,
                MANAGER,
                CUSTOMER,
                WORKER,
                DELIVERY,
            ];

            if (!id || !allowedRoles.includes(role)) {
                return res.status(400).json({
                    message: "Invalid user ID or role",
                });
            }

            const target = await getUserByLegacyId(id);

            if (!target) {
                return res.status(404).json({
                    message: "User not found",
                });
            }

            // Prevent accidentally removing the only owner.
            if (
                target.role === OWNER &&
                role !== OWNER
            ) {
                const ownerCount = await User.countDocuments({
                    role: OWNER,
                });

                if (ownerCount <= 1) {
                    return res.status(400).json({
                        message:
                            "You cannot remove the last owner account",
                    });
                }
            }

            target.role = role;
            await target.save();

            return res.json({
                message: "User role updated successfully",
                user: publicUser(target),
            });
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   RESTAURANTS
========================================================= */

app.get("/api/restaurants", async (req, res, next) => {
    try {
        const restaurants = await Restaurant.find().sort({
            legacyId: 1,
        });

        return res.json(restaurants.map(publicRestaurant));
    } catch (error) {
        next(error);
    }
});

/* =========================================================
   MENU AND CATEGORIES
========================================================= */

app.get("/api/menu", async (req, res, next) => {
    try {
        const menuItems = await MenuItem.find({
            available: true,
        }).sort({
            legacyCategoryId: 1,
            legacyId: 1,
        });

        const categories = await Category.find().lean();

        const categoryNames = new Map(
            categories.map((category) => [
                category.legacyId,
                category.name,
            ])
        );

        return res.json(
            menuItems.map((item) =>
                publicMenuItem(
                    item,
                    categoryNames.get(item.legacyCategoryId) ?? null
                )
            )
        );
    } catch (error) {
        next(error);
    }
});

app.get("/api/categories", async (req, res, next) => {
    try {
        const categories = await Category.find().sort({
            legacyId: 1,
        });

        return res.json(categories.map(publicCategory));
    } catch (error) {
        next(error);
    }
});

/* =========================================================
   TABLES
========================================================= */

app.get("/api/tables", async (req, res, next) => {
    try {
        const tables = await RestaurantTable.find().sort({
            table_number: 1,
        });

        return res.json(tables.map(publicTable));
    } catch (error) {
        next(error);
    }
});

app.get("/api/tables/available", async (req, res, next) => {
    try {
        const { date, time, guests } = req.query;

        if (!date || !time || !guests) {
            return res.status(400).json({
                message: "Date, time and number of guests are required",
            });
        }

        if (!parseDate(date) || !parseTime(time)) {
            return res.status(400).json({
                message: "A valid date and time are required",
            });
        }

        const guestCount = Number(guests);

        if (
            !Number.isInteger(guestCount) ||
            guestCount < 1 ||
            guestCount > 10
        ) {
            return res.status(400).json({
                message: "Guests must be between 1 and 10",
            });
        }

        const tables = await RestaurantTable.find({
            capacity: { $gte: guestCount },
            status: "AVAILABLE",
        }).sort({
            capacity: 1,
            table_number: 1,
        });

        const activeReservations = await Reservation.find({
            reservation_date: date,
            status: { $in: ["PENDING", "CONFIRMED"] },
        }).select("table_id reservation_time");

        const bookedTableIds = new Set(
            activeReservations
                .filter(
                    (reservation) =>
                        timeKey(reservation.reservation_time) ===
                        timeKey(time)
                )
                .map((reservation) => String(reservation.table_id))
        );

        const available = tables.filter(
            (table) => !bookedTableIds.has(String(table._id))
        );

        return res.json(available.map(publicTable));
    } catch (error) {
        next(error);
    }
});

/* =========================================================
   CREATE RESERVATION
========================================================= */

app.post(
    "/api/reservations",
    requireAuth,
    requireRole(OWNER, MANAGER, CUSTOMER, WORKER),
    async (req, res, next) => {
        try {
            const {
                customerName,
                tableId,
                selectedSeats,
                reservationDate,
                reservationTime,
                guests,
            } = req.body;

            if (
                typeof customerName !== "string" ||
                !customerName.trim() ||
                customerName.trim().length > 100
            ) {
                return res.status(400).json({
                    message: "Enter a valid customer name",
                });
            }

            const numericTableId = parsePositiveId(tableId);

            if (!numericTableId) {
                return res.status(400).json({
                    message: "Please select a valid table",
                });
            }

            if (
                !parseDate(reservationDate) ||
                !parseTime(reservationTime)
            ) {
                return res.status(400).json({
                    message:
                        "A valid reservation date and time are required",
                });
            }

            const guestCount = Number(guests);

            if (
                !Number.isInteger(guestCount) ||
                guestCount < 1 ||
                guestCount > 10
            ) {
                return res.status(400).json({
                    message: "Guests must be between 1 and 10",
                });
            }

            if (
                !Array.isArray(selectedSeats) ||
                selectedSeats.length !== guestCount
            ) {
                return res.status(400).json({
                    message: `Please select exactly ${guestCount} seat${
                        guestCount === 1 ? "" : "s"
                    }.`,
                });
            }

            const cleanSeats = selectedSeats.map(Number);

            if (
                cleanSeats.some(
                    (seat) =>
                        !Number.isInteger(seat) || seat < 1
                ) ||
                new Set(cleanSeats).size !== guestCount
            ) {
                return res.status(400).json({
                    message: "Invalid seat selection",
                });
            }

            const table = await getTableByLegacyId(numericTableId);

            if (!table || table.status !== "AVAILABLE") {
                return res.status(400).json({
                    message: "This table is unavailable",
                });
            }

            if (
                table.capacity < guestCount ||
                cleanSeats.some((seat) => seat > table.capacity)
            ) {
                return res.status(400).json({
                    message:
                        "This table cannot accommodate your selection",
                });
            }

            const existingReservation = await Reservation.findOne({
                table_id: table._id,
                reservation_date: reservationDate,
                reservation_time: reservationTime,
                status: { $in: ["PENDING", "CONFIRMED"] },
            });

            if (existingReservation) {
                return res.status(409).json({
                    message:
                        "This table has already been reserved for this time",
                });
            }

            const user = await getCurrentUser(req);

            if (!user) {
                return res.status(401).json({
                    message: "User account not found",
                });
            }

            const restaurant = await getRestaurant();

            if (!restaurant) {
                return res.status(500).json({
                    message: "Restaurant information is missing",
                });
            }

            const reservation = await Reservation.create({
                legacyId: await getNextLegacyId(Reservation),
                user_id: user._id,
                restaurant_id: restaurant._id,
                table_id: table._id,
                legacyUserId: user.legacyId,
                legacyRestaurantId: restaurant.legacyId,
                legacyTableId: table.legacyId,
                customer_name: customerName.trim(),
                selected_seats: [...cleanSeats].sort((a, b) => a - b),
                reservation_date: reservationDate,
                reservation_time: reservationTime,
                guests: guestCount,
                status: "CONFIRMED",
            });

            return res.status(201).json({
                id: reservation.legacyId,
                message: "Reservation confirmed successfully",
                reservation: {
                    id: reservation.legacyId,
                    customerName: reservation.customer_name,
                    tableNumber: table.table_number,
                    guests: reservation.guests,
                    selectedSeats: reservation.selected_seats,
                    reservationDate: reservation.reservation_date,
                    reservationTime: reservation.reservation_time,
                    status: reservation.status,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   MY RESERVATIONS
========================================================= */

app.get(
    "/api/reservations/my",
    requireAuth,
    async (req, res, next) => {
        try {
            const user = await getCurrentUser(req);

            if (!user) {
                return res.status(404).json({
                    message: "User not found",
                });
            }

            const reservations = await Reservation.find({
                user_id: user._id,
            }).sort({
                reservation_date: -1,
                reservation_time: -1,
            });

            const tables = await RestaurantTable.find().lean();

            const tableMap = new Map(
                tables.map((table) => [String(table._id), table])
            );

            return res.json(
                reservations.map((reservation) =>
                    publicReservation(
                        reservation,
                        tableMap.get(String(reservation.table_id))
                    )
                )
            );
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   STAFF RESERVATIONS
========================================================= */

app.get(
    "/api/reservations",
    requireAuth,
    requireRole(OWNER, MANAGER, WORKER, "STAFF"),
    async (req, res, next) => {
        try {
            const reservations = await Reservation.find().sort({
                reservation_date: -1,
                reservation_time: -1,
            });

            const [users, tables] = await Promise.all([
                User.find().lean(),
                RestaurantTable.find().lean(),
            ]);

            const userMap = new Map(
                users.map((user) => [String(user._id), user])
            );

            const tableMap = new Map(
                tables.map((table) => [String(table._id), table])
            );

            return res.json(
                reservations.map((reservation) => {
                    const user = userMap.get(
                        String(reservation.user_id)
                    );

                    return {
                        ...publicReservation(
                            reservation,
                            tableMap.get(String(reservation.table_id))
                        ),
                        account_name: user?.name ?? null,
                        email: user?.email ?? null,
                    };
                })
            );
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   UPDATE RESERVATION STATUS
========================================================= */

app.put(
    "/api/reservations/:id",
    requireAuth,
    async (req, res, next) => {
        try {
            const id = parsePositiveId(req.params.id);
            const { status } = req.body;

            if (!id) {
                return res.status(400).json({
                    message: "Invalid reservation ID",
                });
            }

            const reservation = await getReservationByLegacyId(id);

            if (!reservation) {
                return res.status(404).json({
                    message: "Reservation not found",
                });
            }

            const role = req.user.role;

            if (role === CUSTOMER) {
                if (status !== "CANCELLED") {
                    return res.status(403).json({
                        message:
                            "Customers can only cancel their own reservations",
                    });
                }

                const user = await getCurrentUser(req);

                if (
                    !user ||
                    String(reservation.user_id) !== String(user._id)
                ) {
                    return res.status(404).json({
                        message: "Reservation not found",
                    });
                }

                if (
                    !["PENDING", "CONFIRMED"].includes(
                        reservation.status
                    )
                ) {
                    return res.status(400).json({
                        message:
                            "This reservation can no longer be cancelled",
                    });
                }
            } else if (isWorker(role)) {
                if (
                    status !== "COMPLETED" ||
                    reservation.status !== "CONFIRMED"
                ) {
                    return res.status(403).json({
                        message:
                            "Workers can only complete confirmed reservations",
                    });
                }
            } else if (isManagement(role)) {
                if (
                    !["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]
                        .includes(status)
                ) {
                    return res.status(400).json({
                        message: "Invalid reservation status",
                    });
                }
            } else {
                return res.status(403).json({
                    message: "You cannot modify this reservation",
                });
            }

            reservation.status = status;
            await reservation.save();

            return res.json({
                message: "Reservation status updated",
                reservation: {
                    id: reservation.legacyId,
                    status: reservation.status,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   CREATE ORDER
========================================================= */

app.post(
    "/api/orders",
    requireAuth,
    requireRole(OWNER, MANAGER, CUSTOMER, WORKER),
    async (req, res, next) => {
        try {
            const {
                items,
                reservationId,
                customerName,
                customerEmail,
                customerPhone,
                orderType = "DINE_IN",
                deliveryAddress,
                paymentMethod = "CASH",
            } = req.body;

            if (!Array.isArray(items) || !items.length) {
                return res.status(400).json({
                    message: "Cart is empty",
                });
            }

            if (
                typeof customerName !== "string" ||
                !customerName.trim() ||
                customerName.trim().length > 100
            ) {
                return res.status(400).json({
                    message: "Enter a valid customer name",
                });
            }

            if (!["DINE_IN", "ONLINE_DELIVERY"].includes(orderType)) {
                return res.status(400).json({
                    message: "Invalid order type",
                });
            }

            if (!["UPI", "CASH"].includes(paymentMethod)) {
                return res.status(400).json({
                    message: "Invalid payment method",
                });
            }

            const email = normalizeEmail(customerEmail);

            if (!email || !isValidEmail(email) || email.length > 150) {
                return res.status(400).json({
                    message: "Please enter a valid email address",
                });
            }

            let cleanPhone = null;
            let cleanAddress = null;

            if (orderType === "ONLINE_DELIVERY") {
                if (
                    typeof customerPhone !== "string" ||
                    !/^\d{10}$/.test(customerPhone.trim())
                ) {
                    return res.status(400).json({
                        message:
                            "Please enter a valid 10-digit customer phone number",
                    });
                }

                cleanPhone = customerPhone.trim();
                cleanAddress = normalizeDeliveryAddress(deliveryAddress);

                const addressError =
                    validateDeliveryAddress(cleanAddress);

                if (addressError) {
                    return res.status(400).json({
                        message: addressError,
                    });
                }
            } else if (customerPhone != null && customerPhone !== "") {
                if (
                    typeof customerPhone !== "string" ||
                    !/^\d{10}$/.test(customerPhone.trim())
                ) {
                    return res.status(400).json({
                        message: "Invalid customer phone number",
                    });
                }

                cleanPhone = customerPhone.trim();
            }

            const user = await getCurrentUser(req);

            if (!user) {
                return res.status(401).json({
                    message: "User account not found",
                });
            }

            const restaurant = await getRestaurant();

            if (!restaurant) {
                return res.status(500).json({
                    message: "Restaurant information is missing",
                });
            }

            let reservation = null;

            if (reservationId != null && reservationId !== "") {
                const numericReservationId =
                    parsePositiveId(reservationId);

                if (!numericReservationId) {
                    return res.status(400).json({
                        message: "Invalid reservation ID",
                    });
                }

                reservation = await getReservationByLegacyId(
                    numericReservationId
                );

                if (
                    !reservation ||
                    String(reservation.user_id) !== String(user._id)
                ) {
                    return res.status(400).json({
                        message:
                            "Reservation not found for this account",
                    });
                }
            }

            const quantities = new Map();

            for (const item of items) {
                const menuItemId = parsePositiveId(item.menuItemId);
                const quantity = Number(item.quantity);

                if (
                    !menuItemId ||
                    !Number.isInteger(quantity) ||
                    quantity < 1 ||
                    quantity > 100
                ) {
                    return res.status(400).json({
                        message: "Invalid menu item or quantity",
                    });
                }

                const newQuantity =
                    (quantities.get(menuItemId) || 0) + quantity;

                if (newQuantity > 100) {
                    return res.status(400).json({
                        message:
                            "The quantity of a menu item cannot exceed 100",
                    });
                }

                quantities.set(menuItemId, newQuantity);
            }

            const menuItems = await MenuItem.find({
                legacyId: { $in: [...quantities.keys()] },
                available: true,
            });

            const menuMap = new Map(
                menuItems.map((item) => [item.legacyId, item])
            );

            if (menuMap.size !== quantities.size) {
                return res.status(400).json({
                    message: "One or more menu items are unavailable",
                });
            }

            let subtotalTotal = 0;
            const embeddedItems = [];

            for (const [menuItemId, quantity] of quantities) {
                const menuItem = menuMap.get(menuItemId);
                const price = Number(menuItem.price);

                if (!Number.isFinite(price) || price < 0) {
                    return res.status(400).json({
                        message: "A menu item has an invalid price",
                    });
                }

                const itemSubtotal =
                    Math.round(price * quantity * 100) / 100;

                subtotalTotal += itemSubtotal;

                embeddedItems.push({
                    menu_item_id: menuItem._id,
                    item_name: menuItem.name,
                    quantity,
                    price,
                    subtotal: itemSubtotal,
                    legacyMenuItemId: menuItem.legacyId,
                });
            }

            subtotalTotal = Math.round(subtotalTotal * 100) / 100;

            const gstAmount =
                Math.round(subtotalTotal * 5) / 100;

            const grandTotal =
                Math.round((subtotalTotal + gstAmount) * 100) / 100;

            const order = await Order.create({
                legacyId: await getNextLegacyId(Order),

                user_id: user._id,
                restaurant_id: restaurant._id,
                reservation_id: reservation?._id ?? null,

                legacyUserId: user.legacyId,
                legacyRestaurantId: restaurant.legacyId,
                legacyReservationId: reservation?.legacyId ?? null,

                customer_name: customerName.trim(),
                customer_email: email,
                customer_phone: cleanPhone,

                order_type: orderType,
                delivery_address:
                    orderType === "ONLINE_DELIVERY"
                        ? cleanAddress
                        : null,

                delivery_status:
                    orderType === "ONLINE_DELIVERY"
                        ? "PLACED"
                        : "NOT_APPLICABLE",

                delivery_person: null,
                delivery_location: null,

                payment_method: paymentMethod,
                items: embeddedItems,
                total_amount: grandTotal,
                status: "PENDING",
            });

            return res.status(201).json({
                id: order.legacyId,
                orderType: order.order_type,
                subtotal: subtotalTotal.toFixed(2),
                gstAmount: gstAmount.toFixed(2),
                total: grandTotal.toFixed(2),
                deliveryStatus: order.delivery_status,
                message:
                    orderType === "ONLINE_DELIVERY"
                        ? "Online delivery order placed successfully"
                        : "Order placed successfully",
            });
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   MY ORDERS
========================================================= */

app.get(
    "/api/orders/my",
    requireAuth,
    async (req, res, next) => {
        try {
            const user = await getCurrentUser(req);

            if (!user) {
                return res.status(404).json({
                    message: "User not found",
                });
            }

            const orders = await Order.find({
                user_id: user._id,
            }).sort({ created_at: -1 });

            const restaurants = await Restaurant.find().lean();

            const restaurantMap = new Map(
                restaurants.map((restaurant) => [
                    String(restaurant._id),
                    restaurant,
                ])
            );

            return res.json(
                orders.map((order) =>
                    publicOrder(
                        order,
                        restaurantMap.get(String(order.restaurant_id)),
                        user
                    )
                )
            );
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   DELIVERY PERSON: ASSIGNED ORDERS
========================================================= */

app.get(
    "/api/delivery/my",
    requireAuth,
    requireRole(DELIVERY),
    async (req, res, next) => {
        try {
            const user = await getCurrentUser(req);

            if (!user) {
                return res.status(404).json({
                    message: "User not found",
                });
            }

            const orders = await Order.find({
                "delivery_person.user_id": user._id,
                order_type: "ONLINE_DELIVERY",
            }).sort({ created_at: -1 });

            const restaurants = await Restaurant.find().lean();

            const restaurantMap = new Map(
                restaurants.map((restaurant) => [
                    String(restaurant._id),
                    restaurant,
                ])
            );

            return res.json(
                orders.map((order) =>
                    publicOrder(
                        order,
                        restaurantMap.get(String(order.restaurant_id)),
                        user
                    )
                )
            );
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   CUSTOMER: TRACK OWN DELIVERY
========================================================= */

app.get(
    "/api/orders/:id/tracking",
    requireAuth,
    async (req, res, next) => {
        try {
            const id = parsePositiveId(req.params.id);

            if (!id) {
                return res.status(400).json({
                    message: "Invalid order ID",
                });
            }

            const user = await getCurrentUser(req);

            if (!user) {
                return res.status(401).json({
                    message: "User account not found",
                });
            }

            const order = await Order.findOne({
                legacyId: id,
                user_id: user._id,
            });

            if (!order) {
                return res.status(404).json({
                    message: "Order not found",
                });
            }

            if (order.order_type !== "ONLINE_DELIVERY") {
                return res.status(400).json({
                    message:
                        "Tracking is only available for delivery orders",
                });
            }

            const restaurant = await Restaurant.findById(
                order.restaurant_id
            );

            return res.json(publicOrder(order, restaurant, user));
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   STAFF: VIEW ALL ORDERS
========================================================= */

app.get(
    "/api/orders",
    requireAuth,
    requireRole(OWNER, MANAGER, WORKER, "STAFF"),
    async (req, res, next) => {
        try {
            const orders = await Order.find().sort({
                created_at: -1,
            });

            const [users, restaurants] = await Promise.all([
                User.find().lean(),
                Restaurant.find().lean(),
            ]);

            const userMap = new Map(
                users.map((user) => [String(user._id), user])
            );

            const restaurantMap = new Map(
                restaurants.map((restaurant) => [
                    String(restaurant._id),
                    restaurant,
                ])
            );

            return res.json(
                orders.map((order) =>
                    publicOrder(
                        order,
                        restaurantMap.get(String(order.restaurant_id)),
                        userMap.get(String(order.user_id))
                    )
                )
            );
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   UPDATE GENERAL ORDER STATUS

   Owner/Manager: manage operational statuses.
   Worker: cancel dine-in orders or complete pending orders.
========================================================= */

app.put(
    "/api/orders/:id/status",
    requireAuth,
    requireRole(OWNER, MANAGER, WORKER, "STAFF"),
    async (req, res, next) => {
        try {
            const id = parsePositiveId(req.params.id);
            const { status } = req.body;

            const allowed = [
                "PENDING",
                "CONFIRMED",
                "PREPARING",
                "READY",
                "COMPLETED",
                "CANCELLED",
            ];

            if (!id || !allowed.includes(status)) {
                return res.status(400).json({
                    message: "Invalid order ID or status",
                });
            }

            const order = await getOrderByLegacyId(id);

            if (!order) {
                return res.status(404).json({
                    message: "Order not found",
                });
            }

            if (isTerminalOrder(order)) {
                return res.status(400).json({
                    message:
                        "This order is already completed or cancelled",
                });
            }

            if (isWorker(req.user.role)) {
                if (order.order_type !== "DINE_IN") {
                    return res.status(403).json({
                        message:
                            "Workers can only change dine-in order statuses",
                    });
                }

                const canCancel =
                    status === "CANCELLED" &&
                    ["PENDING", "CONFIRMED", "PREPARING", "READY"]
                        .includes(order.status);

                const canComplete =
                    status === "COMPLETED" &&
                    order.status === "PENDING";

                if (!canCancel && !canComplete) {
                    return res.status(403).json({
                        message:
                            "Workers can only cancel dine-in orders or complete pending dine-in orders",
                    });
                }
            }

            // Only managers and owners may update delivery orders
            // through this general restaurant-status endpoint.
            if (
                order.order_type === "ONLINE_DELIVERY" &&
                !isManagement(req.user.role)
            ) {
                return res.status(403).json({
                    message:
                        "Only managers and owners can manage delivery order statuses here",
                });
            }

            order.status = status;

            if (order.order_type === "ONLINE_DELIVERY") {
                const deliveryStatusMap = {
                    PENDING: "PLACED",
                    PREPARING: "PREPARING",
                    READY: "READY_FOR_PICKUP",
                    COMPLETED: "DELIVERED",
                    CANCELLED: "CANCELLED",
                };

                if (deliveryStatusMap[status]) {
                    order.delivery_status = deliveryStatusMap[status];
                }
            }

            await order.save();

            return res.json({
                message: "Order status updated",
                order: {
                    id: order.legacyId,
                    status: order.status,
                    delivery_status: order.delivery_status,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   OWNER / MANAGER: ASSIGN DELIVERY PERSON

   Request body:
   {
       "deliveryUserId": 123
   }

   deliveryUserId is the registered user's legacy ID.
========================================================= */

app.put(
    "/api/orders/:id/delivery-person",
    requireAuth,
    requireRole(...DELIVERY_MANAGEMENT_ROLES),
    async (req, res, next) => {
        try {
            const id = parsePositiveId(req.params.id);
            const deliveryUserId = parsePositiveId(
                req.body.deliveryUserId
            );

            if (!id || !deliveryUserId) {
                return res.status(400).json({
                    message:
                        "A valid order ID and deliveryUserId are required",
                });
            }

            const [order, deliveryUser] = await Promise.all([
                getOrderByLegacyId(id),
                getUserByLegacyId(deliveryUserId),
            ]);

            if (!order) {
                return res.status(404).json({
                    message: "Order not found",
                });
            }

            if (order.order_type !== "ONLINE_DELIVERY") {
                return res.status(400).json({
                    message:
                        "A delivery person can only be assigned to online delivery orders",
                });
            }

            if (!deliveryUser) {
                return res.status(404).json({
                    message: "Delivery-person account not found",
                });
            }

            if (deliveryUser.role !== DELIVERY) {
                return res.status(400).json({
                    message:
                        "The selected user must have the DELIVERY role",
                });
            }

            if (isTerminalOrder(order) || isTerminalDelivery(order)) {
                return res.status(400).json({
                    message:
                        "A delivery person cannot be assigned to a completed or cancelled order",
                });
            }

            order.delivery_person = {
                user_id: deliveryUser._id,
                name: deliveryUser.name,
                phone: deliveryUser.phone ?? null,
            };

            await order.save();

            return res.json({
                message: "Delivery person assigned successfully",
                order: {
                    id: order.legacyId,
                    delivery_person: order.delivery_person,
                    delivery_status: order.delivery_status,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   UPDATE DELIVERY STATUS

   Owner/Manager: can manage delivery progress.
   Delivery: can update ONLY their own assigned orders.
========================================================= */

app.put(
    "/api/orders/:id/delivery-status",
    requireAuth,
    requireRole(OWNER, MANAGER, DELIVERY),
    async (req, res, next) => {
        try {
            const id = parsePositiveId(req.params.id);
            const { deliveryStatus } = req.body;

            const allowedStatuses = [
                "PREPARING",
                "READY_FOR_PICKUP",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
                "CANCELLED",
            ];

            if (
                !id ||
                !allowedStatuses.includes(deliveryStatus)
            ) {
                return res.status(400).json({
                    message: "Invalid order ID or delivery status",
                });
            }

            const order = await getOrderByLegacyId(id);

            if (!order) {
                return res.status(404).json({
                    message: "Order not found",
                });
            }

            if (order.order_type !== "ONLINE_DELIVERY") {
                return res.status(400).json({
                    message:
                        "Delivery status can only be updated for online delivery orders",
                });
            }

            if (isTerminalOrder(order) || isTerminalDelivery(order)) {
                return res.status(400).json({
                    message:
                        "This order is already completed or cancelled",
                });
            }

            if (req.user.role === DELIVERY) {
                const user = await getCurrentUser(req);

                if (!user || !isAssignedDeliveryPerson(order, user)) {
                    return res.status(403).json({
                        message:
                            "You can only update deliveries assigned to your account",
                    });
                }

                // Delivery people cannot cancel deliveries or move
                // them back into preparation.
                const deliveryTransitions = {
                    READY_FOR_PICKUP: ["OUT_FOR_DELIVERY"],
                    OUT_FOR_DELIVERY: ["DELIVERED"],
                };

                const permitted =
                    deliveryTransitions[order.delivery_status] || [];

                if (!permitted.includes(deliveryStatus)) {
                    return res.status(403).json({
                        message:
                            "Invalid delivery-status transition for your role",
                    });
                }
            }

            if (
                deliveryStatus === "OUT_FOR_DELIVERY" &&
                !order.delivery_person?.user_id
            ) {
                return res.status(400).json({
                    message:
                        "Assign a registered delivery person before dispatch",
                });
            }

            if (
                deliveryStatus === "READY_FOR_PICKUP" &&
                !["PREPARING", "PLACED", "READY_FOR_PICKUP"]
                    .includes(order.delivery_status)
            ) {
                return res.status(400).json({
                    message:
                        "The order is not ready for pickup at this stage",
                });
            }

            if (
                deliveryStatus === "OUT_FOR_DELIVERY" &&
                !["READY_FOR_PICKUP", "OUT_FOR_DELIVERY"]
                    .includes(order.delivery_status)
            ) {
                return res.status(400).json({
                    message:
                        "The order must be ready for pickup before dispatch",
                });
            }

            order.delivery_status = deliveryStatus;

            if (deliveryStatus === "PREPARING") {
                order.status = "PREPARING";
            } else if (deliveryStatus === "READY_FOR_PICKUP") {
                order.status = "READY";
            } else if (deliveryStatus === "DELIVERED") {
                order.status = "COMPLETED";
            } else if (deliveryStatus === "CANCELLED") {
                order.status = "CANCELLED";
            }

            await order.save();

            return res.json({
                message: "Delivery status updated successfully",
                order: {
                    id: order.legacyId,
                    status: order.status,
                    delivery_status: order.delivery_status,
                    delivery_person: order.delivery_person,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   UPDATE DELIVERY GPS LOCATION

   Owner/Manager: may update any active delivery.
   Delivery: may update only their assigned active delivery.

   Request body:
   {
       "latitude": 13.0827,
       "longitude": 80.2707
   }
========================================================= */

app.put(
    "/api/orders/:id/delivery-location",
    requireAuth,
    requireRole(OWNER, MANAGER, DELIVERY),
    async (req, res, next) => {
        try {
            const id = parsePositiveId(req.params.id);

            if (!id) {
                return res.status(400).json({
                    message: "Invalid order ID",
                });
            }

            const { latitude, longitude } = req.body;

            if (
                latitude == null ||
                longitude == null ||
                typeof latitude === "boolean" ||
                typeof longitude === "boolean" ||
                String(latitude).trim() === "" ||
                String(longitude).trim() === ""
            ) {
                return res.status(400).json({
                    message: "Latitude and longitude are required",
                });
            }

            const lat = Number(latitude);
            const lng = Number(longitude);

            if (
                !Number.isFinite(lat) ||
                !Number.isFinite(lng) ||
                lat < -90 ||
                lat > 90 ||
                lng < -180 ||
                lng > 180
            ) {
                return res.status(400).json({
                    message:
                        "Enter valid GPS coordinates: latitude -90 to 90 and longitude -180 to 180",
                });
            }

            const order = await getOrderByLegacyId(id);

            if (!order) {
                return res.status(404).json({
                    message: "Order not found",
                });
            }

            if (order.order_type !== "ONLINE_DELIVERY") {
                return res.status(400).json({
                    message:
                        "GPS tracking is only available for online delivery orders",
                });
            }

            if (isTerminalOrder(order) || isTerminalDelivery(order)) {
                return res.status(400).json({
                    message:
                        "GPS location cannot be updated for a completed or cancelled order",
                });
            }

            if (!order.delivery_person?.user_id) {
                return res.status(400).json({
                    message:
                        "Assign a registered delivery person before updating GPS location",
                });
            }

            if (req.user.role === DELIVERY) {
                const user = await getCurrentUser(req);

                if (!user || !isAssignedDeliveryPerson(order, user)) {
                    return res.status(403).json({
                        message:
                            "You can only update GPS for deliveries assigned to your account",
                    });
                }
            }

            order.delivery_location = {
                latitude: lat,
                longitude: lng,
                updated_at: new Date(),
            };

            await order.save();

            return res.json({
                message: "Delivery location updated successfully",
                order: {
                    id: order.legacyId,
                    delivery_location: {
                        latitude: lat,
                        longitude: lng,
                        updated_at: order.delivery_location.updated_at,
                    },
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(errorHandler);

/* =========================================================
   START SERVER AFTER MONGODB CONNECTS
========================================================= */

const port = Number(process.env.PORT || 5000);

const startServer = async () => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is missing from .env");
    }

    await connectDB();

    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
};

startServer().catch((error) => {
    console.error("Server startup failed:", error.message);
    process.exit(1);
});
