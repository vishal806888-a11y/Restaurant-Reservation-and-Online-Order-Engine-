import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Reserve() {
    const { user } = useAuth();
    const nav = useNavigate();

    const [form, setForm] = useState({
        customerName: "",
        date: "",
        time: "19:00",
        guests: 2,
        tableId: "",
    });

    const [tables, setTables] = useState([]);
    const [selectedSeats, setSelectedSeats] = useState([]);

    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState(false);

    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");

    const [successInfo, setSuccessInfo] = useState(null);

    /* =====================================================
       LOGIN CHECK
    ===================================================== */

    useEffect(() => {
        if (!user) {
            nav("/login", {
                replace: true,
            });
        }
    }, [user, nav]);

    /* =====================================================
       REDIRECT AFTER SUCCESS
    ===================================================== */

    useEffect(() => {
        if (!successInfo) {
            return;
        }

        const timer = setTimeout(() => {
            nav("/reservations", {
                replace: true,
            });
        }, 1500);

        return () => clearTimeout(timer);
    }, [successInfo, nav]);

    /* =====================================================
       TODAY
    ===================================================== */

    const today = new Date()
        .toISOString()
        .split("T")[0];

    /* =====================================================
       MESSAGE
    ===================================================== */

    const showMessage = (
        text,
        type = "success"
    ) => {
        setMessage(text);
        setMessageType(type);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    /* =====================================================
       SELECTED TABLE
    ===================================================== */

    const selectedTable = useMemo(() => {
        return tables.find(
            (table) =>
                String(table.id) ===
                String(form.tableId)
        );
    }, [tables, form.tableId]);

    /* =====================================================
       CHECK AVAILABILITY
    ===================================================== */

    const checkAvailability = async () => {
        setMessage("");
        setMessageType("");
        setTables([]);
        setSelectedSeats([]);

        setForm((old) => ({
            ...old,
            tableId: "",
        }));

        const customerName =
            form.customerName.trim();

        if (!customerName) {
            showMessage(
                "Please type your name.",
                "error"
            );
            return;
        }

        if (!form.date) {
            showMessage(
                "Please select a reservation date.",
                "error"
            );
            return;
        }

        if (!form.time) {
            showMessage(
                "Please select a reservation time.",
                "error"
            );
            return;
        }

        if (
            !form.guests ||
            Number(form.guests) < 1
        ) {
            showMessage(
                "Please select the number of guests.",
                "error"
            );
            return;
        }

        try {
            setLoading(true);

            const response = await api.get(
                `/tables/available?date=${form.date}&time=${form.time}&guests=${form.guests}`
            );

            setTables(response.data || []);

            if (
                !response.data ||
                response.data.length === 0
            ) {
                showMessage(
                    "No tables are available for this date and time. Please try another time.",
                    "error"
                );
            }
        } catch (error) {
            console.error(
                "Availability error:",
                error
            );

            showMessage(
                error.response?.data?.message ||
                    "Could not check table availability.",
                "error"
            );
        } finally {
            setLoading(false);
        }
    };

    /* =====================================================
       SELECT TABLE
    ===================================================== */

    const selectTable = (table) => {
        setForm((old) => ({
            ...old,
            tableId: String(table.id),
        }));

        setSelectedSeats([]);
        setMessage("");
        setMessageType("");
    };

    /* =====================================================
       SELECT / UNSELECT SEAT
    ===================================================== */

    const toggleSeat = (seatNumber) => {
        if (!selectedTable) {
            return;
        }

        const seat = Number(seatNumber);

        setSelectedSeats((current) => {
            if (current.includes(seat)) {
                return current.filter(
                    (item) => item !== seat
                );
            }

            if (
                current.length >=
                Number(form.guests)
            ) {
                showMessage(
                    `You selected ${form.guests} guests. Please select only ${form.guests} seats.`,
                    "error"
                );

                return current;
            }

            return [...current, seat].sort(
                (a, b) => a - b
            );
        });

        setMessage("");
        setMessageType("");
    };

    /* =====================================================
       CONFIRM RESERVATION
    ===================================================== */

    const submitReservation = async () => {
        const customerName =
            form.customerName.trim();

        if (!customerName) {
            showMessage(
                "Please type your name.",
                "error"
            );
            return;
        }

        if (!form.date) {
            showMessage(
                "Please select a reservation date.",
                "error"
            );
            return;
        }

        if (!form.time) {
            showMessage(
                "Please select a reservation time.",
                "error"
            );
            return;
        }

        if (!form.tableId) {
            showMessage(
                "Please select a table.",
                "error"
            );
            return;
        }

        if (
            selectedSeats.length !==
            Number(form.guests)
        ) {
            showMessage(
                `Please select exactly ${form.guests} seat${
                    Number(form.guests) === 1
                        ? ""
                        : "s"
                }.`,
                "error"
            );
            return;
        }

        try {
            setBooking(true);
            setMessage("");

            const response = await api.post(
                "/reservations",
                {
                    customerName,
                    tableId: Number(
                        form.tableId
                    ),
                    selectedSeats,
                    reservationDate:
                        form.date,
                    reservationTime:
                        form.time,
                    guests: Number(
                        form.guests
                    ),
                }
            );

            const reservation =
                response.data?.reservation;

            setSuccessInfo({
                customerName,
                tableNumber:
                    reservation?.tableNumber ||
                    selectedTable?.table_number,
                selectedSeats:
                    reservation?.selectedSeats ||
                    selectedSeats,
                guests: Number(
                    form.guests
                ),
            });
        } catch (error) {
            console.error(
                "Reservation error:",
                error
            );

            showMessage(
                error.response?.data?.message ||
                    "Reservation failed. Please try again.",
                "error"
            );
        } finally {
            setBooking(false);
        }
    };

    /* =====================================================
       PAGE
    ===================================================== */

    return (
        <main
            className="reservation-page"
            style={{
                position: "relative",
                minHeight: "100vh",
                backgroundImage:
                    "linear-gradient(rgba(8, 6, 4, 0.55), rgba(8, 6, 4, 0.78)), url('/images/reserve-background.jpeg')",
                backgroundSize: "cover",
                backgroundPosition: "center center",
                backgroundRepeat: "no-repeat",
                backgroundAttachment: "fixed",
            }}
        >

            {/* =================================================
                PAGE CONTENT
            ================================================= */}

            <div
                style={{
                    position: "relative",
                    zIndex: 1,
                }}
            >

                {/* =================================================
                    MESSAGE
                ================================================= */}

                {message && (
                    <div
                        className={`reservation-toast ${
                            messageType === "error"
                                ? "reservation-toast-error"
                                : "reservation-toast-success"
                        }`}
                    >
                        <div className="toast-icon">
                            {messageType === "error"
                                ? "!"
                                : "✓"}
                        </div>

                        <div className="toast-content">
                            <strong>
                                {messageType === "error"
                                    ? "Reservation Notice"
                                    : "Reservation Confirmed"}
                            </strong>

                            <span>
                                {message}
                            </span>
                        </div>

                        <button
                            type="button"
                            className="toast-close"
                            onClick={() =>
                                setMessage("")
                            }
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* =================================================
                    SUCCESS
                ================================================= */}

                {successInfo && (
                    <div className="reservation-success-screen">
                        <div className="success-animation">
                            ✓
                        </div>

                        <h2>
                            Table Reserved!
                        </h2>

                        <p>
                            {successInfo.customerName},
                            your reservation is
                            confirmed.
                        </p>

                        <div className="success-booking-details">
                            <strong>
                                Table{" "}
                                {
                                    successInfo.tableNumber
                                }
                            </strong>

                            <span>
                                Seats{" "}
                                {successInfo.selectedSeats.join(
                                    ", "
                                )}
                            </span>

                            <span>
                                {
                                    successInfo.guests
                                }{" "}
                                {successInfo.guests ===
                                1
                                    ? "Guest"
                                    : "Guests"}
                            </span>
                        </div>

                        <span>
                            Taking you to My Reservations...
                        </span>
                    </div>
                )}

                {/* =================================================
                    RESERVATION CONTAINER
                ================================================= */}

                <section className="reservation-container">

                    {/* =================================================
                        HEADING
                    ================================================= */}

                    <div className="reservation-heading">
                        <span>
                            THE FORK & FLAME
                        </span>

                        <h1>
                            Reserve Your Table
                        </h1>

                        <p>
                            Choose your date, time,
                            guests, table and seats.
                        </p>
                    </div>

                    {/* =================================================
                        CUSTOMER NAME
                    ================================================= */}

                    <section className="customer-name-section">
                        <label>
                            Customer Name
                        </label>

                        <input
                            type="text"
                            value={
                                form.customerName
                            }
                            placeholder="Type your name"
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    customerName:
                                        e.target.value,
                                })
                            }
                        />

                        <small>
                            Enter the name you want
                            to appear on your
                            reservation.
                        </small>
                    </section>

                    {/* =================================================
                        DATE / TIME / GUESTS
                    ================================================= */}

                    <section className="reservation-search">

                        <div className="reservation-field">
                            <label>
                                Date
                            </label>

                            <input
                                type="date"
                                min={today}
                                value={form.date}
                                onChange={(e) => {
                                    setForm({
                                        ...form,
                                        date: e.target.value,
                                        tableId: "",
                                    });

                                    setTables([]);
                                    setSelectedSeats([]);
                                }}
                            />
                        </div>

                        <div className="reservation-field">
                            <label>
                                Time
                            </label>

                            <input
                                type="time"
                                value={form.time}
                                onChange={(e) => {
                                    setForm({
                                        ...form,
                                        time: e.target.value,
                                        tableId: "",
                                    });

                                    setTables([]);
                                    setSelectedSeats([]);
                                }}
                            />
                        </div>

                        <div className="reservation-field">
                            <label>
                                Guests
                            </label>

                            <select
                                value={form.guests}
                                onChange={(e) => {
                                    setForm({
                                        ...form,
                                        guests: Number(
                                            e.target.value
                                        ),
                                        tableId: "",
                                    });

                                    setTables([]);
                                    setSelectedSeats([]);
                                }}
                            >
                                {Array.from(
                                    {
                                        length: 10,
                                    },
                                    (_, index) => (
                                        <option
                                            key={
                                                index + 1
                                            }
                                            value={
                                                index + 1
                                            }
                                        >
                                            {index + 1}{" "}
                                            {index === 0
                                                ? "Guest"
                                                : "Guests"}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <button
                            type="button"
                            className="check-availability-button"
                            onClick={
                                checkAvailability
                            }
                            disabled={loading}
                        >
                            {loading
                                ? "Checking..."
                                : "Check Availability"}
                        </button>
                    </section>

                    {/* =================================================
                        TABLE SELECTION
                    ================================================= */}

                    {tables.length > 0 && (
                        <section className="table-booking-section">

                            <div className="booking-title">
                                <div>
                                    <span>
                                        STEP 2
                                    </span>

                                    <h2>
                                        Choose Your Table
                                    </h2>

                                    <p>
                                        First choose a
                                        table, then
                                        select your
                                        individual
                                        seats.
                                    </p>
                                </div>

                                <div className="booking-date">
                                    <strong>
                                        {form.date}
                                    </strong>

                                    <span>
                                        {form.time}
                                    </span>

                                    <span>
                                        {form.guests}{" "}
                                        {form.guests === 1
                                            ? "Guest"
                                            : "Guests"}
                                    </span>
                                </div>
                            </div>

                            <div className="table-legend">
                                <div>
                                    <span className="legend-dot available"></span>
                                    Available
                                </div>

                                <div>
                                    <span className="legend-dot selected"></span>
                                    Selected
                                </div>

                                <div>
                                    <span className="legend-dot booked"></span>
                                    Booked
                                </div>
                            </div>

                            <div className="restaurant-map">

                                <div className="map-label">
                                    <span>
                                        ENTRANCE
                                    </span>
                                </div>

                                <div className="restaurant-floor">

                                    <div className="table-row">
                                        {tables
                                            .filter(
                                                (table) =>
                                                    Number(
                                                        table.table_number
                                                    ) <= 4
                                            )
                                            .map(
                                                (table) => (
                                                    <RestaurantTable
                                                        key={
                                                            table.id
                                                        }
                                                        table={
                                                            table
                                                        }
                                                        selected={
                                                            String(
                                                                table.id
                                                            ) ===
                                                            String(
                                                                form.tableId
                                                            )
                                                        }
                                                        onSelect={
                                                            selectTable
                                                        }
                                                        requestedGuests={
                                                            Number(
                                                                form.guests
                                                            )
                                                        }
                                                    />
                                                )
                                            )}
                                    </div>

                                    <div className="table-row">
                                        {tables
                                            .filter(
                                                (table) =>
                                                    Number(
                                                        table.table_number
                                                    ) >= 5 &&
                                                    Number(
                                                        table.table_number
                                                    ) <= 8
                                            )
                                            .map(
                                                (table) => (
                                                    <RestaurantTable
                                                        key={
                                                            table.id
                                                        }
                                                        table={
                                                            table
                                                        }
                                                        selected={
                                                            String(
                                                                table.id
                                                            ) ===
                                                            String(
                                                                form.tableId
                                                            )
                                                        }
                                                        onSelect={
                                                            selectTable
                                                        }
                                                        requestedGuests={
                                                            Number(
                                                                form.guests
                                                            )
                                                        }
                                                    />
                                                )
                                            )}
                                    </div>

                                    <div className="large-table-row">
                                        {tables
                                            .filter(
                                                (table) =>
                                                    Number(
                                                        table.table_number
                                                    ) >= 9
                                            )
                                            .map(
                                                (table) => (
                                                    <RestaurantTable
                                                        key={
                                                            table.id
                                                        }
                                                        table={
                                                            table
                                                        }
                                                        selected={
                                                            String(
                                                                table.id
                                                            ) ===
                                                            String(
                                                                form.tableId
                                                            )
                                                        }
                                                        onSelect={
                                                            selectTable
                                                        }
                                                        requestedGuests={
                                                            Number(
                                                                form.guests
                                                            )
                                                        }
                                                        large
                                                    />
                                                )
                                            )}
                                    </div>

                                </div>

                                <div className="map-label exit-label">
                                    <span>
                                        EXIT
                                    </span>
                                </div>
                            </div>

                            {/* =================================================
                                SEAT SELECTION
                            ================================================= */}

                            {selectedTable && (
                                <section className="seat-selection-section">

                                    <div className="seat-selection-heading">
                                        <span>
                                            STEP 3
                                        </span>

                                        <h2>
                                            Choose Your Seats
                                        </h2>

                                        <p>
                                            Select{" "}
                                            <strong>
                                                {
                                                    form.guests
                                                }{" "}
                                                seats
                                            </strong>{" "}
                                            for Table{" "}
                                            {
                                                selectedTable.table_number
                                            }.
                                        </p>
                                    </div>

                                    <div
                                        className={`seat-table-layout ${
                                            Number(
                                                selectedTable.capacity
                                            ) >= 10
                                                ? "ten-seat-layout"
                                                : "four-seat-layout"
                                        }`}
                                    >
                                        {Array.from(
                                            {
                                                length: Number(
                                                    selectedTable.capacity
                                                ),
                                            },
                                            (_, index) => {
                                                const seatNumber =
                                                    index + 1;

                                                const selected =
                                                    selectedSeats.includes(
                                                        seatNumber
                                                    );

                                                return (
                                                    <button
                                                        key={
                                                            seatNumber
                                                        }
                                                        type="button"
                                                        className={`booking-seat ${
                                                            selected
                                                                ? "seat-selected"
                                                                : ""
                                                        }`}
                                                        onClick={() =>
                                                            toggleSeat(
                                                                seatNumber
                                                            )
                                                        }
                                                    >
                                                        <span>
                                                            🪑
                                                        </span>

                                                        <b>
                                                            {
                                                                seatNumber
                                                            }
                                                        </b>
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>

                                    <div className="seat-count-panel">

                                        <div>
                                            <small>
                                                SEATS
                                                SELECTED
                                            </small>

                                            <strong>
                                                {
                                                    selectedSeats.length
                                                }{" "}
                                                /{" "}
                                                {
                                                    form.guests
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                TABLE
                                            </small>

                                            <strong>
                                                {
                                                    selectedTable.table_number
                                                }
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                CAPACITY
                                            </small>

                                            <strong>
                                                {
                                                    selectedTable.capacity
                                                }{" "}
                                                seats
                                            </strong>
                                        </div>

                                    </div>

                                    {selectedSeats.length ===
                                        Number(
                                            form.guests
                                        ) && (
                                        <div className="selected-seat-message">
                                            ✓ Seats{" "}
                                            {selectedSeats.join(
                                                ", "
                                            )}{" "}
                                            selected
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="confirm-reservation-button"
                                        onClick={
                                            submitReservation
                                        }
                                        disabled={
                                            booking ||
                                            selectedSeats.length !==
                                                Number(
                                                    form.guests
                                                )
                                        }
                                    >
                                        {booking
                                            ? "Confirming Reservation..."
                                            : `Confirm Reservation • Table ${selectedTable.table_number}`}
                                    </button>

                                </section>
                            )}
                        </section>
                    )}
                </section>
            </div>
        </main>
    );
}


/* =========================================================
   RESTAURANT TABLE COMPONENT
========================================================= */

function RestaurantTable({
    table,
    selected,
    onSelect,
    requestedGuests,
    large = false,
}) {
    const capacity = Number(
        table.capacity
    );

    const tableNumber = Number(
        table.table_number
    );

    const canFitGuests =
        capacity >= requestedGuests;

    const available =
        table.status !== "MAINTENANCE" &&
        canFitGuests;

    const seatCount =
        capacity >= 10 ? 10 : 4;

    return (
        <button
            type="button"
            className={`restaurant-table ${
                selected
                    ? "table-selected"
                    : ""
            } ${
                !available
                    ? "table-unavailable"
                    : ""
            } ${
                large
                    ? "large-restaurant-table"
                    : ""
            }`}
            onClick={() =>
                available &&
                onSelect(table)
            }
            disabled={!available}
            aria-label={`Table ${tableNumber}, ${capacity} seats`}
        >
            <div className="visual-seats">

                {Array.from(
                    {
                        length: seatCount,
                    },
                    (_, index) => (
                        <span
                            key={index}
                            className={`visual-seat seat-${
                                index + 1
                            }`}
                        />
                    )
                )}

                <div className="table-surface">
                    <strong>
                        TABLE
                    </strong>

                    <b>
                        {tableNumber}
                    </b>
                </div>
            </div>

            <div className="table-caption">
                <strong>
                    Table {tableNumber}
                </strong>

                <span>
                    {capacity} seats
                </span>

                <small>
                    {selected
                        ? "Selected ✓"
                        : "Available"}
                </small>
            </div>
        </button>
    );
}