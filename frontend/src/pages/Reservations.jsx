
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Reservations() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const loadReservations = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/reservations/my");
      const data = response.data;

      setReservations(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.reservations)
          ? data.reservations
          : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to load your reservations."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    loadReservations();
  }, [user, navigate, loadReservations]);

  const cancelReservation = async (reservation) => {
    const id = reservation.id ?? reservation._id;

    if (!id) {
      setError("Reservation ID is missing.");
      return;
    }

    if (!window.confirm("Are you sure you want to cancel this reservation?")) {
      return;
    }

    try {
      setCancellingId(id);
      setError("");

      await api.put(`/reservations/${id}`, {
        status: "CANCELLED",
      });

      await loadReservations();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to cancel the reservation."
      );
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return "Not specified";

    const dateText = String(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
      const [year, month, day] = dateText.split("-").map(Number);
      return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? dateText
      : date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
  };

  const formatTime = (value) => {
    if (!value) return "Not specified";

    const timeText = String(value);

    if (/^\d{2}:\d{2}$/.test(timeText)) {
      const [hours, minutes] = timeText.split(":").map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);

      return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    return timeText;
  };

  const getSeats = (value) => {
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "string") return value || "Not specified";
    return "Not specified";
  };

  const getStatus = (status) =>
    String(status || "CONFIRMED").replaceAll("_", " ").toUpperCase();

  const isCancelled = (status) =>
    String(status || "").toUpperCase() === "CANCELLED";

  return (
    <main className="my-reservations-page">
      <div className="my-reservations-container">
        <div className="my-reservations-heading">
          <p className="my-reservations-eyebrow">FORK & FLAME</p>
          <h1>My Reservations</h1>
          <p>View and manage your table bookings.</p>
        </div>

        {error && (
          <div className="my-reservations-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="my-reservations-message">
            Loading your reservations...
          </div>
        ) : reservations.length === 0 ? (
          <div className="my-reservations-empty">
            <div className="my-reservations-empty-icon">♧</div>
            <h2>No reservations yet</h2>
            <p>Your upcoming table bookings will appear here.</p>
            <button
              className="my-reservations-primary-btn"
              onClick={() => navigate("/reserve")}
            >
              Reserve a Table
            </button>
          </div>
        ) : (
          <div className="my-reservations-list">
            {reservations.map((reservation) => {
              const id = reservation.id ?? reservation._id;
              const status = getStatus(reservation.status);
              const cancelled = isCancelled(reservation.status);

              const tableNumber =
                reservation.table_number ??
                reservation.tableNumber ??
                reservation.table?.table_number ??
                reservation.table?.tableNumber;

              const seats = getSeats(
                reservation.selected_seats ?? reservation.selectedSeats
              );

              const customerName =
                reservation.customer_name ??
                reservation.customerName ??
                user?.name ??
                "Customer";

              const date =
                reservation.reservation_date ?? reservation.reservationDate;

              const time =
                reservation.reservation_time ?? reservation.reservationTime;

              const guests =
                reservation.guests ??
                reservation.numberOfGuests ??
                reservation.number_of_guests;

              return (
                <article className="my-reservation-card" key={id}>
                  <div className="my-reservation-card-top">
                    <div>
                      <p className="my-reservation-label">YOUR TABLE</p>
                      <h2>
                        {tableNumber != null
                          ? `Table ${tableNumber}`
                          : "Table Reservation"}
                      </h2>
                    </div>

                    <span
                      className={`my-reservation-status ${
                        cancelled ? "is-cancelled" : "is-active"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <div className="my-reservation-divider" />

                  <div className="my-reservation-details">
                    <div className="my-reservation-detail">
                      <span className="my-reservation-detail-icon">▦</span>
                      <div>
                        <span className="my-reservation-detail-label">
                          DATE
                        </span>
                        <strong>{formatDate(date)}</strong>
                      </div>
                    </div>

                    <div className="my-reservation-detail">
                      <span className="my-reservation-detail-icon">◷</span>
                      <div>
                        <span className="my-reservation-detail-label">
                          TIME
                        </span>
                        <strong>{formatTime(time)}</strong>
                      </div>
                    </div>

                    <div className="my-reservation-detail">
                      <span className="my-reservation-detail-icon">♙</span>
                      <div>
                        <span className="my-reservation-detail-label">
                          GUESTS
                        </span>
                        <strong>
                          {guests ?? "—"}{" "}
                          {guests === 1 ? "Guest" : "Guests"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="my-reservation-extra">
                    <div>
                      <span className="my-reservation-detail-label">
                        RESERVED FOR
                      </span>
                      <strong>{customerName}</strong>
                    </div>

                    <div>
                      <span className="my-reservation-detail-label">
                        SELECTED SEATS
                      </span>
                      <strong>{seats}</strong>
                    </div>
                  </div>

                  {!cancelled && (
                    <div className="my-reservation-actions">
                      <button
                        className="my-reservation-cancel-btn"
                        onClick={() => cancelReservation(reservation)}
                        disabled={cancellingId === id}
                      >
                        {cancellingId === id
                          ? "Cancelling..."
                          : "Cancel Reservation"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
