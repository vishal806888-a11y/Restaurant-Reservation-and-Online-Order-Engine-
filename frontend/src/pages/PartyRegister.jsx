
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./PartyRegister.css";



export default function PartyRegister() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        phone: "",
        eventDay: "Saturday",
        guests: "1",
        dateOfBirth: "",
        ageConfirmed: false,
        termsAccepted: false,
    });

    const [message, setMessage] = useState("");

    function updateField(event) {
        const { name, value, type, checked } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value,
        }));

        setMessage("");
    }

    function handleSubmit(event) {
        event.preventDefault();

        if (!form.dateOfBirth) {
            setMessage("Please enter your date of birth.");
            return;
        }

        const dob = new Date(`${form.dateOfBirth}T00:00:00`);
        const today = new Date();

        let age = today.getFullYear() - dob.getFullYear();
        const monthDifference = today.getMonth() - dob.getMonth();

        if (
            monthDifference < 0 ||
            (monthDifference === 0 && today.getDate() < dob.getDate())
        ) {
            age--;
        }

        if (Number.isNaN(dob.getTime()) || dob > today || age < 18) {
            setMessage("You must be at least 18 years old to apply.");
            return;
        }

        if (!form.ageConfirmed || !form.termsAccepted) {
            setMessage(
                "Please confirm your age and accept the event terms."
            );
            return;
        }

        // Frontend-only submission: no backend request is made here.
        navigate("/", {
            replace: true,
            state: {
                partyApplied: true,
                applicantName: form.fullName.trim(),
            },
        });
    }

    return (
        <main className="party-registration-page">
            <div className="club-background-glow" />

            <section className="party-registration-card">
                <Link to="/party-details" className="party-back-link">
                    ← Back to Weekend Party Experience
                </Link>

                <p className="registration-eyebrow">
                    THE FORK &amp; FLAME PRESENTS
                </p>

                <h1>Weekend Party Pass</h1>

                <p className="registration-subtitle">
                    Saturday &amp; Sunday · Live Music · Dance · Guest Artists
                </p>

                <div className="registration-age-label">
                    18+ ONLY · AGE VERIFICATION REQUIRED
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="party-registration-form"
                >
                    <div className="registration-field">
                        <label htmlFor="fullName">Full name</label>
                        <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            value={form.fullName}
                            onChange={updateField}
                            placeholder="Enter your full name"
                            autoComplete="name"
                            required
                        />
                    </div>

                    <div className="registration-field">
                        <label htmlFor="email">Email address</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={updateField}
                            placeholder="you@example.com"
                            autoComplete="email"
                            required
                        />
                    </div>

                    <div className="registration-field">
                        <label htmlFor="phone">Phone number</label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={form.phone}
                            onChange={updateField}
                            placeholder="Enter your phone number"
                            autoComplete="tel"
                            required
                        />
                    </div>

                    <div className="registration-field">
                        <label htmlFor="dateOfBirth">Date of birth</label>
                        <input
                            id="dateOfBirth"
                            name="dateOfBirth"
                            type="date"
                            value={form.dateOfBirth}
                            onChange={updateField}
                            max={new Date().toISOString().slice(0, 10)}
                            required
                        />
                    </div>

                    <div className="registration-field">
                        <label htmlFor="eventDay">Preferred event day</label>
                        <select
                            id="eventDay"
                            name="eventDay"
                            value={form.eventDay}
                            onChange={updateField}
                        >
                            <option value="Saturday">Saturday</option>
                            <option value="Sunday">Sunday</option>
                        </select>
                    </div>

                    <div className="registration-field">
                        <label htmlFor="guests">Number of attendees</label>
                        <select
                            id="guests"
                            name="guests"
                            value={form.guests}
                            onChange={updateField}
                        >
                            <option value="1">1 person</option>
                            <option value="2">2 people</option>
                            <option value="3">3 people</option>
                            <option value="4">4 people</option>
                        </select>
                    </div>

                    <label className="registration-checkbox">
                        <input
                            type="checkbox"
                            name="ageConfirmed"
                            checked={form.ageConfirmed}
                            onChange={updateField}
                            required
                        />
                        <span>
                            I confirm that I am 18 years of age or older.
                        </span>
                    </label>

                    <label className="registration-checkbox">
                        <input
                            type="checkbox"
                            name="termsAccepted"
                            checked={form.termsAccepted}
                            onChange={updateField}
                            required
                        />
                        <span>
                            I agree to the venue's entry rules and event terms.
                        </span>
                    </label>

                    {message && (
                        <p className="registration-message" role="alert">
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="registration-submit-button"
                    >
                        SUBMIT APPLICATION →
                    </button>

                    <p className="registration-note">
                        Submission does not guarantee entry. Valid age
                        verification and venue approval may be required.
                    </p>
                </form>
            </section>
        </main>
    );
}
