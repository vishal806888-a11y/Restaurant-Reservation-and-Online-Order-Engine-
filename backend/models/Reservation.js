
import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    restaurant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true
    },

    table_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RestaurantTable",
      required: true
    },

    customer_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    // Older MySQL reservations may not contain seat information.
    // New reservation requests must validate that seats are selected.
    selected_seats: {
      type: [Number],
      default: [],
      validate: {
        validator: (seats) =>
          Array.isArray(seats) &&
          (
            seats.length === 0 ||
            (
              seats.every(
                (seat) => Number.isInteger(seat) && seat >= 1
              ) &&
              new Set(seats).size === seats.length
            )
          ),
        message:
          "Selected seats must be unique positive integers"
      }
    },

    reservation_date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    },

    reservation_time: {
      type: String,
      required: true,
      match: /^\d{2}:\d{2}(:\d{2})?$/
    },

    guests: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      validate: {
        validator: Number.isInteger,
        message: "Guests must be a whole number"
      }
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "CANCELLED",
        "COMPLETED"
      ],
      default: "PENDING",
      required: true
    },

    // Preserve the original MySQL IDs during migration.
    legacyId: {
      type: Number,
      default: null
    },

    legacyUserId: {
      type: Number,
      default: null
    },

    legacyRestaurantId: {
      type: Number,
      default: null
    },

    legacyTableId: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    },
    collection: "reservations"
  }
);

// Helps look up reservations for a table and time.
reservationSchema.index({
  table_id: 1,
  reservation_date: 1,
  reservation_time: 1,
  status: 1
});

// Helps retrieve a customer's reservation history.
reservationSchema.index({
  user_id: 1,
  created_at: -1
});

const Reservation =
  mongoose.models.Reservation ||
  mongoose.model("Reservation", reservationSchema);

export default Reservation;
