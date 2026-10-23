import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] =
        useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const nav = useNavigate();

    const submit = async (e) => {
        e.preventDefault();

        setError("");

        if (!name.trim()) {
            setError("Please enter your full name.");
            return;
        }

        if (!email.trim()) {
            setError("Please enter your email address.");
            return;
        }

        if (!password) {
            setError("Please create a password.");
            return;
        }

        if (password.length < 6) {
            setError(
                "Password must be at least 6 characters."
            );
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        try {
            setLoading(true);

            await api.post(
                "/auth/register",
                {
                    name: name.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    password,
                    confirmPassword
                }
            );

            nav("/login");

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Could not create your account. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-page">

            <form
                className="form"
                onSubmit={submit}
            >

                <span className="checkout-eyebrow">
                    THE FORK & FLAME
                </span>

                <h1>
                    Create Account
                </h1>

                <p>
                    Create your account and
                    start your dining experience.
                </p>

                {error && (
                    <div className="error">
                        {error}
                    </div>
                )}

                <label>
                    Full Name

                    <input
                        type="text"
                        value={name}
                        onChange={(e) =>
                            setName(
                                e.target.value
                            )
                        }
                        placeholder="Enter your full name"
                    />
                </label>

                <label>
                    Email Address

                    <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                            setEmail(
                                e.target.value
                            )
                        }
                        placeholder="Enter your email"
                    />
                </label>

                <label>
                    Phone Number

                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) =>
                            setPhone(
                                e.target.value
                            )
                        }
                        placeholder="Enter your phone number"
                    />
                </label>

                <label>
                    Password

                    <input
                        type="password"
                        value={password}
                        onChange={(e) =>
                            setPassword(
                                e.target.value
                            )
                        }
                        placeholder="Create a password"
                    />
                </label>

                <label>
                    Confirm Password

                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) =>
                            setConfirmPassword(
                                e.target.value
                            )
                        }
                        placeholder="Confirm your password"
                    />
                </label>

                <button
                    type="submit"
                    className="btn"
                    disabled={loading}
                >
                    {loading
                        ? "Creating Account..."
                        : "Create Account"}
                </button>

                <div className="login-register-link">
                    <span>
                        Already have an account?
                    </span>

                    <Link to="/login">
                        Login
                    </Link>
                </div>

            </form>

        </main>
    );
}