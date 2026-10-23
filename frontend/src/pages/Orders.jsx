
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Orders.css";

const FOOD_IMAGES = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=85",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=85",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=500&q=85",
    "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=500&q=85",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=500&q=85",
];

export default function Orders() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [expandedOrders, setExpandedOrders] = useState({});

    const loadOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/orders/my");
            setOrders(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Failed to load orders:", err);
            setError(
                err.response?.data?.message ||
                "Unable to load your orders."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    const toggleOrderDetails = (id) => {
        setExpandedOrders((previous) => ({
            ...previous,
            [id]: !previous[id],
        }));
    };

    const openTracking = (order) => {
        const orderId = order.id ?? order._id;

        if (!orderId) {
            setError("Unable to open tracking because the order ID is missing.");
            return;
        }

        navigate(`/track-order/${orderId}`);
    };

    const isCancelled = (order) => {
        const status = String(order.status || "").toUpperCase();
        const deliveryStatus = String(
            order.delivery_status || order.deliveryStatus || ""
        ).toUpperCase();

        return (
            status === "CANCELLED" ||
            deliveryStatus === "CANCELLED"
        );
    };

    const formatDate = (value) => {
        if (!value) return "Date unavailable";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const formatTime = (value) => {
        if (!value) return "—";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatAmount = (value) => {
        const amount = Number(value);
        return Number.isFinite(amount) ? amount.toFixed(2) : "0.00";
    };

    const getStatusClass = (status) => {
        switch (String(status || "PENDING").toUpperCase()) {
            case "COMPLETED":
                return "order-status completed";
            case "READY":
                return "order-status ready";
            case "PREPARING":
                return "order-status preparing";
            case "CONFIRMED":
                return "order-status confirmed";
            case "CANCELLED":
                return "order-status cancelled";
            default:
                return "order-status pending";
        }
    };

    const getStatusLabel = (status) => {
        const labels = {
            COMPLETED: "Completed",
            READY: "Ready",
            PREPARING: "Preparing",
            CONFIRMED: "Confirmed",
            CANCELLED: "Cancelled",
            PENDING: "Pending",
        };

        const key = String(status || "PENDING").toUpperCase();
        return labels[key] || key.replaceAll("_", " ");
    };

    const isOnlineDelivery = (order) =>
        String(order.order_type || order.orderType || "")
            .toUpperCase() === "ONLINE_DELIVERY";

    const formatDeliveryAddress = (address) => {
        if (!address) return "Address not available";

        if (typeof address === "string") {
            return address.trim() || "Address not available";
        }

        if (typeof address === "object" && !Array.isArray(address)) {
            const parts = [
                address.houseNumber,
                address.street,
                address.area,
                address.city,
                address.pinCode,
                address.landmark
                    ? `Landmark: ${address.landmark}`
                    : "",
            ].filter(Boolean);

            return parts.join(", ") || "Address not available";
        }

        return "Address not available";
    };

    const getItemName = (item) =>
        item.menu_item_name ||
        item.menuItemName ||
        item.item_name ||
        item.name ||
        item.menuItem?.name ||
        "Menu item";

    const getItemQuantity = (item) =>
        Number(item.quantity ?? item.qty ?? 1);

    const getItemPrice = (item) =>
        Number(
            item.price ??
            item.unit_price ??
            item.unitPrice ??
            item.menuItem?.price ??
            0
        );

    const getItemTotal = (item) => {
        const savedTotal =
            item.subtotal ??
            item.item_total ??
            item.itemTotal;

        return savedTotal != null
            ? Number(savedTotal) || 0
            : getItemPrice(item) * getItemQuantity(item);
    };

    const getOrderItems = (order) =>
        Array.isArray(order.items)
            ? order.items
            : Array.isArray(order.order_items)
                ? order.order_items
                : [];

    const getTotal = (order) =>
        order.total_amount ?? order.totalAmount ?? 0;

    const getSubtotal = (order, items) => {
        if (
            order.subtotal != null ||
            order.subtotal_amount != null
        ) {
            return Number(
                order.subtotal ?? order.subtotal_amount
            ) || 0;
        }

        return items.reduce(
            (sum, item) => sum + getItemTotal(item),
            0
        );
    };

    const getGst = (order, subtotal) =>
        order.gst_amount != null || order.gst != null
            ? Number(order.gst_amount ?? order.gst) || 0
            : subtotal * 0.05;

    return (
        <main className="orders-page">
            <section className="orders-hero">
                <div className="orders-hero-content">
                    <span className="orders-eyebrow">
                        THE FORK & FLAME
                    </span>
                    <h1>My Orders</h1>
                    <p>Your dining journey, all in one place.</p>
                </div>

                <div className="orders-hero-icon" aria-hidden="true">
                    🍽
                </div>
            </section>

            <section className="orders-content">
                <div className="orders-toolbar">
                    <div className="orders-heading-group">
                        <div className="orders-heading-icon">▤</div>

                        <div className="orders-heading-copy">
                            <span className="orders-section-label">
                                ORDER HISTORY
                            </span>

                            <h2>
                                {orders.length}{" "}
                                {orders.length === 1 ? "Order" : "Orders"}
                            </h2>
                        </div>

                        <div className="orders-heading-line" />
                    </div>

                    <button
                        type="button"
                        className="orders-refresh-btn"
                        onClick={loadOrders}
                        disabled={loading}
                    >
                        <span className={loading ? "refresh-spinning" : ""}>
                            ↻
                        </span>
                        Refresh
                    </button>
                </div>

                {loading && (
                    <div className="orders-state">
                        <div className="orders-spinner" />
                        <p>Preparing your order history...</p>
                    </div>
                )}

                {!loading && error && (
                    <div className="orders-state orders-error">
                        <h3>Could not load orders</h3>
                        <p>{error}</p>

                        <button
                            type="button"
                            className="orders-refresh-btn"
                            onClick={loadOrders}
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {!loading && !error && orders.length === 0 && (
                    <div className="orders-empty">
                        <div className="orders-empty-icon">🍽</div>
                        <span>NO ORDERS YET</span>
                        <h2>Your next favourite meal awaits.</h2>
                        <p>
                            Explore our menu and discover something delicious.
                        </p>

                        <Link to="/menu" className="orders-menu-btn">
                            Explore Menu
                        </Link>
                    </div>
                )}

                {!loading && !error && orders.length > 0 && (
                    <div className="orders-list">
                        {orders.map((order, index) => {
                            const orderId = order.id ?? order._id;
                            const online = isOnlineDelivery(order);
                            const cancelled = isCancelled(order);
                            const expanded = Boolean(
                                expandedOrders[orderId]
                            );

                            const items = getOrderItems(order);
                            const subtotal = getSubtotal(order, items);
                            const gst = getGst(order, subtotal);
                            const total = Number(getTotal(order)) || 0;

                            const image =
                                FOOD_IMAGES[
                                    Math.abs(Number(orderId) || index) %
                                        FOOD_IMAGES.length
                                ];

                            const address = formatDeliveryAddress(
                                order.delivery_address ??
                                order.deliveryAddress
                            );

                            return (
                                <article
                                    className={`order-card ${
                                        expanded ? "order-card-expanded" : ""
                                    }`}
                                    key={orderId}
                                >
                                    <div className="order-card-layout">
                                        <div className="order-image-column">
                                            <img
                                                className="order-food-image"
                                                src={image}
                                                alt="Food from Fork & Flame"
                                                loading="lazy"
                                            />

                                            <span className="order-type-badge">
                                                {online
                                                    ? "♧ ONLINE DELIVERY"
                                                    : "♜ DINE IN"}
                                            </span>
                                        </div>

                                        <div className="order-main">
                                            <div className="order-card-top">
                                                <div className="order-title-line">
                                                    <span className="order-label">
                                                        ORDER
                                                    </span>

                                                    <strong className="order-id">
                                                        #{orderId}
                                                    </strong>

                                                    <span
                                                        className={getStatusClass(
                                                            order.status
                                                        )}
                                                    >
                                                        <span className="status-dot" />
                                                        {getStatusLabel(
                                                            order.status
                                                        )}
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="delivery-details-toggle order-top-toggle"
                                                    onClick={() =>
                                                        toggleOrderDetails(
                                                            orderId
                                                        )
                                                    }
                                                    aria-expanded={expanded}
                                                >
                                                    {expanded
                                                        ? "Hide Details"
                                                        : "More Details"}

                                                    <span>
                                                        {expanded ? "⌃" : "⌄"}
                                                    </span>
                                                </button>
                                            </div>

                                            <div className="order-summary-grid">
                                                <div className="order-summary-item">
                                                    <span className="summary-icon">
                                                        ♙
                                                    </span>

                                                    <div>
                                                        <small>CUSTOMER</small>
                                                        <strong>
                                                            {order.customer_name ||
                                                                order.customerName ||
                                                                "Customer"}
                                                        </strong>
                                                    </div>
                                                </div>

                                                <div className="order-summary-item">
                                                    <span className="summary-icon">
                                                        ♜
                                                    </span>

                                                    <div>
                                                        <small>RESTAURANT</small>
                                                        <strong>
                                                            {order.restaurant_name ||
                                                                order.restaurantName ||
                                                                "The Fork & Flame"}
                                                        </strong>
                                                    </div>
                                                </div>

                                                <div className="order-summary-item">
                                                    <span className="summary-icon">
                                                        ▦
                                                    </span>

                                                    <div>
                                                        <small>DATE</small>
                                                        <strong>
                                                            {formatDate(
                                                                order.created_at ??
                                                                order.createdAt
                                                            )}
                                                        </strong>
                                                    </div>
                                                </div>

                                                <div className="order-summary-item">
                                                    <span className="summary-icon">
                                                        ◷
                                                    </span>

                                                    <div>
                                                        <small>TIME</small>
                                                        <strong>
                                                            {formatTime(
                                                                order.created_at ??
                                                                order.createdAt
                                                            )}
                                                        </strong>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="order-bottom-summary">
                                                <div className="order-total-highlight">
                                                    <span className="summary-icon">
                                                        ♧
                                                    </span>

                                                    <div>
                                                        <small>TOTAL AMOUNT</small>
                                                        <strong>
                                                            ₹{formatAmount(total)}
                                                        </strong>
                                                    </div>
                                                </div>

                                                {online && (
                                                    <div className="order-address-summary">
                                                        <span className="summary-icon">
                                                            ♧
                                                        </span>

                                                        <div>
                                                            <small>
                                                                DELIVERY ADDRESS
                                                            </small>
                                                            <strong>{address}</strong>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Tracking button: shown only for online delivery orders */}
                                            {online && (
                                                <div className="order-tracking-action">
                                                    <button
                                                        type="button"
                                                        className="track-progress-btn"
                                                        onClick={() =>
                                                            openTracking(order)
                                                        }
                                                        disabled={cancelled || !orderId}
                                                        title={
                                                            cancelled
                                                                ? "Tracking is unavailable for cancelled orders"
                                                                : "Track your delivery progress"
                                                        }
                                                    >
                                                        <span aria-hidden="true">
                                                            📍
                                                        </span>

                                                        Track Your Progress

                                                        <span aria-hidden="true">
                                                            →
                                                        </span>
                                                    </button>

                                                    {cancelled && (
                                                        <p className="tracking-unavailable">
                                                            Tracking is unavailable
                                                            for cancelled orders.
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {expanded && (
                                                <div className="order-details-panel">
                                                    {online ? (
                                                        <>
                                                            <section className="delivery-information">
                                                                <h3>
                                                                    <span>♧</span>
                                                                    Delivery Information
                                                                </h3>

                                                                <dl className="delivery-info-list">
                                                                    <div>
                                                                        <dt>
                                                                            Customer Name
                                                                        </dt>
                                                                        <dd>
                                                                            {order.customer_name ||
                                                                                order.customerName ||
                                                                                "Not available"}
                                                                        </dd>
                                                                    </div>

                                                                    <div>
                                                                        <dt>Email</dt>
                                                                        <dd>
                                                                            {order.customer_email ||
                                                                                order.customerEmail ||
                                                                                "Not available"}
                                                                        </dd>
                                                                    </div>

                                                                    <div>
                                                                        <dt>Phone</dt>
                                                                        <dd>
                                                                            {order.customer_phone ||
                                                                                order.customerPhone ||
                                                                                "Not available"}
                                                                        </dd>
                                                                    </div>

                                                                    <div>
                                                                        <dt>
                                                                            Delivery Address
                                                                        </dt>
                                                                        <dd>{address}</dd>
                                                                    </div>

                                                                    <div>
                                                                        <dt>
                                                                            Payment Method
                                                                        </dt>
                                                                        <dd>
                                                                            {order.payment_method ||
                                                                                order.paymentMethod ||
                                                                                "Not available"}
                                                                        </dd>
                                                                    </div>

                                                                    <div>
                                                                        <dt>
                                                                            Delivery Status
                                                                        </dt>
                                                                        <dd>
                                                                            <span className="delivery-status-pill">
                                                                                {order.delivery_status ||
                                                                                    order.deliveryStatus ||
                                                                                    "PLACED"}
                                                                            </span>
                                                                        </dd>
                                                                    </div>

                                                                    <div>
                                                                        <dt>
                                                                            Delivery Person
                                                                        </dt>
                                                                        <dd>
                                                                            {order.delivery_person ||
                                                                                order.deliveryPerson ||
                                                                                "Not assigned"}
                                                                        </dd>
                                                                    </div>
                                                                </dl>
                                                            </section>

                                                            <section className="delivery-items-section">
                                                                <h3>
                                                                    <span>♜</span>
                                                                    Items Ordered
                                                                </h3>

                                                                {items.length ? (
                                                                    <div className="delivery-items-table-wrap">
                                                                        <table className="delivery-items-table">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th>ITEM</th>
                                                                                    <th>QTY</th>
                                                                                    <th>PRICE</th>
                                                                                    <th>TOTAL</th>
                                                                                </tr>
                                                                            </thead>

                                                                            <tbody>
                                                                                {items.map(
                                                                                    (item, itemIndex) => (
                                                                                        <tr
                                                                                            key={
                                                                                                item.id ??
                                                                                                item.menu_item_id ??
                                                                                                item.menuItemId ??
                                                                                                itemIndex
                                                                                            }
                                                                                        >
                                                                                            <td>
                                                                                                {getItemName(
                                                                                                    item
                                                                                                )}
                                                                                            </td>
                                                                                            <td>
                                                                                                {getItemQuantity(
                                                                                                    item
                                                                                                )}
                                                                                            </td>
                                                                                            <td>
                                                                                                ₹
                                                                                                {formatAmount(
                                                                                                    getItemPrice(
                                                                                                        item
                                                                                                    )
                                                                                                )}
                                                                                            </td>
                                                                                            <td>
                                                                                                ₹
                                                                                                {formatAmount(
                                                                                                    getItemTotal(
                                                                                                        item
                                                                                                    )
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                    )
                                                                                )}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                ) : (
                                                                    <p className="delivery-no-items">
                                                                        Item details are not available.
                                                                    </p>
                                                                )}

                                                                <div className="delivery-bill">
                                                                    <div>
                                                                        <span>Subtotal</span>
                                                                        <strong>
                                                                            ₹{formatAmount(subtotal)}
                                                                        </strong>
                                                                    </div>

                                                                    <div>
                                                                        <span>GST (5%)</span>
                                                                        <strong>
                                                                            ₹{formatAmount(gst)}
                                                                        </strong>
                                                                    </div>

                                                                    {Number(
                                                                        order.delivery_charge ??
                                                                        order.deliveryCharge ??
                                                                        0
                                                                    ) > 0 && (
                                                                        <div>
                                                                            <span>
                                                                                Delivery Charge
                                                                            </span>
                                                                            <strong>
                                                                                ₹
                                                                                {formatAmount(
                                                                                    order.delivery_charge ??
                                                                                    order.deliveryCharge
                                                                                )}
                                                                            </strong>
                                                                        </div>
                                                                    )}

                                                                    <div className="delivery-bill-total">
                                                                        <span>Total Paid</span>
                                                                        <strong>
                                                                            ₹{formatAmount(total)}
                                                                        </strong>
                                                                    </div>
                                                                </div>
                                                            </section>
                                                        </>
                                                    ) : (
                                                        <section className="dine-in-details">
                                                            <h3>Order Details</h3>

                                                            {items.length ? (
                                                                <div className="delivery-items-table-wrap">
                                                                    <table className="delivery-items-table">
                                                                        <thead>
                                                                            <tr>
                                                                                <th>ITEM</th>
                                                                                <th>QTY</th>
                                                                                <th>PRICE</th>
                                                                                <th>TOTAL</th>
                                                                            </tr>
                                                                        </thead>

                                                                        <tbody>
                                                                            {items.map(
                                                                                (item, itemIndex) => (
                                                                                    <tr
                                                                                        key={
                                                                                            item.id ??
                                                                                            item.menu_item_id ??
                                                                                            item.menuItemId ??
                                                                                            itemIndex
                                                                                        }
                                                                                    >
                                                                                        <td>
                                                                                            {getItemName(
                                                                                                item
                                                                                            )}
                                                                                        </td>
                                                                                        <td>
                                                                                            {getItemQuantity(
                                                                                                item
                                                                                            )}
                                                                                        </td>
                                                                                        <td>
                                                                                            ₹
                                                                                            {formatAmount(
                                                                                                getItemPrice(
                                                                                                    item
                                                                                                )
                                                                                            )}
                                                                                        </td>
                                                                                        <td>
                                                                                            ₹
                                                                                            {formatAmount(
                                                                                                getItemTotal(
                                                                                                    item
                                                                                                )
                                                                                            )}
                                                                                        </td>
                                                                                    </tr>
                                                                                )
                                                                            )}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            ) : (
                                                                <p className="delivery-no-items">
                                                                    Item details are not available.
                                                                </p>
                                                            )}

                                                            <div className="delivery-bill">
                                                                <div className="delivery-bill-total">
                                                                    <span>Total Paid</span>
                                                                    <strong>
                                                                        ₹{formatAmount(total)}
                                                                    </strong>
                                                                </div>
                                                            </div>
                                                        </section>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}

                <footer className="orders-footer">
                    <span />
                    <b>♜ &nbsp; THE FORK & FLAME</b>
                    <span />
                </footer>
            </section>
        </main>
    );
}
