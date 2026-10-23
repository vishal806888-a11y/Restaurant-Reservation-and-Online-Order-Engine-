import {
    createContext,
    useContext,
    useState
} from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [cart, setCart] = useState([]);

    const add = (item) => {
        setCart((oldCart) => {
            const existingItem = oldCart.find(
                (cartItem) => cartItem.id === item.id
            );

            if (existingItem) {
                return oldCart.map((cartItem) =>
                    cartItem.id === item.id
                        ? {
                              ...cartItem,
                              quantity:
                                  cartItem.quantity + 1
                          }
                        : cartItem
                );
            }

            return [
                ...oldCart,
                {
                    ...item,
                    quantity: 1
                }
            ];
        });
    };

    const remove = (id) => {
        setCart((oldCart) =>
            oldCart.filter(
                (item) => item.id !== id
            )
        );
    };

    const change = (id, quantity) => {
        const newQuantity = Number(quantity);

        setCart((oldCart) =>
            oldCart.map((item) =>
                item.id === id
                    ? {
                          ...item,
                          quantity:
                              newQuantity < 1
                                  ? 1
                                  : newQuantity
                      }
                    : item
            )
        );
    };

    const clear = () => {
        setCart([]);
    };

    const cartCount = cart.reduce(
        (total, item) =>
            total + Number(item.quantity),
        0
    );

    return (
        <CartContext.Provider
            value={{
                cart,
                add,
                remove,
                change,
                clear,
                cartCount
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    return useContext(CartContext);
}