
import mongoose from "mongoose";

/* =========================
   ORDER ITEM SCHEMA
========================= */

const orderItemSchema = new mongoose.Schema(
    {
        menu_item_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MenuItem",
            default: null,
        },

        item_name: {
            type: String,
            required: true,
            trim: true,
        },

        quantity: {
            type: Number,
            required: true,
            min: 1,
            validate: {
                validator: Number.isInteger,
                message: "Quantity must be a whole number",
            },
        },

        price: {
            type: Number,
            required: true,
            min: 0,
        },

        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },

        legacyMenuItemId: {
            type: Number,
            default: null,
        },
    },
    { _id: true }
);

/* =========================
   DELIVERY ADDRESS SCHEMA
========================= */

const deliveryAddressSchema = new mongoose.Schema(
    {
        houseNumber: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },

        street: {
            type: String,
            trim: true,
            maxlength: 200,
            default: null,
        },

        area: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },

        city: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },

        pinCode: {
            type: String,
            trim: true,
            maxlength: 10,
            default: null,
        },

        landmark: {
            type: String,
            trim: true,
            maxlength: 150,
            default: "",
        },
    },
    { _id: false }
);

/* =========================
   DELIVERY PERSON SCHEMA
========================= */

const deliveryPersonSchema = new mongoose.Schema(
    {
        // References the registered DELIVERY account.
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        // Saved for display and historical compatibility.
        name: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
        },

        phone: {
            type: String,
            trim: true,
            maxlength: 20,
            default: null,
        },
    },
    { _id: false }
);

/* =========================
   DELIVERY GPS LOCATION SCHEMA
========================= */

const deliveryLocationSchema = new mongoose.Schema(
    {
        latitude: {
            type: Number,
            min: -90,
            max: 90,
            default: null,
        },

        longitude: {
            type: Number,
            min: -180,
            max: 180,
            default: null,
        },

        updated_at: {
            type: Date,
            default: null,
        },
    },
    { _id: false }
);

/* =========================
   ORDER SCHEMA
========================= */

const orderSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        restaurant_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },

        reservation_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Reservation",
            default: null,
        },

        customer_name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        customer_email: {
            type: String,
            trim: true,
            lowercase: true,
            maxlength: 150,
            default: null,
        },

        customer_phone: {
            type: String,
            trim: true,
            maxlength: 20,
            default: null,
        },

        order_type: {
            type: String,
            enum: ["DINE_IN", "ONLINE_DELIVERY"],
            default: "DINE_IN",
            index: true,
        },

        delivery_address: {
            type: deliveryAddressSchema,
            default: null,
        },

        delivery_status: {
            type: String,
            enum: [
                "NOT_APPLICABLE",
                "PLACED",
                "PREPARING",
                "READY_FOR_PICKUP",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
                "CANCELLED",
            ],
            default: "NOT_APPLICABLE",
        },

        delivery_person: {
            type: deliveryPersonSchema,
            default: null,
        },

        delivery_location: {
            type: deliveryLocationSchema,
            default: null,
            validate: {
                validator: function (location) {
                    if (location == null) {
                        return true;
                    }

                    const hasLatitude =
                        location.latitude != null;

                    const hasLongitude =
                        location.longitude != null;

                    // Both coordinates must be present together.
                    if (hasLatitude !== hasLongitude) {
                        return false;
                    }

                    // Empty location is valid before GPS starts.
                    if (!hasLatitude && !hasLongitude) {
                        return true;
                    }

                    return (
                        Number.isFinite(location.latitude) &&
                        Number.isFinite(location.longitude) &&
                        location.latitude >= -90 &&
                        location.latitude <= 90 &&
                        location.longitude >= -180 &&
                        location.longitude <= 180
                    );
                },
                message:
                    "GPS location must contain valid latitude and longitude together",
            },
        },

        payment_method: {
            type: String,
            enum: ["UPI", "CASH"],
            default: "CASH",
        },

        items: {
            type: [orderItemSchema],
            default: [],
            validate: {
                validator: (items) => Array.isArray(items),
                message: "Order items must be an array",
            },
        },

        total_amount: {
            type: Number,
            required: true,
            min: 0,
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "CONFIRMED",
                "PREPARING",
                "READY",
                "COMPLETED",
                "CANCELLED",
            ],
            default: "PENDING",
            required: true,
        },

        // Original IDs retained for API compatibility.
        legacyId: {
            type: Number,
            default: null,
        },

        legacyUserId: {
            type: Number,
            default: null,
        },

        legacyRestaurantId: {
            type: Number,
            default: null,
        },

        legacyReservationId: {
            type: Number,
            default: null,
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
        collection: "orders",
    }
);

/* =========================
   INDEXES
========================= */

orderSchema.index({
    user_id: 1,
    created_at: -1,
});

orderSchema.index({
    status: 1,
    created_at: -1,
});

orderSchema.index({
    order_type: 1,
    delivery_status: 1,
    created_at: -1,
});

orderSchema.index({
    user_id: 1,
    legacyId: 1,
    order_type: 1,
});

orderSchema.index({
    "delivery_person.user_id": 1,
    order_type: 1,
    delivery_status: 1,
});

/* =========================
   MODEL EXPORT
========================= */

const Order =
    mongoose.models.Order ||
    mongoose.model("Order", orderSchema);

export default Order;
