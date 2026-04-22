// frontend/src/pages/MyDeliveries.jsx
// Staff-only portal: shows ONLY orders assigned to the logged-in staff member.
// Provides stage-update workflow and live status monitoring.
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const STAGES = ['Placed', 'Processing', 'Out for Delivery', 'Delivered'];
const stageIcons = { Placed: '🧾', Processing: '🥐', 'Out for Delivery': '🛵', Delivered: '✅' };

const badgeStyle = {
    Placed: 'bg-slate-100 text-slate-600',
    Processing: 'bg-amber-100 text-amber-700',
    'Out for Delivery': 'bg-blue-100 text-blue-700',
    Delivered: 'bg-green-100 text-green-700'
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
                                ${done ? 'bg-brand-500 border-brand-500 text-white' : ''}
                                ${active ? 'bg-white border-brand-500 text-brand-600 shadow-md ring-2 ring-brand-200' : ''}
                                ${pending ? 'bg-brand-50 border-brand-200 text-slate-300' : ''}`}>
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

export default function MyDeliveries() {
    const { user } = useAuth();
    const [activeOrders, setActiveOrders] = useState([]);
    const [deliveredOrders, setDeliveredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null); // orderId being acted on
    const [showDelivered, setShowDelivered] = useState(false);
    const [toast, setToast] = useState('');

    const fetchAssignments = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/orders/staff-deliveries');
            setActiveOrders(data.active || []);
            setDeliveredOrders(data.delivered || []);
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to load your assignments.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(fetchAssignments, 30000);
        return () => clearInterval(interval);
    }, [fetchAssignments]);

    // Toast auto-hide
    useEffect(() => {
        if (toast) { const t = setTimeout(() => setToast(''), 4000); return () => clearTimeout(t); }
    }, [toast]);

    const handleUpdateStatus = async (orderId, newStatus) => {
        setActionLoading(orderId);
        try {
            await api.put(`/orders/update-status/${orderId}`, { status: newStatus });
            setToast(`Order marked as ${newStatus}! ✅`);
            fetchAssignments();
        } catch (e) {
            alert(e.response?.data?.message || `Failed to update status to ${newStatus}.`);
        } finally {
            setActionLoading(null);
        }
    };

    const fmt = (d) => new Date(d).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const display = showDelivered ? deliveredOrders : activeOrders;

    return (
        <div className="min-h-screen bg-brand-50">

            {/* Toast */}
            {toast && (
                <div className="fixed top-20 right-4 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-xl font-semibold animate-bounce">
                    {toast}
                </div>
            )}

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h2 className="text-3xl font-extrabold text-brand-800"
                            style={{ fontFamily: '"Playfair Display", serif' }}>
                            🛵 My Deliveries
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-slate-500">
                                Hi {user?.name}! These orders are assigned to you.
                            </p>
                            <span className="animate-pulse bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-emerald-200">
                                LIVE DELIVERY STATUS
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Toggle: Active / Delivered */}
                        <div className="flex bg-white rounded-xl border border-brand-200 overflow-hidden text-xs font-bold">
                            <button
                                onClick={() => setShowDelivered(false)}
                                className={`px-4 py-2 transition-all ${!showDelivered ? 'bg-brand-500 text-white' : 'text-brand-600 hover:bg-brand-50'}`}>
                                Active ({activeOrders.length})
                            </button>
                            <button
                                onClick={() => setShowDelivered(true)}
                                className={`px-4 py-2 transition-all ${showDelivered ? 'bg-brand-500 text-white' : 'text-brand-600 hover:bg-brand-50'}`}>
                                Delivered ({deliveredOrders.length})
                            </button>
                        </div>
                        <button onClick={fetchAssignments}
                            className="text-sm font-semibold text-brand-500 hover:text-brand-700 transition-colors">
                            ↻ Refresh
                        </button>
                    </div>
                </div>

                {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">{error}</div>}

                {/* Loading */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    </div>

                /* Empty */
                ) : display.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-brand-200">
                        <div className="text-6xl mb-4">{showDelivered ? '✅' : '🛵'}</div>
                        <h3 className="text-2xl font-extrabold text-brand-800 mb-2"
                            style={{ fontFamily: '"Playfair Display", serif' }}>
                            {showDelivered ? 'No completed deliveries yet' : 'No active deliveries'}
                        </h3>
                        <p className="text-slate-400 text-sm">
                            {showDelivered
                                ? 'Completed deliveries will appear here.'
                                : 'When orders are assigned to you, they will appear here.'}
                        </p>
                    </div>

                /* Order Cards */
                ) : (
                    <div className="space-y-5">
                        {display.map(order => (
                            <div key={order._id}
                                className="bg-white rounded-2xl border border-brand-100 shadow-sm hover:shadow-md transition-all p-6">

                                {/* Header row */}
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-mono text-xs text-slate-400">
                                                #{order._id.slice(-8).toUpperCase()}
                                            </span>
                                            {order.user && (
                                                <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                                                    {order.user.name}
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

                                {/* Stepper */}
                                <OrderStepper status={order.status} />

                                {/* Items */}
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {order.orderItems.map((item, i) => (
                                        <span key={i} className="bg-brand-50 text-brand-700 text-xs font-semibold px-3 py-1 rounded-full">
                                            {item.name} ×{item.qty} — Rs.{(item.price * item.qty).toLocaleString()}
                                        </span>
                                    ))}
                                </div>

                                {/* Address */}
                                {order.deliveryAddress && (
                                    <p className="mt-3 text-xs text-slate-400">
                                        📍 {order.deliveryAddress.street}, {order.deliveryAddress.city} {order.deliveryAddress.postalCode}
                                    </p>
                                )}

                                {/* Update Status Buttons */}
                                {order.status !== 'Delivered' && (
                                    <div className="mt-4 pt-4 border-t border-brand-50 flex gap-3">
                                        {order.status === 'Processing' && (
                                            <button
                                                onClick={() => handleUpdateStatus(order._id, 'Out for Delivery')}
                                                disabled={actionLoading === order._id}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white text-sm font-bold rounded-xl shadow-md hover:bg-blue-600 active:scale-95 disabled:opacity-50 transition-all">
                                                🛵 Out for Delivery
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleUpdateStatus(order._id, 'Delivered')}
                                            disabled={actionLoading === order._id}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white text-sm font-bold rounded-xl shadow-md hover:bg-green-600 active:scale-95 disabled:opacity-50 transition-all">
                                            {actionLoading === order._id ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Updating…
                                                </>
                                            ) : (
                                                <>✅ Mark as Delivered</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
