
import { useNavigate } from "react-router-dom";
import "./WeekendPartyPass.css";

export default function WeekendPartyPass() {
    const navigate = useNavigate();

    return (
        <section className="weekend-party-section">
            <button
                type="button"
                className="weekend-party-ticket"
                onClick={() => navigate("/party-details")}
                aria-label="View weekend party details"
            >
                <img
                    src="/images/weekend-party-pass.png"
                    alt="Fork and Flame Weekend Party Pass, Saturday and Sunday, 18+"
                    className="weekend-party-ticket-image"
                />
            </button>
        </section>
    );
}
