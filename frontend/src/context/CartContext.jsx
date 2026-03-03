// frontend/src/context/CartContext.jsx
import { createContext, useContext, useReducer } from 'react';

// ── Reducer ──────────────────────────────────────────────
const cartReducer = (state, action) => {
    switch (action.type) {

        case 'ADD_TO_CART': {
            const existing = state.cartItems.find(i => i._id === action.payload._id);
            let updatedItems;
            if (existing) {
                // Already in cart – just bump the quantity
                updatedItems = state.cartItems.map(i =>
                    i._id === action.payload._id
                        ? { ...i, cartQty: i.cartQty + (action.qty || 1) }
                        : i
                );
            } else {
                updatedItems = [...state.cartItems, { ...action.payload, cartQty: action.qty || 1 }];
            }
            return { cartItems: updatedItems };
        }

        case 'REMOVE_FROM_CART':
            return { cartItems: state.cartItems.filter(i => i._id !== action.payload) };

        case 'UPDATE_QTY': {
            const qty = Number(action.qty);
            if (qty <= 0) {
                return { cartItems: state.cartItems.filter(i => i._id !== action.payload) };
            }
            return {
                cartItems: state.cartItems.map(i =>
                    i._id === action.payload ? { ...i, cartQty: qty } : i
                )
            };
        }

        case 'CLEAR_CART':
            return { cartItems: [] };

        default:
            return state;
    }
};

// ── Context ──────────────────────────────────────────────
const CartContext = createContext();

export function CartProvider({ children }) {
    const [state, dispatch] = useReducer(cartReducer, { cartItems: [] });

    const addToCart = (product, qty = 1) => dispatch({ type: 'ADD_TO_CART', payload: product, qty });
    const removeFromCart = (id) => dispatch({ type: 'REMOVE_FROM_CART', payload: id });
    const updateQty = (id, qty) => dispatch({ type: 'UPDATE_QTY', payload: id, qty });
    const clearCart = () => dispatch({ type: 'CLEAR_CART' });

    const cartTotal = state.cartItems.reduce((sum, i) => sum + i.price * i.cartQty, 0);

    return (
        <CartContext.Provider value={{ cartItems: state.cartItems, cartTotal, addToCart, removeFromCart, updateQty, clearCart }}>
            {children}
        </CartContext.Provider>
    );
}

// Custom hook — use in any component
export const useCart = () => useContext(CartContext);
