
import mongoose from "mongoose";

const restaurantTableSchema = new mongoose.Schema(
  {
    restaurant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true
    },
    table_number: {
      type: Number,
      required: true,
      min: 1
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    status: {
      type: String,
      enum: ["AVAILABLE", "MAINTENANCE"],
      default: "AVAILABLE",
      required: true
    },
    legacyId: {
      type: Number,
      default: null
    },
    legacyRestaurantId: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    },
    collection: "restaurantTables"
  }
);

restaurantTableSchema.index(
  { restaurant_id: 1, table_number: 1 },
  { unique: true }
);

const RestaurantTable =
  mongoose.models.RestaurantTable ||
  mongoose.model("RestaurantTable", restaurantTableSchema);

export default RestaurantTable;
