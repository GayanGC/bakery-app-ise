// frontend/src/components/DiscountCalendar.jsx
// Admin/Manager tool for scheduling global product sales via a calendar date picker.
// Uses "react-calendar" (lightweight, no heavy deps). No FullCalendar needed.
import { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import api from '../api/axios';

// ── Inline calendar overrides so it inherits brand colours ───
const calStyle = `
.discount-cal .react-calendar { border: none; font-family: inherit; width: 100%; }
.discount-cal .react-calendar__navigation button { color: #4B2C20; font-weight: 700; border-radius: 8px; }
.discount-cal .react-calendar__navigation button:hover { background: #f5ece7; }
.discount-cal .react-calendar__tile { border-radius: 8px; transition: background .15s; }
.discount-cal .react-calendar__tile:hover { background: #f5ece7; }
.discount-cal .react-calendar__tile--active { background: #C8730A !important; color: #fff; }
.discount-cal .react-calendar__tile--rangeStart,
.discount-cal .react-calendar__tile--rangeEnd { background: #4B2C20 !important; color: #fff; }
.discount-cal .react-calendar__tile--range { background: #f9e6d1; }
.discount-cal .react-calendar__tile--now { border: 2px solid #C8730A; }
`;

export default function DiscountCalendar() {
    const [dateRange,     setDateRange]     = useState(null);      // [start, end] or null
    const [discountPct,   setDiscountPct]   = useState('');
    const [activeSale,    setActiveSale]    = useState(null);      // current DB sale info
    const [loading,       setLoading]       = useState(false);
    const [reverting,     setReverting]     = useState(false);
    const [toast,         setToast]         = useState({ msg: '', type: 'green' });

    const showToast = (msg, type = 'green') => {
        setToast({ msg, type });
        setTimeout(() => setToast({ msg: '', type: 'green' }), 4000);
    };

    // ── Fetch current sale status ─────────────────────────
    const fetchStatus = useCallback(() => {
        api.get('/products/discount/status')
            .then(({ data }) => setActiveSale(data.onSale ? data : null))
            .catch(() => {});
    }, []);

    useEffect(() => { fetchStatus(); }, [fetchStatus]);

    // ── Apply discount ────────────────────────────────────
    const handleApply = async () => {
        if (!dateRange || !dateRange[1]) { showToast('Please select an end date on the calendar.', 'red'); return; }
        const pct = Number(discountPct);
        if (!discountPct || pct < 1 || pct > 99) { showToast('Enter a discount between 1 and 99%.', 'red'); return; }

        setLoading(true);
        try {
            const endDate = dateRange[1];
            endDate.setHours(23, 59, 59, 999);
            const { data } = await api.post('/products/discount', {
                discountPct: pct,
                saleEndDate: endDate.toISOString()
            });
            showToast(data.message, 'green');
            setActiveSale({ onSale: true, discountPct: pct, saleEndDate: endDate });
            setDateRange(null);
            setDiscountPct('');
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to apply discount.', 'red');
        } finally {
            setLoading(false);
        }
    };

    // ── Revert all prices ─────────────────────────────────
    const handleRevert = async () => {
        if (!window.confirm('End the current sale and revert all prices to original?')) return;
        setReverting(true);
        try {
            const { data } = await api.delete('/products/discount');
            showToast(data.message, 'green');
            setActiveSale(null);
        } catch (err) {
            showToast('Failed to revert prices.', 'red');
        } finally {
            setReverting(false);
        }
    };

    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

    return (
        <>
            <style>{calStyle}</style>

            {/* Toast */}
            {toast.msg && (
                <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-xl font-semibold text-sm text-white animate-fadeInUp ${
                    toast.type === 'red' ? 'bg-red-500' : 'bg-green-500'
                }`}>
                    {toast.msg}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-brand-100 shadow-md overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-brand-100 flex items-center gap-3">
                    <span className="text-xl">🏷️</span>
                    <div>
                        <h3 className="text-lg font-extrabold text-brand-800"
                            style={{ fontFamily: '"Playfair Display", serif' }}>
                            Dynamic Discount Manager
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Schedule a store-wide sale using the calendar
                        </p>
                    </div>
                </div>

                <div className="p-6 grid md:grid-cols-2 gap-8">
                    {/* ── Left: Calendar ─────────────────────── */}
                    <div>
                        <p className="text-sm font-semibold text-brand-800 mb-3">
                            Select sale date range <span className="text-red-500">*</span>
                        </p>
                        <div className="discount-cal bg-brand-50 rounded-2xl p-4 border border-brand-100">
                            <Calendar
                                selectRange
                                value={dateRange}
                                onChange={setDateRange}
                                minDate={new Date()}
                                className="w-full"
                            />
                        </div>
                        {dateRange && Array.isArray(dateRange) && dateRange[0] && dateRange[1] && (
                            <div className="mt-3 p-3 bg-brand-50 rounded-xl border border-brand-200 text-sm">
                                <p className="font-semibold text-brand-800">📅 Selected range</p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {fmt(dateRange[0])} → {fmt(dateRange[1])}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ── Right: Discount + Status ────────────── */}
                    <div className="flex flex-col gap-5">
                        {/* Active sale banner */}
                        {activeSale && (
                            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-bold text-rose-700">🔥 Active Sale</p>
                                        <p className="text-3xl font-extrabold text-rose-600 mt-1">
                                            {activeSale.discountPct}% OFF
                                        </p>
                                        <p className="text-xs text-rose-400 mt-1">Ends: {fmt(activeSale.saleEndDate)}</p>
                                    </div>
                                    <button
                                        onClick={handleRevert}
                                        disabled={reverting}
                                        className="text-xs font-bold px-3 py-1.5 text-rose-600 border border-rose-300 rounded-lg hover:bg-rose-100 disabled:opacity-50 transition-all">
                                        {reverting ? 'Ending…' : '✕ End Sale'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Discount percentage input */}
                        <div>
                            <label className="block text-sm font-semibold text-brand-800 mb-2">
                                Discount Percentage <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number" min="1" max="99"
                                    value={discountPct}
                                    onChange={e => setDiscountPct(e.target.value)}
                                    placeholder="e.g. 20"
                                    className="w-full px-4 py-3 pr-10 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl font-extrabold text-brand-400">%</span>
                            </div>
                            {discountPct > 0 && (
                                <p className="text-xs text-slate-400 mt-1">
                                    Example: Rs.1,000 → <strong className="text-green-600">Rs.{Math.round(1000 * (1 - discountPct / 100)).toLocaleString()}</strong>
                                </p>
                            )}
                        </div>

                        {/* Preview strip */}
                        {discountPct > 0 && dateRange?.[0] && dateRange?.[1] && (
                            <div className="p-4 bg-green-50 rounded-xl border border-green-200 text-sm">
                                <p className="font-bold text-green-700">✅ Sale Preview</p>
                                <p className="text-xs text-green-600 mt-1">
                                    <strong>{discountPct}%</strong> off all products<br />
                                    from <strong>{fmt(dateRange[0])}</strong> to <strong>{fmt(dateRange[1])}</strong>
                                </p>
                            </div>
                        )}

                        {/* Apply button */}
                        <button
                            onClick={handleApply}
                            disabled={loading || !dateRange || !discountPct}
                            className="mt-auto w-full py-3.5 font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 active:scale-95 disabled:opacity-50 shadow-md transition-all text-sm">
                            {loading ? 'Applying…' : '🚀 Apply Sale to All Products'}
                        </button>

                        <p className="text-xs text-slate-400 text-center -mt-2">
                            Applies to all products in the store simultaneously.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
