// frontend/src/pages/PaymentPage.jsx
// Virtual Payment Gateway — card details validated client-side only. NEVER sent to backend.
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';

// ── Card brand detector ────────────────────────────────────
function detectBrand(num) {
    const n = num.replace(/\s/g, '');
    if (/^4/.test(n)) return { name: 'Visa', icon: '💳', color: 'from-blue-600 to-blue-800' };
    if (/^5[1-5]/.test(n)) return { name: 'Mastercard', icon: '💳', color: 'from-red-600 to-orange-600' };
    if (/^3[47]/.test(n)) return { name: 'Amex', icon: '💳', color: 'from-green-600 to-teal-700' };
    return { name: 'Card', icon: '💳', color: 'from-brand-700 to-brand-900' };
}

// ── Validation helpers ─────────────────────────────────────
const validateCard = (num) => /^\d{16}$/.test(num.replace(/\s/g, ''));
const validateExpiry = (exp) => {
    if (!/^\d{2}\/\d{2}$/.test(exp)) return false;
    const [mm, yy] = exp.split('/').map(Number);
    if (mm < 1 || mm > 12) return false;
    const now = new Date();
    const expDate = new Date(2000 + yy, mm - 1, 1);
    return expDate > now;
};
const validateCvv = (cvv) => /^\d{3}$/.test(cvv);

// ── Live card preview ─────────────────────────────────────
function CardPreview({ number, name, expiry, flipped }) {
    const brand = detectBrand(number);
    const formatted = number.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim() || '•••• •••• •••• ••••';
    return (
        <div className="perspective-1000 w-full max-w-sm mx-auto mb-8">
            <div className={`relative transition-transform duration-700 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}
                style={{ transformStyle: 'preserve-3d', transition: 'transform 0.6s', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)' }}>

                {/* Front */}
                <div className={`relative bg-gradient-to-br ${brand.color} rounded-2xl p-6 shadow-2xl text-white`}
                    style={{ backfaceVisibility: 'hidden', minHeight: 180 }}>
                    <div className="flex justify-between items-start mb-8">
                        <div className="w-10 h-7 bg-yellow-400/80 rounded-md" />
                        <span className="text-xl opacity-80">{brand.icon} {brand.name}</span>
                    </div>
                    <p className="text-xl font-mono tracking-widest mb-5 text-white/90">
                        {formatted}
                    </p>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[9px] uppercase text-white/50 mb-0.5">Card Holder</p>
                            <p className="text-sm font-bold uppercase truncate max-w-[180px]">
                                {name || 'FULL NAME'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] uppercase text-white/50 mb-0.5">Expires</p>
                            <p className="text-sm font-bold">{expiry || 'MM/YY'}</p>
                        </div>
                    </div>
                    {/* Shimmer */}
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                    </div>
                </div>

                {/* Back */}
                <div className={`absolute inset-0 bg-gradient-to-br ${brand.color} rounded-2xl shadow-2xl text-white`}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', minHeight: 180 }}>
                    <div className="h-10 bg-black/40 mt-8 mb-5" />
                    <div className="px-6">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-8 bg-white/90 rounded" />
                            <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                                <span className="text-slate-800 font-bold text-xs">CVV</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-white/50 mt-3 text-center">
                            This is a simulated payment. No real transaction occurs.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Processing Animation Overlay ──────────────────────────
function ProcessingOverlay() {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-brand-900/95 backdrop-blur-sm">
            <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="w-24 h-24 border-4 border-brand-300/30 rounded-full" />
                    <div className="absolute inset-0 w-24 h-24 border-4 border-t-brand-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                    <div className="absolute inset-3 flex items-center justify-center text-3xl">💳</div>
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-2"
                    style={{ fontFamily: '"Playfair Display", serif' }}>
                    Processing Payment…
                </h2>
                <p className="text-brand-300 text-sm">Securing your transaction</p>
                <div className="flex justify-center gap-1.5 mt-4">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Main PaymentPage ───────────────────────────────────────
export default function PaymentPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { clearCart } = useCart();

    const { deliveryAddress, cartItems, cartTotal } = location.state || {};

    const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [flipped, setFlipped] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Redirect if no cart data (direct access)
    useEffect(() => {
        if (!cartItems || cartItems.length === 0) {
            navigate('/cart');
        }
    }, [cartItems, navigate]);

    const formatCardNumber = (val) => {
        const digits = val.replace(/\D/g, '').slice(0, 16);
        return digits.replace(/(.{4})/g, '$1 ').trim();
    };

    const formatExpiry = (val) => {
        const digits = val.replace(/\D/g, '').slice(0, 4);
        if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
        return digits;
    };

    const handleChange = (field, value) => {
        let v = value;
        if (field === 'number') v = formatCardNumber(value);
        if (field === 'expiry') v = formatExpiry(value);
        if (field === 'cvv') v = value.replace(/\D/g, '').slice(0, 3);
        setCard(c => ({ ...c, [field]: v }));
        setTouched(t => ({ ...t, [field]: true }));
    };

    const validate = () => {
        const e = {};
        if (!validateCard(card.number)) e.number = 'Must be 16 digits';
        if (!card.name.trim()) e.name = 'Cardholder name is required';
        if (!validateExpiry(card.expiry)) e.expiry = 'Use MM/YY format and a future date';
        if (!validateCvv(card.cvv)) e.cvv = 'Must be 3 digits';
        setErrors(e);
        setTouched({ number: true, name: true, expiry: true, cvv: true });
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setProcessing(true);

        // Simulate 2-second payment processing
        await new Promise(r => setTimeout(r, 2000));

        try {
            const orderPayload = {
                orderItems: cartItems.map(item => ({
                    product: item._id,
                    qty: item.cartQty
                })),
                deliveryAddress,
                paymentMethod: 'Online Payment'
                // Card details are NEVER included here — security by design
            };
            await api.post('/orders', orderPayload);
            clearCart();
            navigate('/orders', { state: { success: true } });
        } catch (err) {
            setProcessing(false);
            alert(err.response?.data?.message || 'Payment failed. Please try again.');
        }
    };

    const inputClass = (field) =>
        `block w-full px-4 py-3 rounded-xl text-slate-900 placeholder-slate-400 border-2 transition-all focus:outline-none focus:ring-0
         ${touched[field] && errors[field]
            ? 'border-red-400 bg-red-50 focus:border-red-500'
            : touched[field] && !errors[field]
                ? 'border-green-400 bg-green-50 focus:border-green-500'
                : 'border-brand-200 bg-brand-50 focus:border-brand-500'}`;

    if (!cartItems) return null;

    return (
        <>
            {processing && <ProcessingOverlay />}

            <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 flex items-center justify-center px-4 py-12">
                <div className="w-full max-w-md">

                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                            <span className="text-green-400 text-sm">🔒</span>
                            <span className="text-white/80 text-xs font-semibold">Secure Payment Gateway</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-white"
                            style={{ fontFamily: '"Playfair Display", serif' }}>
                            Complete Payment
                        </h1>
                        <p className="text-brand-300 text-sm mt-1">
                            Total: <span className="text-white font-bold">Rs. {cartTotal?.toLocaleString()}</span>
                        </p>
                    </div>

                    {/* Card Preview */}
                    <CardPreview
                        number={card.number}
                        name={card.name}
                        expiry={card.expiry}
                        flipped={flipped}
                    />

                    {/* Card Form */}
                    <div className="bg-white rounded-3xl p-7 shadow-2xl">
                        <form onSubmit={handleSubmit} noValidate className="space-y-5">

                            {/* Card Number */}
                            <div>
                                <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1.5">
                                    Card Number
                                </label>
                                <input
                                    id="card-number"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="1234 5678 9012 3456"
                                    maxLength={19}
                                    value={card.number}
                                    onChange={e => handleChange('number', e.target.value)}
                                    onFocus={() => setFlipped(false)}
                                    className={inputClass('number')}
                                />
                                {touched.number && errors.number && (
                                    <p className="text-xs text-red-500 mt-1">⚠ {errors.number}</p>
                                )}
                            </div>

                            {/* Cardholder Name */}
                            <div>
                                <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1.5">
                                    Cardholder Name
                                </label>
                                <input
                                    id="card-name"
                                    type="text"
                                    placeholder="John Silva"
                                    value={card.name}
                                    onChange={e => handleChange('name', e.target.value.toUpperCase())}
                                    onFocus={() => setFlipped(false)}
                                    className={inputClass('name')}
                                />
                                {touched.name && errors.name && (
                                    <p className="text-xs text-red-500 mt-1">⚠ {errors.name}</p>
                                )}
                            </div>

                            {/* Expiry + CVV */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1.5">
                                        Expiry Date
                                    </label>
                                    <input
                                        id="card-expiry"
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="MM/YY"
                                        maxLength={5}
                                        value={card.expiry}
                                        onChange={e => handleChange('expiry', e.target.value)}
                                        onFocus={() => setFlipped(false)}
                                        className={inputClass('expiry')}
                                    />
                                    {touched.expiry && errors.expiry && (
                                        <p className="text-xs text-red-500 mt-1">⚠ {errors.expiry}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-700 uppercase tracking-wide mb-1.5">
                                        CVV
                                    </label>
                                    <input
                                        id="card-cvv"
                                        type="password"
                                        inputMode="numeric"
                                        placeholder="•••"
                                        maxLength={3}
                                        value={card.cvv}
                                        onChange={e => handleChange('cvv', e.target.value)}
                                        onFocus={() => setFlipped(true)}
                                        onBlur={() => setFlipped(false)}
                                        className={inputClass('cvv')}
                                    />
                                    {touched.cvv && errors.cvv && (
                                        <p className="text-xs text-red-500 mt-1">⚠ {errors.cvv}</p>
                                    )}
                                </div>
                            </div>

                            {/* Order Summary mini */}
                            <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
                                <p className="text-xs font-bold text-brand-700 uppercase tracking-wide mb-2">Order Summary</p>
                                <div className="space-y-1">
                                    {cartItems.map((item, i) => (
                                        <div key={i} className="flex justify-between text-xs text-slate-600">
                                            <span className="truncate max-w-[180px]">{item.name} × {item.cartQty}</span>
                                            <span className="font-semibold text-brand-700 ml-2">Rs. {(item.price * item.cartQty).toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-brand-200 mt-2 pt-2 flex justify-between font-extrabold text-brand-800 text-sm">
                                    <span>Total</span>
                                    <span>Rs. {cartTotal?.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                id="pay-now-btn"
                                disabled={processing}
                                className="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-800 text-white text-sm font-extrabold rounded-xl shadow-lg hover:from-brand-700 hover:to-brand-900 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 tracking-wide">
                                {processing ? '⏳ Processing…' : `💳 Pay Rs. ${cartTotal?.toLocaleString()}`}
                            </button>

                            {/* Back link */}
                            <button type="button"
                                onClick={() => navigate(-1)}
                                className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors mt-1">
                                ← Back to Checkout
                            </button>
                        </form>

                        {/* Security badges */}
                        <div className="flex justify-center gap-4 mt-5 pt-4 border-t border-brand-50">
                            {['🔒 SSL Secured', '🛡 Fraud Protected', '✅ Simulation Mode'].map(b => (
                                <span key={b} className="text-[10px] text-slate-400 font-semibold">{b}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
