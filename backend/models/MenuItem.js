
import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    description: {
      type: String,
      default: ""
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    image: {
      type: String,
      default: ""
    },
    available: {
      type: Boolean,
      default: true
    },
    legacyId: {
      type: Number,
      default: null
    },
    legacyCategoryId: {
      type: Number,
      default: null
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    },
    collection: "menuItems"
  }
);

menuItemSchema.index({ category_id: 1, name: 1 });

const MenuItem =
  mongoose.models.MenuItem ||
  mongoose.model("MenuItem", menuItemSchema);

export default MenuItem;
