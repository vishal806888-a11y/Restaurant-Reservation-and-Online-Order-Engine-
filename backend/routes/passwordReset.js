
import { Router } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import crypto from "crypto";

import User from "../models/User.js";

const router = Router();

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;

const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const validEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const createTransporter = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Email configuration is incomplete. Check SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS in backend .env."
    );
  }

  const port = Number(SMTP_PORT);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

const clearOtp = (user) => {
  user.passwordResetOtpHash = null;
  user.passwordResetOtpExpires = null;
  user.passwordResetOtpRequestedAt = null;
  user.passwordResetOtpAttempts = 0;
};

/* REQUEST OTP */
router.post("/request", async (req, res, next) => {
  let user;

  try {
    const email = normalizeEmail(req.body?.email);

    if (!validEmail(email)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    user = await User.findOne({ email }).select(
      "+passwordResetOtpHash " +
        "+passwordResetOtpExpires " +
        "+passwordResetOtpRequestedAt " +
        "+passwordResetOtpAttempts"
    );

    // Do not reveal whether the email is registered.
    if (!user) {
      return res.json({
        message:
          "If an account exists for this email, an OTP will be sent.",
      });
    }

    const now = Date.now();
    const lastRequest = user.passwordResetOtpRequestedAt
      ? new Date(user.passwordResetOtpRequestedAt).getTime()
      : 0;

    if (
      Number.isFinite(lastRequest) &&
      lastRequest > 0 &&
      now - lastRequest < RESEND_WAIT_MS
    ) {
      return res.status(429).json({
        message:
          "Please wait one minute before requesting another OTP.",
      });
    }

    // Check SMTP configuration before saving a new OTP.
    const transporter = createTransporter();

    const otp = crypto.randomInt(100000, 1000000).toString();

    user.passwordResetOtpHash = hashOtp(otp);
    user.passwordResetOtpExpires = new Date(now + OTP_EXPIRY_MS);
    user.passwordResetOtpRequestedAt = new Date(now);
    user.passwordResetOtpAttempts = 0;

    await user.save();

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: user.email,
        subject: "The Fork & Flame - Password Reset OTP",
        text: [
          `Hello ${user.name},`,
          "",
          `Your password reset OTP is: ${otp}`,
          "",
          "This OTP expires in 10 minutes.",
          "If you did not request this, ignore this email.",
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#222">
            <h2 style="color:#bd8b25">The Fork &amp; Flame</h2>
            <p>Hello ${escapeHtml(user.name)},</p>
            <p>Use this one-time password to reset your account password:</p>
            <div style="font-size:30px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f7f0df;text-align:center">
              ${otp}
            </div>
            <p>This OTP expires in <strong>10 minutes</strong>.</p>
            <p>If you did not request a password reset, ignore this email.</p>
          </div>
        `,
      });
    } catch (mailError) {
      clearOtp(user);
      await user.save();

      // Keep SMTP details out of the response sent to the browser.
      console.error("Password-reset email delivery failed:", mailError);
      return res.status(502).json({
        message:
          "We could not send the OTP email. Please check the email configuration and try again later.",
      });
    }

    return res.json({
      message:
        "If an account exists for this email, an OTP will be sent.",
    });
  } catch (error) {
    console.error("Password-reset request failed:", error.message);
    next(error);
  }
});

/* VERIFY OTP */
router.post("/verify", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp =
      typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

    if (!validEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "Enter a valid email and the six-digit OTP.",
      });
    }

    const user = await User.findOne({ email }).select(
      "+passwordResetOtpHash " +
        "+passwordResetOtpExpires " +
        "+passwordResetOtpAttempts"
    );

    if (
      !user ||
      !user.passwordResetOtpHash ||
      !user.passwordResetOtpExpires ||
      new Date(user.passwordResetOtpExpires).getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: "OTP is invalid or expired. Request a new OTP.",
      });
    }

    if ((user.passwordResetOtpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      clearOtp(user);
      await user.save();

      return res.status(429).json({
        message: "Too many incorrect attempts. Request a new OTP.",
      });
    }

    user.passwordResetOtpAttempts =
      (user.passwordResetOtpAttempts || 0) + 1;

    if (hashOtp(otp) !== user.passwordResetOtpHash) {
      await user.save();

      return res.status(400).json({
        message: "Incorrect OTP.",
      });
    }

    await user.save();

    return res.json({
      message: "OTP verified. You can now reset your password.",
    });
  } catch (error) {
    console.error("OTP verification failed:", error.message);
    next(error);
  }
});

/* RESET PASSWORD */
router.post("/reset", async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const otp =
      typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
    const newPassword = req.body?.newPassword;

    if (!validEmail(email) || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "Email and a valid six-digit OTP are required.",
      });
    }

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 128
    ) {
      return res.status(400).json({
        message: "Your new password must contain 8 to 128 characters.",
      });
    }

    const user = await User.findOne({ email }).select(
      "+password " +
        "+passwordResetOtpHash " +
        "+passwordResetOtpExpires " +
        "+passwordResetOtpAttempts"
    );

    if (
      !user ||
      !user.passwordResetOtpHash ||
      !user.passwordResetOtpExpires ||
      new Date(user.passwordResetOtpExpires).getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: "OTP is invalid or expired. Request a new OTP.",
      });
    }

    if ((user.passwordResetOtpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      clearOtp(user);
      await user.save();

      return res.status(429).json({
        message: "Too many incorrect attempts. Request a new OTP.",
      });
    }

    user.passwordResetOtpAttempts =
      (user.passwordResetOtpAttempts || 0) + 1;

    if (hashOtp(otp) !== user.passwordResetOtpHash) {
      await user.save();

      return res.status(400).json({
        message: "Incorrect OTP.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    clearOtp(user);

    await user.save();

    return res.json({
      message: "Password reset successfully. Please log in.",
    });
  } catch (error) {
    console.error("Password reset failed:", error.message);
    next(error);
  }
});

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]
  );
}

export default router;
