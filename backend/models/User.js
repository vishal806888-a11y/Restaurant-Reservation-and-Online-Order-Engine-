
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 150,
        },

        phone: {
            type: String,
            default: null,
            maxlength: 20,
        },

        password: {
            type: String,
            required: true,
            select: false,
        },

        role: {
            type: String,
            enum: [
                "OWNER",
                "MANAGER",
                "CUSTOMER",
                "WORKER",
                "DELIVERY",
                "STAFF", // Temporary compatibility with existing accounts
            ],
            default: "CUSTOMER",
            required: true,
        },

        // Preserves the original MySQL user ID for API compatibility.
        legacyId: {
            type: Number,
            default: null,
        },

        // Password-reset OTP fields.
        passwordResetOtpHash: {
            type: String,
            default: null,
            select: false,
        },

        passwordResetOtpExpires: {
            type: Date,
            default: null,
            select: false,
        },

        passwordResetOtpRequestedAt: {
            type: Date,
            default: null,
            select: false,
        },

        passwordResetOtpAttempts: {
            type: Number,
            default: 0,
            min: 0,
            select: false,
        },
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        },
        collection: "users",
    }
);

const User =
    mongoose.models.User ||
    mongoose.model("User", userSchema);

export default User;
