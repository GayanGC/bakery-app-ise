// frontend/src/pages/CartPage.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

function CartPage() {
    const { cartItems, cartTotal, removeFromCart, updateQty } = useCart();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-brand-50">


            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {cartItems.length === 0 ? (
                    /* ── Empty state ─────────────────────────────── */
                    <div className="py-24 text-center bg-white rounded-2xl border-2 border-dashed border-brand-200">
                        <div className="text-6xl mb-4">🛒</div>
                        <p className="text-2xl font-bold text-brand-800"
                            style={{ fontFamily: '"Playfair Display", serif' }}>
                            Your cart is empty
                        </p>
                        <p className="mt-2 text-sm text-slate-400 mb-6">
                            Head to the shop and add some delicious items!
                        </p>
                        <Link to="/shop"
                            className="inline-block px-6 py-3 bg-brand-500 text-white text-sm font-bold rounded-xl shadow-md hover:bg-brand-600 active:scale-95 transition-all">
                            Browse Shop
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8">

                        {/* ── Cart Items ──────────────────────────── */}
                        <div className="flex-1 space-y-4">
                            <h2 className="text-2xl font-extrabold text-brand-800"
                                style={{ fontFamily: '"Playfair Display", serif' }}>
                                Items ({cartItems.length})
                            </h2>

                            {cartItems.map(item => (
                                <div key={item._id}
                                    className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 flex items-center gap-5 transition-all hover:shadow-md">
                                    <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center text-2xl shrink-0">
                                        🧁
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-brand-800 truncate">{item.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{item.category}</p>
                                        <p className="text-sm font-semibold text-brand-600 mt-1">
                                            Rs. {item.price} each
                                        </p>
                                    </div>

                                    {/* Qty controls */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => updateQty(item._id, item.cartQty - 1)}
                                            className="w-8 h-8 rounded-lg bg-brand-100 hover:bg-brand-200 font-bold text-brand-700 flex items-center justify-center transition-colors">
                                            −
                                        </button>
                                        <span className="w-8 text-center font-bold text-brand-800">
                                            {item.cartQty}
                                        </span>
                                        <button
                                            onClick={() => updateQty(item._id, item.cartQty + 1)}
                                            className="w-8 h-8 rounded-lg bg-brand-100 hover:bg-brand-200 font-bold text-brand-700 flex items-center justify-center transition-colors">
                                            +
                                        </button>
                                    </div>

                                    {/* Subtotal */}
                                    <div className="text-right shrink-0 w-24">
                                        <p className="font-bold text-brand-800">
                                            Rs. {(item.price * item.cartQty).toLocaleString()}
                                        </p>
                                        <button
                                            onClick={() => removeFromCart(item._id)}
                                            className="text-xs text-red-400 hover:text-red-600 mt-1 transition-colors">
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── Order Summary ────────────────────────── */}
                        <div className="lg:w-72 shrink-0">
                            <div className="bg-white rounded-2xl border border-brand-100 shadow-md p-6 sticky top-24">
                                <h3 className="text-lg font-extrabold text-brand-800 mb-4"
                                    style={{ fontFamily: '"Playfair Display", serif' }}>
                                    Order Summary
                                </h3>
                                <div className="space-y-2 text-sm text-slate-600 mb-4">
                                    {cartItems.map(item => (
                                        <div key={item._id} className="flex justify-between">
                                            <span className="truncate max-w-[160px]">{item.name} × {item.cartQty}</span>
                                            <span className="font-semibold text-brand-700">
                                                Rs. {(item.price * item.cartQty).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-brand-100 pt-4 mb-5 flex justify-between font-extrabold text-brand-800">
                                    <span>Total</span>
                                    <span>Rs. {cartTotal.toLocaleString()}</span>
                                </div>
                                <button
                                    onClick={() => navigate('/checkout')}
                                    className="w-full py-3 bg-brand-500 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-brand-600 active:scale-95 transition-all">
                                    Proceed to Checkout →
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default CartPage;
