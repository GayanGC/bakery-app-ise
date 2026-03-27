// frontend/src/components/FeedbackList.jsx
// Visible ONLY to Admin and Manager roles.
// Fetches GET /api/feedback and renders Modern Review Cards with Admin delete.
import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// ── Star Rating display ──────────────────────────────────
function StarRating({ rating }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
                <span
                    key={star}
                    className={`text-xl leading-none transition-colors ${star <= rating ? 'text-amber-400' : 'text-slate-200'}`}
                >
                    ★
                </span>
            ))}
            <span className="ml-2 text-xs font-bold text-amber-500">{rating}/5</span>
        </div>
    );
}

// ── Role badge colours ────────────────────────────────────
const ROLE_BADGE = {
    Customer:         'bg-sky-100 text-sky-700',
    Staff:            'bg-purple-100 text-purple-700',
    Manager:          'bg-amber-100 text-amber-700',
    Admin:            'bg-rose-100 text-rose-700',
    InventorySeller:  'bg-teal-100 text-teal-700',
    InventoryManager: 'bg-blue-100 text-blue-700',
};

// ── Single Review Card ────────────────────────────────────
function ReviewCard({ fb, index, canDelete, onDelete }) {
    const [confirm,  setConfirm]  = useState(false);
    const [deleting, setDeleting] = useState(false);

    const user    = fb.user  || {};
    const order   = fb.order || {};
    const name    = user.name  || 'Anonymous';
    const role    = user.role  || 'Customer';
    const orderId = order._id  ? `#${order._id.slice(-7).toUpperCase()}` : '—';
    const date    = fb.createdAt
        ? new Date(fb.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : '—';

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/feedback/${fb._id}`);
            onDelete(fb._id);
        } catch {
            setDeleting(false);
            setConfirm(false);
        }
    };

    return (
        <div
            className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 flex flex-col gap-3
                       hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fadeInUp"
            style={{ animationDelay: `${index * 0.06}s` }}
        >
            {/* ── Top row: avatar + name + badge ── */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center
                                text-brand-700 font-extrabold text-base shrink-0 select-none">
                    {name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-slate-800 truncate leading-tight">{name}</p>
                    <p className="text-xs text-slate-400 truncate">{user.email || ''}</p>
                </div>

                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${ROLE_BADGE[role] || 'bg-slate-100 text-slate-600'}`}>
                    {role}
                </span>
            </div>

            {/* ── Star rating ── */}
            <StarRating rating={fb.rating} />

            {/* ── Comment ── */}
            {fb.comment ? (
                <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-brand-200 pl-3">
                    "{fb.comment}"
                </p>
            ) : (
                <p className="text-xs text-slate-300 italic">No comment provided.</p>
            )}

            {/* ── Footer: order + date + delete ── */}
            <div className="flex items-center justify-between pt-2 border-t border-brand-50 text-xs text-slate-400">
                <span>Order <span className="font-mono font-semibold text-brand-600">{orderId}</span></span>
                <div className="flex items-center gap-3">
                    <span>{date}</span>

                    {/* Admin / Manager delete button */}
                    {canDelete && !confirm && (
                        <button
                            onClick={() => setConfirm(true)}
                            title="Delete review"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-1 transition-all"
                        >
                            🗑️
                        </button>
                    )}

                    {/* Inline confirmation */}
                    {confirm && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 text-xs">Delete?</span>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-all"
                            >
                                {deleting ? '…' : 'Yes'}
                            </button>
                            <button
                                onClick={() => setConfirm(false)}
                                className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg hover:bg-slate-200 transition-all"
                            >
                                No
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main FeedbackList Component ───────────────────────────
export default function FeedbackList() {
    const { hasRole } = useAuth();
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading,   setLoading]   = useState(true);
    const [error,     setError]     = useState('');

    const isAdmin = hasRole('Admin', 'Manager');

    useEffect(() => {
        if (!isAdmin) return;
        api.get('/feedback')
            .then(res => setFeedbacks(res.data))
            .catch(() => setError('Could not load customer reviews.'))
            .finally(() => setLoading(false));
    }, [isAdmin]);

    // Optimistic removal after delete
    const handleDelete = (id) => setFeedbacks(prev => prev.filter(f => f._id !== id));

    // Guard: only Admin / Manager can see this
    if (!isAdmin) return null;

    return (
        <div className="bg-white rounded-2xl border border-brand-100 shadow-md overflow-hidden">
            {/* ── Section Header ── */}
            <div className="px-6 py-4 border-b border-brand-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-xl">⭐</span>
                    <div>
                        <h3
                            className="text-lg font-extrabold text-brand-800"
                            style={{ fontFamily: '"Playfair Display", serif' }}
                        >
                            Customer Reviews
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            All feedback submitted by customers for delivered orders
                        </p>
                    </div>
                </div>
                {!loading && (
                    <span className="text-xs font-bold bg-brand-100 text-brand-700 px-3 py-1 rounded-full">
                        {feedbacks.length} review{feedbacks.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* ── Body ── */}
            <div className="p-6">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    </div>

                ) : error ? (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm text-center">{error}</div>

                ) : feedbacks.length === 0 ? (
                    <div className="py-14 flex flex-col items-center gap-3 text-slate-400">
                        <span className="text-5xl">🍞</span>
                        <p className="font-semibold text-base">No reviews yet</p>
                        <p className="text-sm">Customer feedback will appear here once orders are delivered.</p>
                    </div>

                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {feedbacks.map((fb, i) => (
                            <ReviewCard
                                key={fb._id}
                                fb={fb}
                                index={i}
                                canDelete={isAdmin}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
