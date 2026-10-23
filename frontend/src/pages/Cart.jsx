
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import api from "../services/api";

const formatPrice = (amount) =>
    Number(amount || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export default function Cart() {
    const { cart, remove, change, clear } = useCart();
    const navigate = useNavigate();

    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("UPI");
    const [upiId, setUpiId] = useState("");
    const [message, setMessage] = useState("");
    const [placingOrder, setPlacingOrder] = useState(false);
    const [bill, setBill] = useState(null);

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

    const getFoodImage = (item) => {
        const imageMap = {
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

        return (
            imageMap[item.name] ||
            "/images/restaurant-placeholder.jpg"
        );
    };

    const goToMenu = () => {
        navigate("/menu");
    };

    const goToDelivery = () => {
        navigate("/online-delivery");
    };

    const placeOrder = async () => {
        if (placingOrder) return;

        setMessage("");

        if (!cart.length) {
            setMessage("Your cart is empty.");
            return;
        }

        if (!customerName.trim()) {
            setMessage("Please enter your full name.");
            return;
        }

        if (customerName.trim().length > 100) {
            setMessage("Your name must be 100 characters or fewer.");
            return;
        }

        const email = customerEmail.trim().toLowerCase();

        if (!email) {
            setMessage("Please enter your email address.");
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setMessage("Please enter a valid email address.");
            return;
        }

        if (paymentMethod === "UPI") {
            const trimmedUpi = upiId.trim();

            if (!trimmedUpi) {
                setMessage("Please enter your UPI ID.");
                return;
            }

            if (!/^[\w.-]+@[\w.-]+$/.test(trimmedUpi)) {
                setMessage(
                    "Please enter a valid UPI ID, such as name@upi."
                );
                return;
            }
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
            setMessage(
                "One or more cart items are invalid. Please review your cart."
            );
            return;
        }

        try {
            setPlacingOrder(true);

            const response = await api.post("/orders", {
                items: orderItems,
                reservationId: null,
                customerName: customerName.trim(),
                customerEmail: email,
                paymentMethod,
                upiId:
                    paymentMethod === "UPI"
                        ? upiId.trim()
                        : null,
            });

            const order = response.data;

            if (!order || order.id == null) {
                throw new Error(
                    "The server did not return an order number. Please check your orders before trying again."
                );
            }

            const now = new Date();

            const billItems = cart.map((item) => ({
                ...item,
                quantity: Number(item.quantity),
                price: Number(item.price),
            }));

            setBill({
                orderId: order.id,
                customerName: customerName.trim(),
                customerEmail: email,
                items: billItems,
                subtotal,
                gst,
                total,
                paymentMethod,
                upiId:
                    paymentMethod === "UPI"
                        ? upiId.trim()
                        : "",
                orderDate: now.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                }),
                orderTime: now.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            });

            clear();
            setUpiId("");
            setMessage("");
        } catch (error) {
            console.error("Place order error:", error);

            if (error.response?.status === 401) {
                setMessage(
                    "Authentication required. Please log in again, then return to your cart."
                );
            } else if (error.response?.status === 403) {
                setMessage(
                    "You do not have permission to place this order. Please log in with your customer account."
                );
            } else {
                setMessage(
                    error.response?.data?.message ||
                        error.message ||
                        "Could not place your order. Please try again."
                );
            }
        } finally {
            setPlacingOrder(false);
        }
    };

    const printBill = () => {
        window.print();
    };

    /* =========================
       PRINTABLE BILL
    ========================= */

    if (bill) {
        return (
            <main className="billing-page">
                <section className="bill-success-banner no-print">
                    <div className="success-check">✓</div>

                    <div>
                        <span>ORDER PLACED</span>
                        <h1>Thank you for your order</h1>
                        <p>
                            Your order has been recorded successfully.
                        </p>
                    </div>
                </section>

                <div className="bill-screen-actions no-print">
                    <button
                        type="button"
                        className="print-bill-button"
                        onClick={printBill}
                    >
                        <span>🖨</span> Print Bill
                    </button>

                    <button
                        type="button"
                        className="secondary-bill-button"
                        onClick={goToMenu}
                    >
                        Continue Ordering
                    </button>

                    <button
                        type="button"
                        className="secondary-bill-button"
                        onClick={() => navigate("/orders")}
                    >
                        View My Orders
                    </button>
                </div>

                <section className="professional-bill">
                    <header className="print-bill-header">
                        <div className="restaurant-mark">
                            <img
                                src="/images/logo.png"
                                alt="The Fork & Flame logo"
                                onError={(event) => {
                                    event.currentTarget.style.display =
                                        "none";
                                }}
                            />
                        </div>

                        <h1>THE FORK & FLAME</h1>
                        <p className="bill-tagline">
                            RESTAURANT & DINING
                        </p>
                        <p>Exceptional food • Great moments</p>
                    </header>

                    <div className="bill-divider" />

                    <section className="bill-meta">
                        <div>
                            <span>BILL NUMBER</span>
                            <strong>
                                FF-
                                {String(bill.orderId).padStart(4, "0")}
                            </strong>
                        </div>

                        <div>
                            <span>DATE</span>
                            <strong>{bill.orderDate}</strong>
                        </div>

                        <div>
                            <span>TIME</span>
                            <strong>{bill.orderTime}</strong>
                        </div>
                    </section>

                    <section className="bill-customer">
                        <div className="bill-section-title">
                            CUSTOMER DETAILS
                        </div>

                        <div className="customer-bill-grid">
                            <div>
                                <span>CUSTOMER NAME</span>
                                <strong>{bill.customerName}</strong>
                            </div>

                            <div>
                                <span>EMAIL ADDRESS</span>
                                <strong>{bill.customerEmail}</strong>
                            </div>
                        </div>
                    </section>

                    <section className="bill-items-section">
                        <div className="bill-section-title">
                            ORDER DETAILS
                        </div>

                        <table className="professional-bill-table">
                            <thead>
                                <tr>
                                    <th>ITEM</th>
                                    <th>QTY</th>
                                    <th>PRICE</th>
                                    <th>AMOUNT</th>
                                </tr>
                            </thead>

                            <tbody>
                                {bill.items.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <strong>{item.name}</strong>
                                            {item.category_name && (
                                                <small>
                                                    {item.category_name}
                                                </small>
                                            )}
                                        </td>

                                        <td>{item.quantity}</td>

                                        <td>
                                            ₹{formatPrice(item.price)}
                                        </td>

                                        <td>
                                            ₹
                                            {formatPrice(
                                                item.price * item.quantity
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    <section className="bill-total-section">
                        <div className="bill-total-row">
                            <span>Subtotal</span>
                            <strong>
                                ₹{formatPrice(bill.subtotal)}
                            </strong>
                        </div>

                        <div className="bill-total-row">
                            <span>GST (5%)</span>
                            <strong>
                                ₹{formatPrice(bill.gst)}
                            </strong>
                        </div>

                        <div className="bill-total-final">
                            <span>GRAND TOTAL</span>
                            <strong>
                                ₹{formatPrice(bill.total)}
                            </strong>
                        </div>
                    </section>

                    <section className="bill-payment-box">
                        <div>
                            <span>PAYMENT METHOD</span>
                            <strong>
                                {bill.paymentMethod === "UPI"
                                    ? "UPI"
                                    : "Cash at Restaurant"}
                            </strong>
                        </div>

                        {bill.paymentMethod === "UPI" && (
                            <div>
                                <span>UPI ID PROVIDED</span>
                                <strong>{bill.upiId}</strong>
                            </div>
                        )}
                    </section>

                    <footer className="professional-bill-footer">
                        <div className="footer-line" />
                        <h2>THANK YOU</h2>
                        <p>
                            Thank you for choosing The Fork & Flame.
                        </p>
                        <strong>THE FORK & FLAME</strong>
                        <small>
                            Please retain this bill for your records.
                        </small>
                    </footer>
                </section>
            </main>
        );
    }

    /* =========================
       EMPTY CART
    ========================= */

    if (!cart.length) {
        return (
            <main className="professional-checkout-page">
                <section className="empty-cart-card">
                    <div className="empty-cart-icon">🛒</div>
                    <span>THE FORK & FLAME</span>
                    <h1>Your cart is empty</h1>
                    <p>
                        Discover something delicious from our menu
                        and add it to your order.
                    </p>

                    <button
                        type="button"
                        className="start-order-button"
                        onClick={goToMenu}
                    >
                        Explore Our Menu
                    </button>
                </section>
            </main>
        );
    }

    /* =========================
       CHECKOUT
    ========================= */

    return (
        <main className="professional-checkout-page">
            <section className="checkout-header">
                <div>
                    <span className="checkout-eyebrow">
                        THE FORK & FLAME
                    </span>

                    <h1>Checkout</h1>

                    <p>
                        Review your order, provide your details
                        and complete your purchase.
                    </p>
                </div>

                <div className="checkout-order-info">
                    <span>YOUR ORDER</span>
                    <strong>
                        {itemCount} {itemCount === 1 ? "Item" : "Items"}
                    </strong>
                </div>
            </section>

            {message && (
                <div
                    className="checkout-message"
                    role="alert"
                    aria-live="polite"
                >
                    <span>!</span>
                    {message}
                </div>
            )}

            {/* ONLINE DELIVERY OPTION */}

            <section className="online-delivery-option">
                <div className="online-delivery-option-icon">
                    🛵
                </div>

                <div className="online-delivery-option-content">
                    <span className="delivery-option-label">
                        FOOD DELIVERED TO YOUR DOOR
                    </span>

                    <h2>Order Online for Delivery</h2>

                    <p>
                        Want home delivery? Continue to the next page
                        to enter your phone number and delivery address.
                        Your delivery details will be saved with your
                        online order.
                    </p>

                    <button
                        type="button"
                        className="delivery-continue-btn"
                        onClick={goToDelivery}
                    >
                        <span className="delivery-btn-icon" aria-hidden="true">
                            🛵
                        </span>

                        <span className="delivery-btn-label">
                            CONTINUE TO DELIVERY
                        </span>

                        <span className="delivery-btn-arrow" aria-hidden="true">
                            →
                        </span>
                    </button>

                    <div className="delivery-trust-note">
                        <span aria-hidden="true">✓</span>
                        <span>Enter your delivery address on the next page</span>
                    </div>
                </div>
            </section>

            <div className="professional-checkout-grid">
                <section className="checkout-main-column">
                    <div className="checkout-section-card">
                        <div className="section-heading">
                            <div className="section-number">01</div>
                            <div>
                                <span>CUSTOMER</span>
                                <h2>Your Details</h2>
                            </div>
                        </div>

                        <div className="checkout-form-grid">
                            <label className="checkout-input-group">
                                <span>Full Name</span>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(event) =>
                                        setCustomerName(event.target.value)
                                    }
                                    placeholder="Enter your full name"
                                    maxLength={100}
                                    autoComplete="name"
                                    required
                                />
                            </label>

                            <label className="checkout-input-group">
                                <span>Email Address</span>
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
                        </div>
                    </div>

                    <div className="checkout-section-card">
                        <div className="section-heading">
                            <div className="section-number">02</div>
                            <div>
                                <span>YOUR SELECTION</span>
                                <h2>Order Items</h2>
                            </div>
                        </div>

                        <div className="checkout-items">
                            {cart.map((item) => (
                                <article
                                    className="professional-cart-item"
                                    key={item.id}
                                >
                                    <div className="cart-item-image">
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

                                    <div className="professional-item-info">
                                        <h3>{item.name}</h3>

                                        {item.category_name && (
                                            <span>{item.category_name}</span>
                                        )}

                                        <p>
                                            ₹{formatPrice(item.price)} per item
                                        </p>
                                    </div>

                                    <div className="quantity-control">
                                        <button
                                            type="button"
                                            aria-label={`Decrease ${item.name} quantity`}
                                            onClick={() =>
                                                change(
                                                    item.id,
                                                    Number(item.quantity) - 1
                                                )
                                            }
                                            disabled={
                                                Number(item.quantity) <= 1 ||
                                                placingOrder
                                            }
                                        >
                                            −
                                        </button>

                                        <strong>{item.quantity}</strong>

                                        <button
                                            type="button"
                                            aria-label={`Increase ${item.name} quantity`}
                                            onClick={() =>
                                                change(
                                                    item.id,
                                                    Number(item.quantity) + 1
                                                )
                                            }
                                            disabled={placingOrder}
                                        >
                                            +
                                        </button>
                                    </div>

                                    <div className="professional-item-total">
                                        <strong>
                                            ₹
                                            {formatPrice(
                                                Number(item.price) *
                                                    Number(item.quantity)
                                            )}
                                        </strong>

                                        <button
                                            type="button"
                                            onClick={() => remove(item.id)}
                                            disabled={placingOrder}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>

                    <div className="checkout-section-card">
                        <div className="section-heading">
                            <div className="section-number">03</div>
                            <div>
                                <span>PAYMENT</span>
                                <h2>Payment Method</h2>
                            </div>
                        </div>

                        <div className="payment-method-grid">
                            <label
                                className={`payment-method-card ${
                                    paymentMethod === "UPI"
                                        ? "payment-method-selected"
                                        : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="payment"
                                    value="UPI"
                                    checked={paymentMethod === "UPI"}
                                    onChange={() => setPaymentMethod("UPI")}
                                    disabled={placingOrder}
                                />

                                <span className="payment-icon">₹</span>

                                <span className="payment-method-content">
                                    <strong>UPI Payment</strong>
                                    <small>Enter your UPI ID</small>
                                </span>

                                <span className="payment-radio" />
                            </label>

                            <label
                                className={`payment-method-card ${
                                    paymentMethod === "CASH"
                                        ? "payment-method-selected"
                                        : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="payment"
                                    value="CASH"
                                    checked={paymentMethod === "CASH"}
                                    onChange={() => setPaymentMethod("CASH")}
                                    disabled={placingOrder}
                                />

                                <span className="payment-icon">₹</span>

                                <span className="payment-method-content">
                                    <strong>Cash at Restaurant</strong>
                                    <small>Pay at the restaurant</small>
                                </span>

                                <span className="payment-radio" />
                            </label>
                        </div>

                        {paymentMethod === "UPI" && (
                            <div className="upi-payment-area">
                                <label>
                                    <span>UPI ID</span>
                                    <input
                                        type="text"
                                        value={upiId}
                                        onChange={(event) =>
                                            setUpiId(event.target.value)
                                        }
                                        placeholder="example@upi"
                                        maxLength={100}
                                        disabled={placingOrder}
                                    />
                                </label>

                                <small>
                                    Your UPI ID is collected as part of the
                                    order details. This form does not itself
                                    transfer money.
                                </small>
                            </div>
                        )}
                    </div>
                </section>

                <aside className="professional-order-summary">
                    <div className="summary-top">
                        <span>ORDER SUMMARY</span>
                        <h2>Your Bill</h2>
                    </div>

                    <div className="summary-items">
                        {cart.map((item) => (
                            <div className="summary-item" key={item.id}>
                                <div>
                                    <strong>{item.name}</strong>
                                    <span>
                                        {item.quantity} × ₹
                                        {formatPrice(item.price)}
                                    </span>
                                </div>

                                <strong>
                                    ₹
                                    {formatPrice(
                                        Number(item.price) *
                                            Number(item.quantity)
                                    )}
                                </strong>
                            </div>
                        ))}
                    </div>

                    <div className="summary-divider" />

                    <div className="summary-price-row">
                        <span>Subtotal</span>
                        <strong>₹{formatPrice(subtotal)}</strong>
                    </div>

                    <div className="summary-price-row">
                        <span>GST (5%)</span>
                        <strong>₹{formatPrice(gst)}</strong>
                    </div>

                    <div className="summary-divider" />

                    <div className="summary-grand-total">
                        <div>
                            <span>TOTAL PAYABLE</span>
                            <small>Inclusive of GST</small>
                        </div>

                        <strong>₹{formatPrice(total)}</strong>
                    </div>

                    <button
                        type="button"
                        className="professional-place-order"
                        onClick={placeOrder}
                        disabled={placingOrder || !cart.length}
                    >
                        {placingOrder ? (
                            <>
                                <span className="loading-dot">•</span>
                                Processing Order...
                            </>
                        ) : (
                            <>
                                Place Order
                                <span>→</span>
                            </>
                        )}
                    </button>

                    <div className="checkout-security">
                        <span>✓</span>
                        <p>
                            Your order is submitted securely through
                            the restaurant API.
                        </p>
                    </div>
                </aside>
            </div>
        </main>
    );
}
