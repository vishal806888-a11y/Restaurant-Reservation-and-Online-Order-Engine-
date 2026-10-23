import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import "./OnlineDelivery.css";

const formatPrice = (amount) =>
    Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const foodImages = {
    "Paneer Tikka": "/images/paneer-tikka.jpg",
    "Chicken 65": "/images/chicken-65.jpg",
    "Butter Chicken": "/images/butter-chicken.jpg",
    "Paneer Butter Masala": "/images/paneer-butter-masala.jpg",
    "Margherita Pizza": "/images/margherita-pizza.jpg",
    "Farmhouse Pizza": "/images/farmhouse-pizza.jpg",
    "Classic Burger": "/images/classic-burger.jpg",
    "Penne Alfredo": "/images/penne-alfredo.jpg",
    "Chocolate Brownie": "/images/chocolate-brownie.jpg",
    "Fresh Lime Soda": "/images/fresh-lime-soda.jpg",
};

export default function OnlineDelivery() {
    const { cart, clear } = useCart();
    const navigate = useNavigate();

    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    const [houseNumber, setHouseNumber] = useState("");
    const [street, setStreet] = useState("");
    const [area, setArea] = useState("");
    const [city, setCity] = useState("");
    const [pinCode, setPinCode] = useState("");
    const [landmark, setLandmark] = useState("");

    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const subtotal = cart.reduce(
        (sum, item) =>
            sum + Number(item.price) * Number(item.quantity),
        0
    );

    const gst = Math.round(subtotal * 5) / 100;
    const total = Math.round((subtotal + gst) * 100) / 100;

    const itemCount = cart.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
    );

    const getFoodImage = (item) =>
        foodImages[item.name] || "/images/restaurant-placeholder.jpg";

    const placeDeliveryOrder = async (event) => {
        event.preventDefault();
        setMessage("");

        if (submitting) return;

        if (!cart.length) {
            setMessage("Your cart is empty. Please add dishes from the menu.");
            return;
        }

        const name = customerName.trim();
        const email = customerEmail.trim().toLowerCase();
        const phone = customerPhone.trim();
        const pin = pinCode.trim();

        if (!name || name.length > 100) {
            setMessage("Please enter your name (maximum 100 characters).");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setMessage("Please enter a valid email address.");
            return;
        }

        if (!/^[6-9]\d{9}$/.test(phone)) {
            setMessage("Enter a valid 10-digit Indian mobile number.");
            return;
        }

        if (
            !houseNumber.trim() ||
            !street.trim() ||
            !area.trim() ||
            !city.trim()
        ) {
            setMessage("Please complete all required delivery address fields.");
            return;
        }

        if (!/^\d{6}$/.test(pin)) {
            setMessage("Please enter a valid 6-digit PIN code.");
            return;
        }

        const orderItems = cart.map((item) => ({
            menuItemId: item.id,
            quantity: Number(item.quantity),
        }));

        if (
            orderItems.some(
                (item) =>
                    !item.menuItemId ||
                    !Number.isInteger(item.quantity) ||
                    item.quantity < 1
            )
        ) {
            setMessage("Your cart contains an invalid item. Please review it.");
            return;
        }

        try {
            setSubmitting(true);

            const response = await api.post("/orders", {
                items: orderItems,
                reservationId: null,
                customerName: name,
                customerEmail: email,
                customerPhone: phone,
                orderType: "ONLINE_DELIVERY",
                deliveryAddress: {
                    houseNumber: houseNumber.trim(),
                    street: street.trim(),
                    area: area.trim(),
                    city: city.trim(),
                    pinCode: pin,
                    landmark: landmark.trim(),
                },
                paymentMethod,
            });

            if (response.data?.id == null) {
                throw new Error("The server did not return an order number.");
            }

            clear();

            navigate("/orders", {
                state: {
                    deliveryOrderPlaced: true,
                    orderId: response.data.id,
                },
            });
        } catch (error) {
            console.error("Delivery order error:", error);

            if (error.response?.status === 401) {
                setMessage("Please log in to place your delivery order.");
            } else {
                setMessage(
                    error.response?.data?.message ||
                    error.message ||
                    "Unable to place your delivery order. Please try again."
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="delivery-page">
            <header className="delivery-header">
                <button
                    type="button"
                    className="delivery-back-button"
                    onClick={() => navigate("/cart")}
                >
                    ← Back to Cart
                </button>

                <div className="delivery-brand">
                    <span className="delivery-brand-icon">♨</span>
                    <div>
                        <h1>
                            THE FORK <span>&amp; FLAME</span>
                        </h1>
                        <p>RESTAURANT &amp; DINING</p>
                    </div>
                </div>

                <div className="delivery-header-count">
                    <span>YOUR ORDER</span>
                    <strong>
                        {itemCount} {itemCount === 1 ? "Item" : "Items"}
                    </strong>
                </div>
            </header>

            {/* Delivery banner displayed at the top of this page */}
            <section className="delivery-hero-image">
                <img
                    src="/images/delivery-hero.png"
                    alt="The Fork & Flame — Great food, right to your door"
                    onError={(event) => {
                        console.error(
                            "Delivery banner not found. Check the filename and extension in public/images."
                        );
                        event.currentTarget.style.display = "none";
                    }}
                />
            </section>

            {message && (
                <div className="delivery-error" role="alert">
                    <span>!</span>
                    {message}
                </div>
            )}

            {!cart.length ? (
                <section className="delivery-empty">
                    <div className="delivery-empty-icon">🛒</div>
                    <h2>Your cart is waiting for something delicious</h2>
                    <p>
                        Add dishes from our menu before placing your delivery
                        order.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate("/menu")}
                    >
                        Explore Menu →
                    </button>
                </section>
            ) : (
                <form
                    className="delivery-layout"
                    onSubmit={placeDeliveryOrder}
                >
                    <div className="delivery-form-column">
                        <section className="delivery-card">
                            <div className="delivery-card-heading">
                                <span className="delivery-step">01</span>
                                <div>
                                    <span className="delivery-card-kicker">
                                        LET US KNOW YOU
                                    </span>
                                    <h2>Customer details</h2>
                                </div>
                            </div>

                            <div className="delivery-fields">
                                <label className="delivery-field delivery-field-full">
                                    Full name <span>*</span>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(event) =>
                                            setCustomerName(event.target.value)
                                        }
                                        placeholder="Enter your full name"
                                        autoComplete="name"
                                        maxLength={100}
                                        required
                                    />
                                </label>

                                <label className="delivery-field">
                                    Email address <span>*</span>
                                    <input
                                        type="email"
                                        value={customerEmail}
                                        onChange={(event) =>
                                            setCustomerEmail(event.target.value)
                                        }
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                        maxLength={150}
                                        required
                                    />
                                </label>

                                <label className="delivery-field">
                                    Mobile number <span>*</span>
                                    <input
                                        type="tel"
                                        value={customerPhone}
                                        onChange={(event) =>
                                            setCustomerPhone(
                                                event.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 10)
                                            )
                                        }
                                        placeholder="10-digit mobile number"
                                        autoComplete="tel-national"
                                        inputMode="numeric"
                                        maxLength={10}
                                        required
                                    />
                                </label>
                            </div>
                        </section>

                        <section className="delivery-card">
                            <div className="delivery-card-heading">
                                <span className="delivery-step">02</span>
                                <div>
                                    <span className="delivery-card-kicker">
                                        WHERE SHOULD WE GO?
                                    </span>
                                    <h2>Delivery address</h2>
                                </div>
                            </div>

                            <div className="delivery-fields">
                                <label className="delivery-field">
                                    House / door number <span>*</span>
                                    <input
                                        value={houseNumber}
                                        onChange={(event) =>
                                            setHouseNumber(event.target.value)
                                        }
                                        placeholder="e.g. 12A"
                                        autoComplete="address-line1"
                                        maxLength={100}
                                        required
                                    />
                                </label>

                                <label className="delivery-field">
                                    Street <span>*</span>
                                    <input
                                        value={street}
                                        onChange={(event) =>
                                            setStreet(event.target.value)
                                        }
                                        placeholder="Street name"
                                        autoComplete="address-line2"
                                        maxLength={200}
                                        required
                                    />
                                </label>

                                <label className="delivery-field delivery-field-full">
                                    Area / locality <span>*</span>
                                    <input
                                        value={area}
                                        onChange={(event) =>
                                            setArea(event.target.value)
                                        }
                                        placeholder="Area or neighbourhood"
                                        maxLength={100}
                                        required
                                    />
                                </label>

                                <label className="delivery-field">
                                    City <span>*</span>
                                    <input
                                        value={city}
                                        onChange={(event) =>
                                            setCity(event.target.value)
                                        }
                                        placeholder="Your city"
                                        autoComplete="address-level2"
                                        maxLength={100}
                                        required
                                    />
                                </label>

                                <label className="delivery-field">
                                    PIN code <span>*</span>
                                    <input
                                        value={pinCode}
                                        onChange={(event) =>
                                            setPinCode(
                                                event.target.value
                                                    .replace(/\D/g, "")
                                                    .slice(0, 6)
                                            )
                                        }
                                        placeholder="6-digit PIN code"
                                        autoComplete="postal-code"
                                        inputMode="numeric"
                                        maxLength={6}
                                        required
                                    />
                                </label>

                                <label className="delivery-field delivery-field-full">
                                    Landmark{" "}
                                    <span className="optional-label">
                                        (optional)
                                    </span>
                                    <input
                                        value={landmark}
                                        onChange={(event) =>
                                            setLandmark(event.target.value)
                                        }
                                        placeholder="Nearby shop, building or landmark"
                                        maxLength={150}
                                    />
                                </label>
                            </div>
                        </section>

                        <section className="delivery-card">
                            <div className="delivery-card-heading">
                                <span className="delivery-step">03</span>
                                <div>
                                    <span className="delivery-card-kicker">
                                        COMPLETE YOUR ORDER
                                    </span>
                                    <h2>Payment method</h2>
                                </div>
                            </div>

                            <div className="delivery-payment-options">
                                <label
                                    className={`delivery-payment-option ${
                                        paymentMethod === "CASH" ? "selected" : ""
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="deliveryPayment"
                                        value="CASH"
                                        checked={paymentMethod === "CASH"}
                                        onChange={() => setPaymentMethod("CASH")}
                                    />
                                    <span className="delivery-payment-icon">₹</span>
                                    <span className="delivery-payment-copy">
                                        <strong>Cash on delivery</strong>
                                        <small>Pay when your order arrives</small>
                                    </span>
                                    <span className="delivery-radio-mark" />
                                </label>

                                <label
                                    className={`delivery-payment-option ${
                                        paymentMethod === "UPI" ? "selected" : ""
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="deliveryPayment"
                                        value="UPI"
                                        checked={paymentMethod === "UPI"}
                                        onChange={() => setPaymentMethod("UPI")}
                                    />
                                    <span className="delivery-payment-icon">↗</span>
                                    <span className="delivery-payment-copy">
                                        <strong>UPI</strong>
                                        <small>
                                            Choose UPI as your payment preference
                                        </small>
                                    </span>
                                    <span className="delivery-radio-mark" />
                                </label>
                            </div>

                            <p className="delivery-payment-note">
                                Selecting UPI records your payment preference.
                                Online payment is not processed by this form.
                            </p>
                        </section>
                    </div>

                    <aside className="delivery-summary">
                        <div className="delivery-summary-heading">
                            <div>
                                <span className="delivery-card-kicker">
                                    MADE FOR YOU
                                </span>
                                <h2>Your order</h2>
                            </div>
                            <span className="delivery-summary-bag">♧</span>
                        </div>

                        <div className="delivery-summary-items">
                            {cart.map((item) => (
                                <article
                                    className="delivery-summary-item"
                                    key={item.id}
                                >
                                    <div className="delivery-food-image">
                                        <img
                                            src={getFoodImage(item)}
                                            alt={item.name}
                                            onError={(event) => {
                                                event.currentTarget.onerror = null;
                                                event.currentTarget.src =
                                                    "/images/restaurant-placeholder.jpg";
                                            }}
                                        />
                                    </div>

                                    <div className="delivery-food-details">
                                        <strong>{item.name}</strong>
                                        <span>Qty: {item.quantity}</span>
                                        <small>
                                            ₹{formatPrice(item.price)} each
                                        </small>
                                    </div>

                                    <strong className="delivery-food-price">
                                        ₹
                                        {formatPrice(
                                            Number(item.price) *
                                            Number(item.quantity)
                                        )}
                                    </strong>
                                </article>
                            ))}
                        </div>

                        <button
                            type="button"
                            className="delivery-edit-cart"
                            onClick={() => navigate("/cart")}
                        >
                            ← Edit your cart
                        </button>

                        <div className="delivery-summary-divider" />

                        <div className="delivery-price-row">
                            <span>Subtotal</span>
                            <strong>₹{formatPrice(subtotal)}</strong>
                        </div>

                        <div className="delivery-price-row">
                            <span>GST (5%)</span>
                            <strong>₹{formatPrice(gst)}</strong>
                        </div>

                        <div className="delivery-summary-divider" />

                        <div className="delivery-total-row">
                            <div>
                                <span>TOTAL PAYABLE</span>
                                <small>Inclusive of GST</small>
                            </div>
                            <strong>₹{formatPrice(total)}</strong>
                        </div>

                        <button
                            type="submit"
                            className="delivery-submit-button"
                            disabled={submitting}
                        >
                            {submitting
                                ? "PLACING YOUR ORDER..."
                                : "PLACE DELIVERY ORDER"}
                            {!submitting && <span>→</span>}
                        </button>

                        <p className="delivery-submit-note">
                            By placing your order, you confirm your delivery
                            details.
                        </p>

                        <div className="delivery-secure-note">
                            <span>✓</span>
                            <p>
                                Your order details will be submitted to
                                The Fork &amp; Flame.
                            </p>
                        </div>
                    </aside>
                </form>
            )}

            <footer className="delivery-footer">
                <span>THE FORK &amp; FLAME</span>
                <p>Made with passion. Served with care.</p>
            </footer>
        </main>
    );
}