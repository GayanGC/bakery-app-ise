// frontend/src/pages/CheckoutPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';

function CheckoutPage() {
    const { cartItems, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();

    const [form, setForm] = useState({ street: '', city: '', postalCode: '' });
    const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });


    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setError('');

        if (cartItems.length === 0) {
            setError('Your cart is empty. Add items before checking out.');
            return;
        }

        // Online Payment → redirect to virtual payment gateway
        if (paymentMethod === 'Online Payment') {
            navigate('/payment', {
                state: { deliveryAddress: form, cartItems, cartTotal }
            });
            return;
        }

        // Cash on Delivery → place order directly
        setLoading(true);
        try {
            const orderPayload = {
                orderItems: cartItems.map(item => ({
                    product: item._id,
                    qty: item.cartQty
                })),
                deliveryAddress: form,
                paymentMethod: 'Cash on Delivery'
            };
            const { data } = await api.post('/orders', orderPayload);
            clearCart();
            navigate('/orders', { state: { success: true, orderId: data.order?._id } });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to place order. Please try again.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-brand-50">


            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* ── Delivery Address Form ────────────────────── */}
                    <div className="flex-1">
                        <h2 className="text-2xl font-extrabold text-brand-800 mb-6"
                            style={{ fontFamily: '"Playfair Display", serif' }}>
                            Delivery Address
                        </h2>

                        {error && (
                            <div className="mb-5 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handlePlaceOrder} className="bg-white rounded-2xl border border-brand-100 shadow-md p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-brand-800 mb-1">
                                    Street Address
                                </label>
                                <input
                                    name="street"
                                    required
                                    value={form.street}
                                    onChange={handleChange}
                                    placeholder="123 Baker Street"
                                    className="block w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-brand-800 mb-1">City</label>
                                    <input
                                        name="city"
                                        required
                                        value={form.city}
                                        onChange={handleChange}
                                        placeholder="Colombo"
                                        className="block w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-brand-800 mb-1">Postal Code</label>
                                    <input
                                        name="postalCode"
                                        required
                                        value={form.postalCode}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                                            setForm({ ...form, postalCode: val });
                                        }}
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={5}
                                        placeholder="00100"
                                        className="block w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="block text-sm font-semibold text-brand-800 mb-3">
                                    Payment Method
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {['Cash on Delivery', 'Online Payment'].map(method => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setPaymentMethod(method)}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold text-left transition-all
                                                ${paymentMethod === method
                                                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                                                    : 'border-brand-100 bg-white text-slate-600 hover:border-brand-300'}`}>
                                            <span className="text-xl">{method === 'Cash on Delivery' ? '💵' : '💳'}</span>
                                            <div>
                                                <p>{method}</p>
                                                {method === 'Online Payment' && (
                                                    <p className="text-[10px] font-normal text-slate-400">Simulation — auto marked Completed</p>
                                                )}
                                            </div>
                                            {paymentMethod === method && (
                                                <span className="ml-auto text-brand-500 font-bold">✓</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || cartItems.length === 0}
                                className="w-full py-3.5 bg-brand-500 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-brand-600 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
                                {loading ? 'Placing Order…' : `🎉 Place Order · ${paymentMethod}`}
                            </button>

                        </form>
                    </div>

                    {/* ── Order Summary ────────────────────────────── */}
                    <div className="lg:w-80 shrink-0">
                        <h2 className="text-2xl font-extrabold text-brand-800 mb-6"
                            style={{ fontFamily: '"Playfair Display", serif' }}>
                            Order Summary
                        </h2>
                        <div className="bg-white rounded-2xl border border-brand-100 shadow-md p-6">
                            {cartItems.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">Your cart is empty.</p>
                            ) : (
                                <>
                                    <div className="space-y-3 mb-4">
                                        {cartItems.map(item => (
                                            <div key={item._id} className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-sm shrink-0">
                                                    🧁
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-brand-800 truncate">{item.name}</p>
                                                    <p className="text-xs text-slate-400">Qty: {item.cartQty}</p>
                                                </div>
                                                <span className="text-sm font-bold text-brand-700 shrink-0">
                                                    Rs. {(item.price * item.cartQty).toLocaleString()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-brand-100 pt-4 flex justify-between font-extrabold text-brand-800 text-lg">
                                        <span>Total</span>
                                        <span>Rs. {cartTotal.toLocaleString()}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default CheckoutPage;
