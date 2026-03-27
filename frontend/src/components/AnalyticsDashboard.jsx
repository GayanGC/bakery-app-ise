// frontend/src/components/AnalyticsDashboard.jsx
// Revenue & Orders analytics for Admin / Manager — pulls from GET /api/orders/analytics
import { useState, useEffect } from 'react';
import {
    BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../api/axios';

// ── KPI Card ─────────────────────────────────────────────
function KpiCard({ title, value, sub, icon, up }) {
    return (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 flex items-center gap-4">
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
                    {p.name}: {p.name === 'Revenue' ? `Rs. ${Number(p.value).toLocaleString()}` : p.value}
                </p>
            ))}
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

    const { months, summary } = data;
    const revenueChange = summary.revenueChange;
    const ordersChange  = summary.ordersChange;

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
                    icon="💵" title="Last Month Revenue"
                    value={`Rs. ${summary.lastMonth.revenue.toLocaleString()}`}
                />
                <KpiCard
                    icon="🧾" title="Last Month Orders"
                    value={summary.lastMonth.orders}
                />
            </div>

            {/* ── Charts Row ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Bar Chart */}
                <div className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5">
                    <h4 className="text-sm font-extrabold text-brand-800 mb-4">
                        📊 Monthly Revenue (Rs.)
                    </h4>
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={months} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                                tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="revenue" name="Revenue" fill="#C8730A" radius={[6, 6, 0, 0]} />
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
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone" dataKey="orders" name="Orders"
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
