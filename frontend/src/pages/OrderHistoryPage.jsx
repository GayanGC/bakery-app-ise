// frontend/src/pages/OrderHistoryPage.jsx
// Role-aware:
//  Customer      → GET /api/orders/mine  (own orders only)
//  Staff/Manager → GET /api/orders       (all orders)
//  Admin         → GET /api/orders       (all orders + full CRUD + delete PIN)
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// ── 4-step order progress stepper ──────────────────────────────────────────
const STAGES = ['Placed', 'Processing', 'Out for Delivery', 'Delivered'];

const stageIcons = {
    'Placed': '🧾',
    'Processing': '🥐',
    'Out for Delivery': '🛵',
    'Delivered': '✅'
};

function OrderStepper({ status }) {
    const current = STAGES.indexOf(status);
    return (
        <div className="flex items-center w-full mt-4 mb-1">
            {STAGES.map((stage, i) => {
                const done = i < current;
                const active = i === current;
                const pending = i > current;
                return (
                    <div key={stage} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                                ${done ? 'bg-brand-500  border-brand-500  text-white' : ''}
                                ${active ? 'bg-white      border-brand-500  text-brand-600 shadow-md ring-2 ring-brand-200' : ''}
                                ${pending ? 'bg-brand-50   border-brand-200  text-slate-300' : ''}`}>
                                {done ? '✓' : stageIcons[stage]}
                            </div>
                            <span className={`text-[9px] font-semibold mt-1 text-center leading-tight w-16
                                ${done || active ? 'text-brand-600' : 'text-slate-300'}`}>
                                {stage}
                            </span>
                        </div>
                        {i < STAGES.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all
                                ${done ? 'bg-brand-500' : 'bg-brand-100'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── PIN Modal (for Manager/Admin delete) ────────────────────────────────────
function PinModal({ onConfirm, onCancel, loading, error }) {
    const [pin, setPin] = useState('');
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-80 shadow-2xl">
                <h3 className="text-xl font-extrabold text-brand-800 mb-2"
                    style={{ fontFamily: '"Playfair Display", serif' }}>🔒 Confirm Deletion</h3>
                <p className="text-sm text-slate-500 mb-4">Enter your 4-digit PIN to delete this order.</p>
                {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
                <input type="password" maxLength={4} placeholder="••••"
                    className="block w-full px-4 py-3 text-center text-2xl tracking-widest bg-brand-50 border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 mb-5"
                    value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
                <div className="flex gap-3">
                    <button onClick={onCancel}
                        className="flex-1 py-2.5 font-semibold text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
                        Cancel
                    </button>
                    <button onClick={() => onConfirm(pin)} disabled={loading || pin.length !== 4}
                        className="flex-1 py-2.5 font-semibold text-sm text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50">
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Status badge config ─────────────────────────────────────────────────────
const badgeStyle = {
    'Placed': 'bg-slate-100   text-slate-600',
    'Processing': 'bg-amber-100   text-amber-700',
    'Out for Delivery': 'bg-blue-100    text-blue-700',
    'Delivered': 'bg-green-100   text-green-700'
};

// ── Main component ──────────────────────────────────────────────────────────
export default function OrderHistoryPage() {
    const { user, hasRole } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Success toast from checkout redirect
    const [toast, setToast] = useState(location.state?.success ? 'Order placed! 🎉' : '');

    // PIN delete modal
    const [pinTarget, setPinTarget] = useState(null);
    const [pinLoading, setPinLoading] = useState(false);
    const [pinError, setPinError] = useState('');

    // Delivery person assignment (Admin/Staff)
    const [deliveryEdits, setDeliveryEdits] = useState({});

    const isStaff = hasRole('Staff', 'Manager', 'Admin');
    const canDelete = hasRole('Manager', 'Admin');

    const fetchOrders = async () => {
        setLoading(true);
        setError('');
        try {
            // Customers get ONLY their own orders — enforced both in backend + here
            const endpoint = isStaff ? '/orders' : '/orders/mine';
            const { data } = await api.get(endpoint);
            setOrders(data);
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to load orders.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchOrders(); }, []);
    useEffect(() => {
        if (toast) { const t = setTimeout(() => setToast(''), 5000); return () => clearTimeout(t); }
    }, [toast]);

    const handleStatusChange = async (id, status) => {
        try {
            const deliveryPerson = deliveryEdits[id] || '';
            await api.patch(`/orders/${id}/status`, { status, deliveryPerson });
            setDeliveryEdits(d => { const n = { ...d }; delete n[id]; return n; });
            fetchOrders();
        } catch (e) { alert(e.response?.data?.message || 'Update failed.'); }
    };

    const handleDeleteConfirm = async (pin) => {
        setPinLoading(true);
        setPinError('');
        try {
            await api.delete(`/orders/${pinTarget}`, { data: { pin } });
            setPinTarget(null);
            fetchOrders();
        } catch (e) {
            setPinError(e.response?.data?.message || 'Failed to delete.');
            setPinLoading(false);
        }
    };

    const fmt = (d) => new Date(d).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    // Next allowed status for Staff (forward-only)
    const nextStatus = (current) => {
        const idx = STAGES.indexOf(current);
        return idx < STAGES.length - 1 ? STAGES[idx + 1] : null;
    };

    return (
        <div className="min-h-screen bg-brand-50">


            {/* Success toast */}
            {toast && (
                <div className="fixed top-20 right-4 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-xl font-semibold animate-bounce">
                    {toast}
                </div>
            )}

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* ── Header ──────────────────────────────────────── */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-extrabold text-brand-800"
                            style={{ fontFamily: '"Playfair Display", serif' }}>
                            {isStaff ? '📋 Order Management' : '📦 My Orders'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {isStaff
                                ? 'Manage and advance order workflow stages.'
                                : 'Track your orders through the bakery workflow.'}
                        </p>
                    </div>
                    <button onClick={fetchOrders}
                        className="text-sm font-semibold text-brand-500 hover:text-brand-700 transition-colors">
                        ↻ Refresh
                    </button>
                </div>

                {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">{error}</div>}

                {/* ── Loading Spinner ──────────────────────────────── */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    </div>

                    /* ── Empty State ──────────────────────────────────── */
                ) : orders.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-brand-200">
                        <div className="text-6xl mb-4">📦</div>
                        <h3 className="text-2xl font-extrabold text-brand-800 mb-2"
                            style={{ fontFamily: '"Playfair Display", serif' }}>
                            {isStaff ? 'No orders in the system' : 'No orders yet'}
                        </h3>
                        <p className="text-slate-400 text-sm">
                            {isStaff ? 'Orders placed by customers will appear here.' : 'Visit the shop to place your first order!'}
                        </p>
                    </div>

                    /* ── Order Cards ──────────────────────────────────── */
                ) : (
                    <div className="space-y-5">
                        {orders.map(order => (
                            <div key={order._id}
                                className="bg-white rounded-2xl border border-brand-100 shadow-sm hover:shadow-md transition-all p-6">

                                {/* Card header row */}
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-mono text-xs text-slate-400">
                                                #{order._id.slice(-8).toUpperCase()}
                                            </span>
                                            {/* Customer name visible to Staff */}
                                            {isStaff && order.user && (
                                                <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                                                    {order.user.name} · {order.user.role}
                                                </span>
                                            )}
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeStyle[order.status] || 'bg-slate-100 text-slate-500'}`}>
                                                {stageIcons[order.status]} {order.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400">{fmt(order.createdAt)}</p>
                                    </div>
                                    <p className="text-xl font-extrabold text-brand-700">
                                        Rs. {order.totalPrice?.toLocaleString()}
                                    </p>
                                </div>

                                {/* 4-Step Progress Stepper (Customer view) */}
                                {!isStaff && <OrderStepper status={order.status} />}

                                {/* Order items */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {order.orderItems.map((item, i) => (
                                        <span key={i} className="bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full">
                                            {item.name} ×{item.qty} — Rs.{(item.price * item.qty).toLocaleString()}
                                        </span>
                                    ))}
                                </div>

                                {/* Delivery address */}
                                {order.deliveryAddress && (
                                    <p className="mt-3 text-xs text-slate-400">
                                        📍 {order.deliveryAddress.street}, {order.deliveryAddress.city} {order.deliveryAddress.postalCode}
                                    </p>
                                )}

                                {/* Delivery person (if assigned) */}
                                {order.deliveryPerson && (
                                    <p className="mt-1 text-xs text-blue-500 font-semibold">
                                        🛵 Assigned to: {order.deliveryPerson}
                                    </p>
                                )}

                                {/* ⭐ Give Feedback — Customer only, Delivered orders */}
                                {!isStaff && order.status === 'Delivered' && (
                                    <div className="mt-3 pt-3 border-t border-brand-50">
                                        <button
                                            onClick={() => navigate(`/feedback/${order._id}`)}
                                            className="text-xs font-bold px-4 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 active:scale-95 transition-all">
                                            ⭐ Leave Feedback
                                        </button>
                                    </div>
                                )}

                                {/* ── Staff/Admin action row ───────────── */}
                                {isStaff && (
                                    <div className="mt-4 pt-4 border-t border-brand-50 space-y-3">

                                        {/* 4-step stepper for Staff so they see current position */}
                                        <OrderStepper status={order.status} />

                                        <div className="flex flex-wrap items-center gap-3">

                                            {/* Delivery person input (only for Out for Delivery step) */}
                                            {order.status === 'Processing' && (
                                                <input
                                                    type="text"
                                                    placeholder="Delivery person name…"
                                                    className="text-xs px-3 py-1.5 bg-brand-50 border border-brand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 flex-1 min-w-36"
                                                    value={deliveryEdits[order._id] || ''}
                                                    onChange={e => setDeliveryEdits(d => ({ ...d, [order._id]: e.target.value }))}
                                                />
                                            )}

                                            {/* Advance to next stage button */}
                                            {nextStatus(order.status) && (
                                                <button
                                                    onClick={() => handleStatusChange(order._id, nextStatus(order.status))}
                                                    className="text-xs font-bold px-4 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 active:scale-95 transition-all">
                                                    → Mark as "{nextStatus(order.status)}"
                                                </button>
                                            )}

                                            {/* Admin/Manager: full status dropdown */}
                                            {hasRole('Admin', 'Manager') && (
                                                <select
                                                    value={order.status}
                                                    onChange={e => handleStatusChange(order._id, e.target.value)}
                                                    className="text-xs font-bold px-2 py-1.5 bg-brand-50 border border-brand-200 rounded-lg focus:ring-2 focus:ring-brand-400 focus:outline-none ml-auto">
                                                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            )}

                                            {/* Delete (Manager/Admin + PIN) */}
                                            {canDelete && (
                                                <button
                                                    onClick={() => { setPinTarget(order._id); setPinError(''); }}
                                                    className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">
                                                    🗑 Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {pinTarget && (
                <PinModal
                    loading={pinLoading}
                    error={pinError}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => { setPinTarget(null); setPinError(''); }}
                />
            )}
        </div>
    );
}
