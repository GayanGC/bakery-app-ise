// frontend/src/components/AnalyticsDashboard.jsx
// Revenue & Orders analytics for Admin / Manager — pulls from GET /api/orders/analytics
// Now includes COD vs Online Payment revenue split
import { useState, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../api/axios';

// ── KPI Card ─────────────────────────────────────────────
function KpiCard({ title, value, sub, icon, up, accent }) {
    return (
        <div className={`bg-white rounded-2xl border shadow-sm p-5 flex items-center gap-4 ${accent || 'border-brand-100'}`}>
            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-2xl shrink-0">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide truncate">{title}</p>
                <p className="text-2xl font-extrabold text-brand-800 leading-tight">{value}</p>
                {sub !== undefined && (
                    <p className={`text-xs font-semibold mt-0.5 ${up ? 'text-green-600' : up === false ? 'text-red-500' : 'text-slate-400'}`}>
                        {up === true ? '▲' : up === false ? '▼' : ''} {sub}
                    </p>
                )}
            </div>
        </div>
    );
}

// ── Custom Tooltip ────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-brand-100 rounded-xl shadow-lg p-3 text-xs">
            <p className="font-bold text-brand-800 mb-1">{label}</p>
            {payload.map(p => (
                <p key={p.name} style={{ color: p.color }}>
                    {p.name}: {p.name.includes('Orders') ? p.value : `Rs. ${Number(p.value).toLocaleString()}`}
                </p>
            ))}
        </div>
    );
}

// ── Payment Split Donut-style bar ──────────────────────────
function PaymentSplitBar({ online, cod }) {
    const total = online + cod;
    if (total === 0) return <p className="text-xs text-slate-400 text-center py-3">No orders yet.</p>;
    const onlinePct = Math.round((online / total) * 100);
    const codPct = 100 - onlinePct;
    return (
        <div>
            <div className="flex rounded-full overflow-hidden h-4 mb-2">
                <div className="bg-blue-500 transition-all duration-700" style={{ width: `${onlinePct}%` }} />
                <div className="bg-amber-500 transition-all duration-700" style={{ width: `${codPct}%` }} />
            </div>
            <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                    Online {onlinePct}%
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    COD {codPct}%
                </span>
            </div>
        </div>
    );
}

export default function AnalyticsDashboard() {
    const [data,    setData]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState('');

    useEffect(() => {
        api.get('/orders/analytics')
            .then(res => setData(res.data))
            .catch(() => setError('Could not load analytics.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
    );
    if (error) return (
        <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm text-center">{error}</div>
    );
    if (!data) return null;

    const { months, summary, paymentSplit } = data;
    const revenueChange = summary.revenueChange;
    const ordersChange  = summary.ordersChange;
    const ps = paymentSplit || { totalOnlineRevenue: 0, totalCodRevenue: 0, totalOnlineOrders: 0, totalCodOrders: 0 };

    return (
        <div className="space-y-6">
            {/* ── KPI Row ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    icon="💰" title="This Month Revenue"
                    value={`Rs. ${summary.thisMonth.revenue.toLocaleString()}`}
                    sub={`${revenueChange >= 0 ? '+' : ''}Rs. ${revenueChange.toLocaleString()} vs last month`}
                    up={revenueChange > 0 ? true : revenueChange < 0 ? false : undefined}
                />
                <KpiCard
                    icon="📦" title="This Month Orders"
                    value={summary.thisMonth.orders}
                    sub={`${ordersChange >= 0 ? '+' : ''}${ordersChange} vs last month`}
                    up={ordersChange > 0 ? true : ordersChange < 0 ? false : undefined}
                />
                <KpiCard
                    icon="💳" title="Online Revenue (All time)"
                    value={`Rs. ${ps.totalOnlineRevenue.toLocaleString()}`}
                    sub={`${ps.totalOnlineOrders} online orders`}
                    accent="border-blue-100"
                />
                <KpiCard
                    icon="💵" title="COD Revenue (All time)"
                    value={`Rs. ${ps.totalCodRevenue.toLocaleString()}`}
                    sub={`${ps.totalCodOrders} COD orders`}
                    accent="border-amber-100"
                />
            </div>

            {/* ── Payment Split Card ── */}
            <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
                <h4 className="text-sm font-extrabold text-brand-800 mb-4">
                    💳 Payment Method Breakdown (All Time)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
                    <div className="sm:col-span-2">
                        <PaymentSplitBar
                            online={ps.totalOnlineRevenue}
                            cod={ps.totalCodRevenue}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center sm:block sm:space-y-3">
                        <div className="bg-blue-50 rounded-xl p-3">
                            <p className="text-xs text-blue-600 font-semibold">💳 Online</p>
                            <p className="text-lg font-extrabold text-blue-700">Rs. {ps.totalOnlineRevenue.toLocaleString()}</p>
                            <p className="text-xs text-blue-400">{ps.totalOnlineOrders} orders</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3">
                            <p className="text-xs text-amber-600 font-semibold">💵 COD</p>
                            <p className="text-lg font-extrabold text-amber-700">Rs. {ps.totalCodRevenue.toLocaleString()}</p>
                            <p className="text-xs text-amber-400">{ps.totalCodOrders} orders</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Charts Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stacked Revenue Bar Chart: Online vs COD */}
                <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
                    <h4 className="text-sm font-extrabold text-brand-800 mb-4">
                        📊 Revenue by Payment Method (Rs.)
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={months} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="onlineRevenue" name="Online Revenue" stackId="a" fill="#3b82f6" radius={[0,0,0,0]} />
                            <Bar dataKey="codRevenue" name="COD Revenue" stackId="a" fill="#f59e0b" radius={[6,6,0,0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Orders Line Chart */}
                <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
                    <h4 className="text-sm font-extrabold text-brand-800 mb-4">
                        📈 Monthly Orders
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <LineChart data={months} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone" dataKey="orders" name="Total Orders"
                                stroke="#4B2C20" strokeWidth={2.5}
                                dot={{ r: 4, fill: '#4B2C20' }} activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
