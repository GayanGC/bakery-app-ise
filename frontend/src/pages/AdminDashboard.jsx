// frontend/src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import api from '../api/axios';
import FeedbackList from '../components/FeedbackList';

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
                    type="password" maxLength={4} placeholder="••••"
                    className="block w-full px-4 py-3 text-center text-2xl tracking-widest bg-brand-50 border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 mb-5"
                    value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
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

// ── Simple SVG Bar Chart ──────────────────────────────────
function BarChart({ data }) {
    if (!data?.length) return null;
    const maxVal = Math.max(...data.map(d => d.orders), 1);
    const maxRev = Math.max(...data.map(d => d.revenue), 1);
    const barW = 100 / data.length;

    return (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-md p-6">
            <h3 className="text-lg font-extrabold text-brand-800 mb-6"
                style={{ fontFamily: '"Playfair Display", serif' }}>
                Orders &amp; Revenue — Last 6 Months
            </h3>
            <div className="flex items-end gap-3 h-48 px-2">
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                        {/* Revenue bar */}
                        <div className="w-full flex flex-col items-center gap-0.5">
                            <span className="text-[10px] font-bold text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                Rs.{d.revenue.toLocaleString()}
                            </span>
                            <div
                                className="w-3/4 bg-brand-300 rounded-t-md transition-all duration-500"
                                style={{ height: `${(d.revenue / maxRev) * 120}px` }}
                                title={`Revenue: Rs.${d.revenue}`}
                            />
                        </div>
                        {/* Orders bar */}
                        <div
                            className="w-1/2 bg-brand-500 rounded-t-sm transition-all duration-500"
                            style={{ height: `${(d.orders / maxVal) * 80}px` }}
                            title={`Orders: ${d.orders}`}
                        />
                        <span className="text-[10px] text-slate-400 mt-1 text-center leading-tight">{d.label}</span>
                    </div>
                ))}
            </div>
            <div className="flex gap-5 mt-4 justify-center text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand-300 inline-block" />Revenue</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand-500 inline-block" />Orders</span>
            </div>
        </div>
    );
}

// ── Main AdminDashboard ───────────────────────────────────
export default function AdminDashboard() {
    const [analytics, setAnalytics] = useState(null);
    const [orders, setOrders] = useState([]);
    const [loadA, setLoadA] = useState(true);
    const [loadO, setLoadO] = useState(true);
    const [error, setError] = useState('');

    // PIN modal state (for deleting orders)
    const [pinTarget, setPinTarget] = useState(null); // orderId to delete
    const [pinLoading, setPinLoading] = useState(false);
    const [pinError, setPinError] = useState('');

    // ─ PIN Management state ─────────────────────────────────
    const [pinUsers, setPinUsers] = useState([]);  // Manager + InventoryManager users
    const [assignPins, setAssignPins] = useState({});  // { userId: '1234' }
    const [assignMsg, setAssignMsg] = useState({});  // { userId: 'success/error msg' }
    const [assignLoad, setAssignLoad] = useState({});  // { userId: bool }

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

    const fetchPinUsers = async () => {
        try {
            const { data } = await api.get('/users/all');
            setPinUsers(data.filter(u => ['Manager', 'InventoryManager'].includes(u.role)));
        } catch { /* silently ignore if endpoint not available */ }
    };

    useEffect(() => { fetchAnalytics(); fetchOrders(); fetchPinUsers(); }, []);

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

    const handleAssignPin = async (userId) => {
        const pin = assignPins[userId] || '';
        if (!/^\d{4}$/.test(pin)) {
            setAssignMsg(m => ({ ...m, [userId]: 'PIN must be exactly 4 digits.' }));
            return;
        }
        setAssignLoad(m => ({ ...m, [userId]: true }));
        try {
            const { data } = await api.put(`/users/${userId}/pin`, { pin });
            setAssignMsg(m => ({ ...m, [userId]: data.message }));
            setAssignPins(m => ({ ...m, [userId]: '' }));
            fetchPinUsers(); // refresh hasPin status
        } catch (e) {
            setAssignMsg(m => ({ ...m, [userId]: e.response?.data?.message || 'Failed to assign PIN.' }));
        } finally {
            setAssignLoad(m => ({ ...m, [userId]: false }));
            setTimeout(() => setAssignMsg(m => ({ ...m, [userId]: '' })), 3500);
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

                {/* ── Bar Chart ──────────────────────────────── */}
                {loadA ? (
                    <div className="flex justify-center py-10">
                        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <BarChart data={analytics?.months} />
                )}

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
                {/* ── PIN Management Section ────────────────────── */}
                <div className="bg-white rounded-2xl border border-brand-100 shadow-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-brand-100 flex items-center gap-3">
                        <span className="text-xl">🔑</span>
                        <div>
                            <h3 className="text-lg font-extrabold text-brand-800"
                                style={{ fontFamily: '"Playfair Display", serif' }}>
                                PIN Management
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Assign 4-digit Security PINs to Managers &amp; Inventory Managers
                            </p>
                        </div>
                    </div>

                    {pinUsers.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 text-sm">
                            No Manager or InventoryManager accounts found.
                        </div>
                    ) : (
                        <div className="divide-y divide-brand-50">
                            {pinUsers.map(u => (
                                <div key={u._id}
                                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">

                                    {/* User info */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                                            style={{ background: u.role === 'Manager' ? '#fef3c7' : '#dbeafe' }}>
                                            {u.role === 'Manager' ? '👔' : '🏭'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-brand-800 truncate">{u.name}</p>
                                            <p className="text-xs text-slate-400 truncate">{u.email}</p>
                                        </div>
                                        <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${u.role === 'Manager' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                            }`}>{u.role}</span>
                                        {u.hasPin && (
                                            <span className="shrink-0 text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                                ✓ PIN set
                                            </span>
                                        )}
                                    </div>

                                    {/* PIN input + assign button */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <input
                                            type="password"
                                            maxLength={4}
                                            inputMode="numeric"
                                            placeholder="New PIN"
                                            className="w-24 px-3 py-2 text-center text-lg tracking-widest bg-brand-50 border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                            value={assignPins[u._id] || ''}
                                            onChange={e => setAssignPins(m => ({
                                                ...m,
                                                [u._id]: e.target.value.replace(/\D/g, '').slice(0, 4)
                                            }))}
                                        />
                                        <button
                                            onClick={() => handleAssignPin(u._id)}
                                            disabled={assignLoad[u._id] || (assignPins[u._id] || '').length !== 4}
                                            className="px-4 py-2 bg-brand-500 text-white text-sm font-bold rounded-xl hover:bg-brand-600 active:scale-95 disabled:opacity-40 transition-all">
                                            {assignLoad[u._id] ? '…' : u.hasPin ? 'Update PIN' : 'Assign PIN'}
                                        </button>
                                    </div>

                                    {/* Feedback message */}
                                    {assignMsg[u._id] && (
                                        <p className={`text-xs font-semibold sm:absolute sm:right-6 ${assignMsg[u._id].includes('✅') ? 'text-green-600' : 'text-red-500'
                                            }`}>{assignMsg[u._id]}</p>
                                    )}
                                </div>
                            ))}
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
