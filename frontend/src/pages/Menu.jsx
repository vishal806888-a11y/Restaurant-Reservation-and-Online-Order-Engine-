import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";

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

const categories = [
    "All",
    "Starters",
    "Main Course",
    "Pizza",
    "Burgers",
    "Pasta",
    "Desserts",
    "Beverages",
];

export default function Menu() {
    const [items, setItems] = useState([]);
    const [activeCategory, setActiveCategory] = useState("All");
    const [menuOpen, setMenuOpen] = useState(false);

    const { add, cartCount } = useCart();

    useEffect(() => {
        api.get("/menu")
            .then((response) => {
                setItems(response.data);
            })
            .catch((error) => {
                console.error("Failed to load menu:", error);
            });
    }, []);

    const getImage = (item) => {
        if (imageMap[item.name]) {
            return imageMap[item.name];
        }

        return "/images/restaurant-placeholder.jpg";
    };

    const filteredItems =
        activeCategory === "All"
            ? items
            : items.filter(
                  (item) =>
                      item.category_name === activeCategory
              );

    return (
        <main className="menu-page">

            {/* =========================================
                MENU SLIDING PANEL
            ========================================= */}

            <aside
                className={`menu-sidebar ${
                    menuOpen ? "menu-sidebar-open" : ""
                }`}
            >
                <div className="menu-sidebar-header">
                    <h2>MENU</h2>

                    <button
                        className="menu-close"
                        onClick={() => setMenuOpen(false)}
                    >
                        ×
                    </button>
                </div>

                <p className="menu-sidebar-subtitle">
                    Explore our selection
                </p>

                <div className="menu-category-list">
                    {categories.map((category) => (
                        <button
                            key={category}
                            className={
                                activeCategory === category
                                    ? "menu-category active"
                                    : "menu-category"
                            }
                            onClick={() => {
                                setActiveCategory(category);
                                setMenuOpen(false);
                            }}
                        >
                            <span>{category}</span>

                            <span>›</span>
                        </button>
                    ))}
                </div>
            </aside>

            {/* =========================================
                MENU OPEN BUTTON
            ========================================= */}

            <button
                className="menu-open-btn"
                onClick={() => setMenuOpen(true)}
            >
                ☰
                <span>Menu</span>
            </button>

            {/* =========================================
                PAGE CONTENT
            ========================================= */}

            <section className="menu-content">

                {/* =========================================
                    MENU HEADING + CART
                ========================================= */}

                <div className="menu-heading">

                    <div>
                        <span className="menu-eyebrow">
                            THE FORK & FLAME
                        </span>

                        <h1>Our Menu</h1>

                        <p>
                            Discover carefully prepared dishes,
                            made fresh for every occasion.
                        </p>
                    </div>

                    {/* =====================================
                        CART BUTTON
                        ONLY EXISTS ON MENU PAGE
                    ===================================== */}

                    <Link
                        to="/cart"
                        className="menu-cart-button"
                    >
                        <span className="menu-cart-icon">
                            🛒
                        </span>

                        <span className="menu-cart-text">
                            Cart
                        </span>

                        {cartCount > 0 && (
                            <span className="menu-cart-count">
                                +{cartCount}
                            </span>
                        )}
                    </Link>

                </div>

                {/* =========================================
                    CATEGORY BAR
                ========================================= */}

                <div className="category-bar">

                    {categories.map((category) => (
                        <button
                            key={category}
                            className={
                                activeCategory === category
                                    ? "category-chip active"
                                    : "category-chip"
                            }
                            onClick={() =>
                                setActiveCategory(category)
                            }
                        >
                            {category}
                        </button>
                    ))}

                </div>

                {/* =========================================
                    FOOD GRID
                ========================================= */}

                <div className="restaurant-menu-grid">

                    {filteredItems.map((item) => (

                        <article
                            className="restaurant-food-card"
                            key={item.id}
                        >

                            <div className="restaurant-food-image">

                                <img
                                    src={getImage(item)}
                                    alt={item.name}
                                    onError={(event) => {
                                        event.currentTarget.src =
                                            "/images/restaurant-placeholder.jpg";
                                    }}
                                />

                                <span className="food-category">
                                    {item.category_name}
                                </span>

                            </div>

                            <div className="restaurant-food-content">

                                <h3>{item.name}</h3>

                                <p>
                                    {item.description}
                                </p>

                                <div className="food-card-bottom">

                                    <strong>
                                        ₹
                                        {Number(
                                            item.price
                                        ).toFixed(0)}
                                    </strong>

                                    <button
                                        className="food-add-btn"
                                        onClick={() =>
                                            add(item)
                                        }
                                    >
                                        Add to Cart
                                    </button>

                                </div>

                            </div>

                        </article>

                    ))}

                </div>

                {!filteredItems.length && (
                    <div className="menu-empty">
                        <h2>No dishes found</h2>

                        <p>
                            There are no dishes in this
                            category yet.
                        </p>
                    </div>
                )}

            </section>

        </main>
    );
}