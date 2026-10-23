
import { useNavigate } from "react-router-dom";
import "./PartyDetails.css";

export default function PartyDetails() {
    const navigate = useNavigate();

    return (
        <main className="party-details-page">
            <section className="party-details-card">
                <p className="party-details-eyebrow">
                    THE FORK &amp; FLAME
                </p>

                <h1>Weekend Party Experience</h1>

                <p className="party-details-intro">
                    Make your weekend unforgettable with live music,
                    dance performances and a premium party atmosphere.
                </p>

                <div className="party-performer-grid">
                    <article className="party-performer">
                        <h2>Pradeep Kumar</h2>
                        <p>
                            Featured singer concept for a memorable live
                            music experience.
                        </p>
                        <small>Artist appearance subject to confirmation.</small>
                    </article>

                    <article className="party-performer">
                        <h2>Sreeleela</h2>
                        <p>
                            Proposed special guest for a dance and
                            entertainment experience.
                        </p>
                        <small>Artist appearance subject to confirmation.</small>
                    </article>
                </div>

                <div className="party-event-info">
                    <p><strong>Days:</strong> Saturday and Sunday</p>
                    <p>
                        <strong>Entertainment:</strong> Live music,
                        dance and guest performances
                    </p>
                    <p>
                        <strong>Entry:</strong> 18+ only, subject to
                        applicable law and venue rules
                    </p>
                    <p>
                        <strong>Age verification:</strong> Required
                        before entry
                    </p>
                </div>

                <button
                    type="button"
                    className="party-register-button"
                    onClick={() => navigate("/party-register")}
                >
                    REGISTER FOR THE PARTY →
                </button>

                <button
                    type="button"
                    className="party-back-button"
                    onClick={() => navigate("/")}
                >
                    BACK TO HOME
                </button>
            </section>
        </main>
    );
}
