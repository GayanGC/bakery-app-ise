// frontend/src/pages/CartPage.jsx
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import ProductImage from '../components/ProductImage';

function CartPage() {
    const { cartItems, cartTotal, removeFromCart, updateQty, getEffectivePrice } = useCart();
    const navigate = useNavigate();

    // Calculate total savings
    const totalSavings = cartItems.reduce((acc, item) => {
        if (item.onSale && item.discountPrice) {
            return acc + (item.price - item.discountPrice) * item.cartQty;
        }
        return acc;
    }, 0);

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

                            {cartItems.map(item => {
                                const effectivePrice = getEffectivePrice(item);
                                const itemOnSale = item.onSale && item.discountPrice;

                                return (
                                    <div key={item._id}
                                        className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 flex items-center gap-5 transition-all hover:shadow-md relative overflow-hidden">
                                        
                                        {itemOnSale && (
                                            <div className="absolute top-0 right-0">
                                                <div className="bg-pink-500 text-white text-[9px] font-black px-3 py-0.5 rounded-bl-lg uppercase tracking-tighter">Sale Event</div>
                                            </div>
                                        )}

                                        <div className="w-16 h-16 shrink-0">
                                            <ProductImage
                                                src={item.image}
                                                alt={item.name}
                                                className="w-full h-full object-cover rounded-xl"
                                                fallbackText="🧁"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-brand-800 truncate">{item.name}</p>
                                                {itemOnSale && <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded">SAVE Rs. {item.price - item.discountPrice}</span>}
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-widest font-bold">{item.category}</p>
                                            <div className="mt-1 flex items-center gap-2 text-sm">
                                                <span className="font-black text-brand-900">Rs. {effectivePrice}</span>
                                                {itemOnSale && <span className="text-xs text-slate-400 line-through">Rs. {item.price}</span>}
                                                <span className="text-[10px] text-slate-300 font-medium">/ each</span>
                                            </div>
                                        </div>

                                        {/* Qty controls */}
                                        <div className="flex flex-col items-center gap-1 shrink-0 bg-brand-50/50 p-1 rounded-xl border border-brand-100">
                                            <button
                                                onClick={() => updateQty(item._id, item.cartQty + 1)}
                                                className="w-8 h-8 rounded-lg bg-white shadow-sm hover:bg-white active:scale-95 font-black text-brand-700 flex items-center justify-center transition-all">
                                                +
                                            </button>
                                            <span className="w-8 text-center font-black text-brand-900 text-sm">
                                                {item.cartQty}
                                            </span>
                                            <button
                                                onClick={() => updateQty(item._id, item.cartQty - 1)}
                                                className="w-8 h-8 rounded-lg bg-white shadow-sm hover:bg-white active:scale-95 font-black text-brand-700 flex items-center justify-center transition-all">
                                                −
                                            </button>
                                        </div>

                                        {/* Total for this item */}
                                        <div className="text-right shrink-0 w-28">
                                            <p className="text-xs text-slate-400 font-bold mb-0.5 uppercase tracking-tighter">Subtotal</p>
                                            <p className="font-black text-brand-950 text-base">
                                                Rs. {(effectivePrice * item.cartQty).toLocaleString()}
                                            </p>
                                            <button
                                                onClick={() => removeFromCart(item._id)}
                                                className="text-[10px] font-black text-red-400 hover:text-red-600 mt-2 uppercase tracking-widest transition-colors flex items-center justify-end gap-1 ml-auto">
                                                <span className="text-sm">🗑️</span> Remove
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Order Summary ────────────────────────── */}
                        <div className="lg:w-80 shrink-0">
                            <div className="bg-brand-900 text-white rounded-3xl border border-white/10 shadow-2xl p-7 sticky top-24 overflow-hidden group">
                                {/* Background glow accent */}
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-500/10 rounded-full blur-2xl transition-all group-hover:bg-brand-500/20"></div>

                                <h3 className="text-xl font-black mb-6 relative z-10"
                                    style={{ fontFamily: '"Playfair Display", serif' }}>
                                    Summary
                                </h3>
                                
                                <div className="space-y-4 text-sm mb-6 relative z-10">
                                    {cartItems.map(item => (
                                        <div key={item._id} className="flex justify-between items-start opacity-80">
                                            <div className="pr-4">
                                                <p className="font-bold text-[11px] uppercase tracking-wide truncate max-w-[140px]">{item.name}</p>
                                                <p className="text-[10px] opacity-60">{item.cartQty} × Rs. {getEffectivePrice(item)}</p>
                                            </div>
                                            <span className="font-black text-brand-300 whitespace-nowrap">
                                                Rs. {(getEffectivePrice(item) * item.cartQty).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="border-t border-white/10 pt-6 mb-6 relative z-10">
                                    {totalSavings > 0 && (
                                        <div className="flex justify-between items-center mb-4 p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                            <span className="text-[11px] font-black text-emerald-300 uppercase tracking-widest">Your Savings</span>
                                            <span className="font-black text-emerald-400 text-base shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                                                −Rs. {totalSavings.toLocaleString()}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center font-black">
                                        <span className="text-slate-400 text-[11px] uppercase tracking-widest">Grand Total</span>
                                        <span className="text-2xl text-white">Rs. {cartTotal.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/checkout')}
                                    className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-800 text-white text-xs font-black rounded-2xl shadow-xl shadow-black/20 hover:-translate-y-1 active:scale-95 transition-all uppercase tracking-widest relative z-10">
                                    Checkout Now 🚀
                                </button>
                                
                                <p className="mt-4 text-[10px] text-center text-slate-500 font-bold uppercase tracking-tight opacity-50 relative z-10">
                                    Secure SSL encrypted transaction
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default CartPage;
