
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const VALID_ROLES = [
    "OWNER",
    "MANAGER",
    "CUSTOMER",
    "WORKER",
    "DELIVERY",

    // Keep only while legacy STAFF accounts still exist.
    "STAFF",
];

export async function requireAuth(req, res, next) {
    try {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                message:
                    "Authentication is not configured on the server.",
            });
        }

        const authorization =
            req.headers.authorization || "";

        if (!authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const token = authorization.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const decoded = jwt.verify(token, secret);

        if (
            !decoded ||
            typeof decoded !== "object" ||
            !decoded.id
        ) {
            return res.status(401).json({
                message: "Invalid authentication token",
            });
        }

        const id = Number(decoded.id);

        if (
            !Number.isSafeInteger(id) ||
            id <= 0
        ) {
            return res.status(401).json({
                message: "Invalid authentication token",
            });
        }

        // Load the current account rather than trusting the role
        // embedded in an older JWT.
        const user = await User.findOne({
            legacyId: id,
        }).select("legacyId name email phone role");

        if (!user) {
            return res.status(401).json({
                message: "User account no longer exists",
            });
        }

        if (!VALID_ROLES.includes(user.role)) {
            return res.status(403).json({
                message: "Your account has an invalid role",
            });
        }

        req.user = {
            id: user.legacyId,
            mongoId: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
        };

        return next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                message:
                    "Your session has expired. Please log in again.",
            });
        }

        if (
            error.name === "JsonWebTokenError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired token",
            });
        }

        return next(error);
    }
}

/**
 * Allows only the specified roles.
 *
 * Usage:
 * router.get(
 *     "/admin",
 *     requireAuth,
 *     requireRole("OWNER"),
 *     handler
 * );
 */
export function requireRole(...allowedRoles) {
    return function (req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message:
                    "You do not have permission to perform this action.",
            });
        }

        return next();
    };
}

/**
 * Owner and manager only.
 */
export function requireManagement(req, res, next) {
    return requireRole("OWNER", "MANAGER")(
        req,
        res,
        next
    );
}

/**
 * Owner, manager and worker access.
 * Legacy STAFF is supported temporarily.
 */
export function requireStaff(req, res, next) {
    return requireRole(
        "OWNER",
        "MANAGER",
        "WORKER",
        "STAFF"
    )(req, res, next);
}

/**
 * Owner and manager can manage delivery operations.
 * DELIVERY accounts can access delivery endpoints, but
 * endpoints must still verify assignment to each order.
 */
export function requireDelivery(req, res, next) {
    return requireRole(
        "OWNER",
        "MANAGER",
        "DELIVERY"
    )(req, res, next);
}
