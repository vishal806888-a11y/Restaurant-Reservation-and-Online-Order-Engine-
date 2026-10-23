
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import api from "../services/api";
import "leaflet/dist/leaflet.css";
import "./TrackOrder.css";

const deliverySteps = [
    { status: "PLACED", title: "Order placed", description: "We received your order." },
    { status: "PREPARING", title: "Preparing your food", description: "The restaurant is preparing your meal." },
    { status: "READY_FOR_PICKUP", title: "Ready for pickup", description: "Your order is ready for the delivery person." },
    { status: "OUT_FOR_DELIVERY", title: "Out for delivery", description: "Your delivery person is on the way." },
    { status: "DELIVERED", title: "Delivered", description: "Enjoy your meal!" },
];

const deliveryIcon = L.divIcon({
    className: "delivery-map-icon",
    html: '<div class="delivery-map-pin">🚴</div>',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
});

function formatStatus(status) {
    return String(status || "PLACED").replaceAll("_", " ");
}

function formatAddress(address) {
    if (!address) return "Delivery address unavailable";

    if (typeof address === "string") return address;

    return [
        address.houseNumber,
        address.street,
        address.area,
        address.landmark,
        address.city,
        address.pinCode,
    ].filter(Boolean).join(", ");
}

function getStepIndex(status) {
    const index = deliverySteps.findIndex(
        (step) => step.status === status
    );

    return index < 0 ? 0 : index;
}

export default function TrackOrder() {
    const { id } = useParams();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadTracking = useCallback(async () => {
        try {
            const response = await api.get(
                `/orders/${encodeURIComponent(id)}/tracking`
            );

            setOrder(response.data);
            setError("");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load tracking details."
            );
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadTracking();
    }, [loadTracking]);

    // Refresh the order and GPS data while the tracking page is open.
    useEffect(() => {
        if (!order) return;

        const status = String(
            order.delivery_status || ""
        ).toUpperCase();

        if (["DELIVERED", "CANCELLED"].includes(status)) return;

        const timer = window.setInterval(loadTracking, 10000);

        return () => window.clearInterval(timer);
    }, [order, loadTracking]);

    if (loading) {
        return (
            <main className="track-page">
                <div className="track-panel">
                    <p>Loading your delivery...</p>
                </div>
            </main>
        );
    }

    if (error || !order) {
        return (
            <main className="track-page">
                <div className="track-panel track-error">
                    <h1>Tracking unavailable</h1>
                    <p>{error || "Order not found."}</p>
                    <Link to="/orders" className="track-back">
                        Back to My Orders
                    </Link>
                </div>
            </main>
        );
    }

    const status = String(
        order.delivery_status || "PLACED"
    ).toUpperCase();

    const cancelled = status === "CANCELLED";
    const delivered = status === "DELIVERED";
    const activeIndex = getStepIndex(status);

    const location = order.delivery_location;
    const hasCoordinates =
        Number.isFinite(Number(location?.latitude)) &&
        Number.isFinite(Number(location?.longitude)) &&
        location?.latitude !== null &&
        location?.longitude !== null;

    const position = hasCoordinates
        ? [Number(location.latitude), Number(location.longitude)]
        : null;

    const person = order.delivery_person;

    return (
        <main className="track-page">
            <div className="track-container">
                <Link to="/orders" className="track-back">
                    ← Back to My Orders
                </Link>

                <header className="track-header">
                    <div>
                        <p className="track-eyebrow">FORK & FLAME DELIVERY</p>
                        <h1>Track Your Progress</h1>
                        <p>
                            Order #{order.id} · {formatStatus(status)}
                        </p>
                    </div>

                    <span className={`track-status ${cancelled ? "is-cancelled" : ""}`}>
                        {formatStatus(status)}
                    </span>
                </header>

                {cancelled && (
                    <div className="track-notice cancelled-notice">
                        This order has been cancelled.
                    </div>
                )}

                {delivered && (
                    <div className="track-notice delivered-notice">
                        Your order has been delivered. Thank you for choosing Fork & Flame!
                    </div>
                )}

                <section className="track-panel">
                    <h2>Delivery progress</h2>

                    <div className="track-timeline">
                        {deliverySteps.map((step, index) => {
                            const completed = delivered || index < activeIndex;
                            const current = !delivered && index === activeIndex;

                            return (
                                <div
                                    key={step.status}
                                    className={`track-step ${
                                        completed ? "completed" : ""
                                    } ${current ? "current" : ""} ${
                                        cancelled ? "inactive" : ""
                                    }`}
                                >
                                    <div className="track-step-marker">
                                        {completed ? "✓" : index + 1}
                                    </div>

                                    <div className="track-step-content">
                                        <h3>{step.title}</h3>
                                        <p>{step.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section className="track-panel">
                    <h2>Live delivery map</h2>
                    <p className="track-muted">
                        {hasCoordinates
                            ? `Last location update: ${
                                location.updated_at
                                    ? new Date(location.updated_at).toLocaleString()
                                    : "Time unavailable"
                            }`
                            : "Waiting for the delivery person's device to send its first GPS location."}
                    </p>

                    {hasCoordinates ? (
                        <MapContainer
                            center={position}
                            zoom={16}
                            scrollWheelZoom
                            className="track-map"
                            key={`${position[0]}-${position[1]}`}
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <Marker position={position} icon={deliveryIcon}>
                                <Popup>
                                    {person?.name || "Delivery person"}<br />
                                    Current reported location
                                </Popup>
                            </Marker>
                        </MapContainer>
                    ) : (
                        <div className="track-map-placeholder">
                            <span className="track-map-emoji">📍</span>
                            <h3>Waiting for GPS signal</h3>
                            <p>
                                The map will show the delivery person's position
                                after real coordinates are received.
                            </p>
                        </div>
                    )}

                    {hasCoordinates && (
                        <p className="track-coordinates">
                            {Number(location.latitude).toFixed(6)},{" "}
                            {Number(location.longitude).toFixed(6)}
                        </p>
                    )}
                </section>

                <section className="track-panel">
                    <h2>Delivery details</h2>

                    <div className="track-details-grid">
                        <div>
                            <span>Customer</span>
                            <strong>{order.customer_name || "Customer"}</strong>
                        </div>

                        <div>
                            <span>Delivery address</span>
                            <strong>{formatAddress(order.delivery_address)}</strong>
                        </div>

                        <div>
                            <span>Delivery person</span>
                            <strong>{person?.name || "Not assigned yet"}</strong>
                        </div>

                        <div>
                            <span>Contact number</span>
                            {person?.phone ? (
                                <a href={`tel:${person.phone}`}>
                                    {person.phone}
                                </a>
                            ) : (
                                <strong>Not available yet</strong>
                            )}
                        </div>
                    </div>
                </section>

                <button
                    type="button"
                    className="track-refresh-btn"
                    onClick={loadTracking}
                >
                    Refresh tracking
                </button>
            </div>
        </main>
    );
}
