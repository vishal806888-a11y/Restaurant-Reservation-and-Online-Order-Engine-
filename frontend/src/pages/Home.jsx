
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import WeekendPartyPass from "../components/WeekendPartyPass";

export default function Home() {
    const location = useLocation();
    const navigate = useNavigate();

    const [partySuccess, setPartySuccess] = useState(false);

    // Detect successful party registration.
    useEffect(() => {
        if (location.state?.partyApplied) {
            setPartySuccess(true);

            // Clear navigation state so the notification
            // does not appear again after refreshing.
            navigate("/", {
                replace: true,
                state: null,
            });
        }
    }, [location.state, navigate]);

    // Automatically hide the notification after 5 seconds.
    useEffect(() => {
        if (!partySuccess) {
            return;
        }

        const timer = setTimeout(() => {
            setPartySuccess(false);
        }, 5000);

        return () => clearTimeout(timer);
    }, [partySuccess]);

    return (
        <main className="luxury-home">

            {/* PARTY REGISTRATION SUCCESS NOTIFICATION */}
            {partySuccess && (
                <div
                    className="party-success-toast"
                    role="status"
                    aria-live="polite"
                >
                    <span className="party-success-icon">✓</span>

                    <span>Successfully applied for party!</span>

                    <button
                        type="button"
                        className="party-success-close"
                        onClick={() => setPartySuccess(false)}
                        aria-label="Close notification"
                    >
                        ×
                    </button>
                </div>
            )}

            {/* RESTAURANT HERO */}
            <section className="restaurant-hero">
                <img
                    src="/images/restaurant-interior.png"
                    alt="Fork & Flame restaurant interior"
                    className="restaurant-hero-image"
                />

                <div className="restaurant-hero-overlay" />

                <div className="restaurant-hero-content">
                    <span className="restaurant-eyebrow">
                        THE FORK &amp; FLAME
                    </span>

                    <h1>
                        An Evening
                        <br />
                        Worth Remembering
                    </h1>

                    <p>
                        Exceptional food, elegant surroundings,
                        <br />
                        and unforgettable moments.
                    </p>
                </div>
            </section>

            {/* RESTAURANT INTRO AND BOOKING BUTTONS */}
            <section className="restaurant-intro">
                <div className="intro-content">
                    <span className="intro-label">
                        WELCOME TO FORK &amp; FLAME
                    </span>

                    <h2>
                        Where every table
                        <br />
                        tells a story.
                    </h2>

                    <p>
                        Discover thoughtfully prepared dishes, warm
                        hospitality and an atmosphere designed for
                        memorable dining experiences.
                    </p>

                    <div className="home-actions">
                        <Link
                            to="/reserve"
                            className="home-primary-btn"
                        >
                            Book a Table
                        </Link>

                        <Link
                            to="/menu"
                            className="home-secondary-btn"
                        >
                            Explore Menu
                        </Link>
                    </div>
                </div>
            </section>

            {/* FLOATING WEEKEND PARTY PASS */}
            <section
                className="home-party-section"
                aria-label="Weekend party pass"
            >
                <WeekendPartyPass />
            </section>

            {/* RESTAURANT HIGHLIGHTS */}
            <section className="restaurant-features">
                <div className="restaurant-feature">
                    <span className="feature-number">01</span>

                    <div>
                        <h3>Elegant Dining</h3>
                        <p>
                            A refined atmosphere created for relaxed
                            and memorable evenings.
                        </p>
                    </div>
                </div>

                <div className="restaurant-feature">
                    <span className="feature-number">02</span>

                    <div>
                        <h3>Curated Menu</h3>
                        <p>
                            Carefully selected dishes prepared with
                            attention to every detail.
                        </p>
                    </div>
                </div>

                <div className="restaurant-feature">
                    <span className="feature-number">03</span>

                    <div>
                        <h3>Warm Hospitality</h3>
                        <p>
                            From your first visit to your final course,
                            every moment matters.
                        </p>
                    </div>
                </div>
            </section>

        </main>
    );
}
