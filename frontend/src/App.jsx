
import {
    BrowserRouter,
    Routes,
    Route,
    Link,
    useLocation,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

import Navbar from "./components/Navbar";

import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Reserve from "./pages/Reserve";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Reservations from "./pages/Reservations";
import Admin from "./pages/Admin";
import PartyDetails from "./pages/PartyDetails";
import PartyRegister from "./pages/PartyRegister";
import OnlineDelivery from "./pages/OnlineDelivery";
import TrackOrder from "./pages/TrackOrder";

import "./index.css";

function AppRoutes() {
    const location = useLocation();

    // Hide the regular navbar on party pages.
    const isPartyPage = [
        "/party-details",
        "/party-register",
    ].includes(location.pathname);

    return (
        <>
            {!isPartyPage && <Navbar />}

            <Routes>
                {/* Home and menu */}
                <Route path="/" element={<Home />} />
                <Route path="/menu" element={<Menu />} />

                {/* Authentication */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                    path="/forgot-password"
                    element={<ForgotPassword />}
                />

                {/* Reservations */}
                <Route path="/reserve" element={<Reserve />} />
                <Route
                    path="/reservations"
                    element={<Reservations />}
                />

                {/* Party booking */}
                <Route
                    path="/party-details"
                    element={<PartyDetails />}
                />
                <Route
                    path="/party-register"
                    element={<PartyRegister />}
                />

                {/* Cart and online delivery */}
                <Route path="/cart" element={<Cart />} />
                <Route
                    path="/online-delivery"
                    element={<OnlineDelivery />}
                />

                {/* Order history */}
                <Route path="/orders" element={<Orders />} />

                {/* Individual online delivery tracking */}
                <Route
                    path="/track-order/:id"
                    element={<TrackOrder />}
                />

                {/* Administration */}
                <Route path="/admin" element={<Admin />} />

                {/* Unknown routes */}
                <Route
                    path="*"
                    element={
                        <main className="empty">
                            <h1>Page not found</h1>
                            <Link to="/">Go Home</Link>
                        </main>
                    }
                />
            </Routes>
        </>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <CartProvider>
                    <AppRoutes />
                </CartProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
