
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

const RESEND_WAIT_SECONDS = 60;

export default function ForgotPassword() {
    const location = useLocation();
    const nav = useNavigate();

    const [email, setEmail] = useState(
        location.state?.email || ""
    );
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [step, setStep] = useState(1);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);

    // Countdown for the resend button.
    useEffect(() => {
        if (resendCountdown <= 0) return;

        const timer = setTimeout(() => {
            setResendCountdown((previous) => previous - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [resendCountdown]);

    // Request an OTP.
    const requestOtp = async (e) => {
        e?.preventDefault();

        setError("");
        setMessage("");

        if (!email.trim()) {
            setError("Please enter your registered email.");
            return;
        }

        try {
            setLoading(true);

            const response = await api.post(
                "/auth/password-reset/request",
                { email: email.trim() }
            );

            setMessage(response.data.message);
            setStep(2);
            setResendCountdown(RESEND_WAIT_SECONDS);
        } catch (err) {
            const status = err.response?.status;

            setError(
                err.response?.data?.message ||
                (status === 429
                    ? "Please wait one minute before requesting another OTP."
                    : "Unable to send the OTP. Please try again.")
            );

            // Respect the backend's one-minute resend restriction.
            if (status === 429) {
                setResendCountdown(RESEND_WAIT_SECONDS);
            }
        } finally {
            setLoading(false);
        }
    };

    // Resend OTP using the same backend endpoint.
    const handleResendOtp = async () => {
        if (loading || resendCountdown > 0) return;

        await requestOtp();
    };

    // Reset the password.
    const resetPassword = async (e) => {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!/^\d{6}$/.test(otp.trim())) {
            setError("Enter the six-digit OTP from your email.");
            return;
        }

        if (newPassword.length < 8) {
            setError(
                "Your new password must have at least 8 characters."
            );
            return;
        }

        if (newPassword.length > 128) {
            setError("Password must not exceed 128 characters.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("The passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            const response = await api.post(
                "/auth/password-reset/reset",
                {
                    email: email.trim(),
                    otp: otp.trim(),
                    newPassword,
                }
            );

            setMessage(response.data.message);

            setTimeout(() => {
                nav("/login", { replace: true });
            }, 1500);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to reset your password. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-page">
            <section className="form forgot-password-form">
                <span className="checkout-eyebrow">
                    THE FORK &amp; FLAME
                </span>

                <h1>
                    {step === 1
                        ? "Forgot Password?"
                        : "Reset Password"}
                </h1>

                <p className="forgot-password-description">
                    {step === 1
                        ? "Enter your registered email address to receive a one-time password."
                        : "Enter the OTP sent to your email and choose a new password."}
                </p>

                {error && (
                    <div className="error" role="alert">
                        {error}
                    </div>
                )}

                {message && (
                    <div
                        className="forgot-password-message"
                        role="status"
                    >
                        {message}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={requestOtp}>
                        <label>
                            Email

                            <input
                                type="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                placeholder="Enter your registered email"
                                autoComplete="email"
                                required
                            />
                        </label>

                        <button
                            type="submit"
                            className="btn"
                            disabled={loading}
                        >
                            {loading ? "Sending OTP..." : "Send OTP"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={resetPassword}>
                        <label>
                            Registered Email

                            <input
                                type="email"
                                value={email}
                                readOnly
                            />
                        </label>

                        <label>
                            One-Time Password (OTP)

                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={otp}
                                onChange={(e) =>
                                    setOtp(
                                        e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6)
                                    )
                                }
                                placeholder="Enter 6-digit OTP"
                                required
                            />
                        </label>

                        <label>
                            New Password

                            <input
                                type="password"
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) =>
                                    setNewPassword(e.target.value)
                                }
                                placeholder="At least 8 characters"
                                minLength={8}
                                maxLength={128}
                                required
                            />
                        </label>

                        <label>
                            Confirm New Password

                            <input
                                type="password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) =>
                                    setConfirmPassword(e.target.value)
                                }
                                placeholder="Re-enter new password"
                                minLength={8}
                                maxLength={128}
                                required
                            />
                        </label>

                        <button
                            type="submit"
                            className="btn"
                            disabled={loading}
                        >
                            {loading
                                ? "Updating Password..."
                                : "Reset Password"}
                        </button>

                        <button
                            type="button"
                            className="resend-otp-btn"
                            onClick={handleResendOtp}
                            disabled={
                                loading || resendCountdown > 0
                            }
                        >
                            {loading
                                ? "Sending..."
                                : resendCountdown > 0
                                    ? `Resend OTP in ${resendCountdown}s`
                                    : "Send a new OTP"}
                        </button>
                    </form>
                )}

                <div className="login-register-link">
                    <Link to="/login">Back to Login</Link>
                </div>
            </section>
        </main>
    );
}
