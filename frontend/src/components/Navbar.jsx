import { useState } from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <nav className="nav premium-nav">
                <button
                    type="button"
                    className="menu-toggle"
                    onClick={() => setMenuOpen(true)}
                    aria-label="Open navigation"
                >
                    ☰
                </button>

                <Link
                    to="/"
                    className="brand"
                    onClick={() => setMenuOpen(false)}
                >
                    <img
                        src="/images/fork-flame-logo.png"
                        alt="The Fork & Flame"
                        className="brand-logo"
                    />
                </Link>

                <div className="nav-spacer"></div>
            </nav>

            {menuOpen && (
                <div
                    className="drawer-overlay"
                    onClick={() => setMenuOpen(false)}
                ></div>
            )}

            <aside
                className={`side-drawer ${
                    menuOpen ? "side-drawer-open" : ""
                }`}
            >
                <div className="drawer-header">
                    <div className="drawer-brand">
                        <span>🍴</span>
                        <span>Fork & Flame</span>
                    </div>

                    <button
                        type="button"
                        className="drawer-close"
                        onClick={() => setMenuOpen(false)}
                        aria-label="Close navigation"
                    >
                        ×
                    </button>
                </div>

                <div className="drawer-line"></div>

                <div className="drawer-links">
                    <Link
                        to="/"
                        onClick={() => setMenuOpen(false)}
                    >
                        <span>⌂</span>
                        Home
                    </Link>

                    <Link
                        to="/menu"
                        onClick={() => setMenuOpen(false)}
                    >
                        <span>🍽</span>
                        Menu
                    </Link>

                    <Link
                        to="/reservations"
                        onClick={() => setMenuOpen(false)}
                    >
                        <span>◈</span>
                        Reservations
                    </Link>

                    <Link
                        to="/orders"
                        onClick={() => setMenuOpen(false)}
                    >
                        <span>▣</span>
                        Orders
                    </Link>
                </div>

                <div className="drawer-bottom">
                    <button
                        type="button"
                        className="drawer-logout"
                        onClick={() => {
                            localStorage.removeItem("token");
                            window.location.href = "/login";
                        }}
                    >
                        <span>↪</span>
                        Logout
                    </button>

                    <p>GOOD FOOD • GREAT MOMENTS</p>
                </div>
            </aside>
        </>
    );
}