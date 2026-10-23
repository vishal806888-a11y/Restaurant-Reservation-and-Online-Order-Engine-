
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const nav = useNavigate();

    const submit = async (e) => {
        e.preventDefault();
        setError("");

        if (!email.trim()) {
            setError("Please enter your email address.");
            return;
        }

        if (!password) {
            setError("Please enter your password.");
            return;
        }

        try {
            setLoading(true);

            const response = await api.post("/auth/login", {
                email: email.trim(),
                password,
            });

            login(response.data);

            nav(
                response.data.user.role === "STAFF"
                    ? "/admin"
                    : "/"
            );
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Invalid email or password."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-page">
            <form className="form" onSubmit={submit}>
                <span className="checkout-eyebrow">
                    THE FORK &amp; FLAME
                </span>

                {error && (
                    <div className="error" role="alert">
                        {error}
                    </div>
                )}

                <label>
                    Email

                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        autoComplete="email"
                        required
                    />
                </label>

                <label>
                    Password

                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                    />
                </label>

                <div className="forgot-password-row">
                    <Link
                        to="/forgot-password"
                        state={{ email }}
                    >
                        Forgot Password?
                    </Link>
                </div>

                <button
                    type="submit"
                    className="btn"
                    disabled={loading}
                >
                    {loading ? "Logging in..." : "Login"}
                </button>

                <div className="login-register-link">
                    <span>Don't have an account?</span>

                    <Link to="/register">
                        Create Account
                    </Link>
                </div>
            </form>
        </main>
    );
}
