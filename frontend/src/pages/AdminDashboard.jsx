// frontend/src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import FeedbackList from '../components/FeedbackList';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ApprovalPanel from '../components/ApprovalPanel';
import DiscountCalendar from '../components/DiscountCalendar';

// ── PIN Modal ─────────────────────────────────────────────
function PinModal({ onConfirm, onCancel, loading }) {
    const [pin, setPin] = useState('');
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-80 shadow-2xl">
                <h3 className="text-xl font-extrabold text-brand-800 mb-2"
                    style={{ fontFamily: '"Playfair Display", serif' }}>
                    🔒 PIN Required
                </h3>
                <p className="text-sm text-slate-500 mb-5">Enter your 4-digit PIN to confirm deletion.</p>
                <input
                    type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="••••"
                    className="block w-full px-4 py-3 text-center text-2xl tracking-widest bg-brand-50 border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 mb-5"
                    value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                <div className="flex gap-3">
                    <button onClick={onCancel}
                        className="flex-1 py-2.5 font-semibold text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                        Cancel
                    </button>
                    <button onClick={() => onConfirm(pin)} disabled={loading || pin.length !== 4}
                        className="flex-1 py-2.5 font-semibold text-sm text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-all">
                        {loading ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}


// ── Main AdminDashboard ───────────────────────────────────
export default function AdminDashboard() {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loadA, setLoadA] = useState(true);
    const [loadO, setLoadO] = useState(true);
    const [error, setError] = useState('');

    // PIN modal state (for deleting orders)
    const [pinTarget, setPinTarget] = useState(null); // orderId to delete
    const [pinLoading, setPinLoading] = useState(false);
    const [pinError, setPinError] = useState('');

    const fetchAnalytics = async () => {
        try {
            const { data } = await api.get('/orders/analytics');
            setAnalytics(data);
        } catch { setError('Could not load analytics.'); }
        finally { setLoadA(false); }
    };

    const fetchOrders = async () => {
        setLoadO(true);
        try {
            const { data } = await api.get('/orders');
            setOrders(data);
        } catch { setError('Could not load orders.'); }
        finally { setLoadO(false); }
    };

    useEffect(() => { fetchAnalytics(); fetchOrders(); }, []);

    const handleStatusChange = async (id, status) => {
        try {
            await api.put(`/orders/${id}/status`, { status });
            fetchOrders();
        } catch (e) { alert(e.response?.data?.message || 'Failed to update status.'); }
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



    const statusBadge = {
        Pending: 'bg-amber-100 text-amber-700',
        Processing: 'bg-blue-100  text-blue-700',
        Delivered: 'bg-green-100 text-green-700'
    };

    const S = analytics?.summary;
    const changeColor = (v) => v > 0 ? 'text-green-600' : v < 0 ? 'text-red-500' : 'text-slate-400';

    return (
        <div className="min-h-screen bg-bakery-illustrations">


            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

                {/* ── Pending Approval Requests (top priority - Admin Only) ──────── */}
                {user?.role === 'Admin' && <ApprovalPanel />}

                {/* ── Dynamic Discount Manager ───────────────────── */}
                <DiscountCalendar />

                {/* ── Stat Cards ──────────────────────────────── */}
                {S && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'This Month Orders', value: S.thisMonth.orders, change: S.ordersChange, icon: '📦' },
                            { label: 'Last Month Orders', value: S.lastMonth.orders, change: null, icon: '📋' },
                            { label: 'This Month Revenue', value: `Rs.${S.thisMonth.revenue.toLocaleString()}`, change: S.revenueChange, icon: '💰' },
                            { label: 'Last Month Revenue', value: `Rs.${S.lastMonth.revenue.toLocaleString()}`, change: null, icon: '📉' }
                        ].map((c, i) => (
                            <div key={i} className="glass-card card-hover p-5 animate-fadeInUp"
                                style={{ animationDelay: `${i * 0.1}s` }}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-2xl">{c.icon}</span>
                                    {c.change !== null && (
                                        <span className={`text-xs font-bold ${changeColor(c.change)}`}>
                                            {c.change > 0 ? '+' : ''}{c.change}
                                        </span>
                                    )}
                                </div>
                                <p className="text-2xl font-extrabold text-brand-800">{c.value}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{c.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Analytics Dashboard ─────────────────────── */}
                <AnalyticsDashboard />

                {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">{error}</div>}

                {/* ── Orders Table ────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-brand-100 shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-brand-100 flex justify-between items-center">
                        <h3 className="text-lg font-extrabold text-brand-800"
                            style={{ fontFamily: '"Playfair Display", serif' }}>
                            All Orders
                        </h3>
                        <button onClick={fetchOrders}
                            className="text-xs font-semibold text-brand-500 hover:text-brand-700 transition-colors">
                            ↻ Refresh
                        </button>
                    </div>

                    {loadO ? (
                        <div className="flex justify-center py-10">
                            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">No orders found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-brand-50 text-xs uppercase text-slate-400 tracking-wide">
                                    <tr>
                                        {['Order ID', 'Customer', 'Items', 'Total', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-50">
                                    {orders.map(o => (
                                        <tr key={o._id} className="hover:bg-brand-50/50 transition-colors">
                                            <td className="px-5 py-4 font-mono text-xs text-slate-500">
                                                #{o._id.slice(-7).toUpperCase()}
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-slate-800">{o.user?.name || '—'}</p>
                                                <p className="text-xs text-slate-400">{o.user?.role}</p>
                                            </td>
                                            <td className="px-5 py-4 text-slate-600">
                                                {o.orderItems.map(i => `${i.name} ×${i.qty}`).join(', ')}
                                            </td>
                                            <td className="px-5 py-4 font-bold text-brand-700">
                                                Rs.{o.totalPrice?.toLocaleString()}
                                            </td>
                                            <td className="px-5 py-4">
                                                <select
                                                    value={o.status}
                                                    onChange={e => handleStatusChange(o._id, e.target.value)}
                                                    className={`text-xs font-bold px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-brand-400 ${statusBadge[o.status]}`}>
                                                    <option value="Pending">Pending</option>
                                                    <option value="Processing">Processing</option>
                                                    <option value="Delivered">Delivered</option>
                                                </select>
                                            </td>
                                            <td className="px-5 py-4">
                                                {pinError && pinTarget === o._id && (
                                                    <p className="text-xs text-red-500 mb-1">{pinError}</p>
                                                )}
                                                <button
                                                    onClick={() => { setPinTarget(o._id); setPinError(''); }}
                                                    className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors">
                                                    🗑 Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>


                {/* ── Customer Reviews ─────────────────────────── */}
                <FeedbackList />

            </main>

            {pinTarget && (
                <PinModal
                    loading={pinLoading}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => { setPinTarget(null); setPinError(''); }}
                />
            )}
        </div>
    );
}
