// frontend/src/pages/FeedbackPage.jsx
// Customer: submit / edit / delete a 1–5 star rating + comment for a Delivered order
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const STAR_LABELS = ['', 'Terrible', 'Poor', 'Good', 'Very Good', 'Excellent'];

export default function FeedbackPage() {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const [order,      setOrder]      = useState(null);
    const [existing,   setExisting]   = useState(null);   // saved feedback doc
    const [editMode,   setEditMode]   = useState(false);  // inline edit toggle
    const [showDelConfirm, setShowDelConfirm] = useState(false);

    const [rating,     setRating]     = useState(0);
    const [hover,      setHover]      = useState(0);
    const [comment,    setComment]    = useState('');

    const [loading,    setLoading]    = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deleting,   setDeleting]   = useState(false);
    const [success,    setSuccess]    = useState(false);
    const [error,      setError]      = useState('');

    // ── Load order + existing feedback ──────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const [orderRes, fbRes] = await Promise.all([
                    api.get(`/orders/${orderId}`),
                    api.get(`/feedback/order/${orderId}`)
                ]);
                setOrder(orderRes.data);
                if (fbRes.data.exists) {
                    setExisting(fbRes.data.feedback);
                    setRating(fbRes.data.feedback.rating);
                    setComment(fbRes.data.feedback.comment);
                }
            } catch {
                setError('Could not load order details.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [orderId]);

    // ── Submit NEW feedback ──────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) { setError('Please select a star rating.'); return; }
        setSubmitting(true);
        setError('');
        try {
            const { data } = await api.post('/feedback', { orderId, rating, comment });
            setExisting(data.feedback);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit feedback.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── UPDATE existing feedback ─────────────────────────────────
    const handleUpdate = async (e) => {
        e.preventDefault();
        if (rating === 0) { setError('Please select a star rating.'); return; }
        setSubmitting(true);
        setError('');
        try {
            const { data } = await api.put(`/feedback/${existing._id}`, { rating, comment });
            setExisting(data.feedback);
            setEditMode(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update feedback.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── DELETE feedback ──────────────────────────────────────────
    const handleDelete = async () => {
        setDeleting(true);
        setError('');
        try {
            await api.delete(`/feedback/${existing._id}`);
            setExisting(null);
            setRating(0);
            setComment('');
            setEditMode(false);
            setShowDelConfirm(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete feedback.');
        } finally {
            setDeleting(false);
        }
    };

    const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    // Whether to show the interactive form
    const showForm = !existing || editMode;

    return (
        <div className="min-h-screen bg-brand-50">
            <main className="max-w-xl mx-auto px-4 py-10">
                <div className="bg-white rounded-3xl shadow-md border border-brand-100 overflow-hidden">
                    {/* Header accent */}
                    <div className="h-1.5 bg-gradient-to-r from-brand-400 to-brand-600" />

                    <div className="p-8">
                        {/* Title row */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-2xl shadow-md">⭐</div>
                            <div>
                                <h2 className="text-2xl font-extrabold text-brand-800"
                                    style={{ fontFamily: '"Playfair Display", serif' }}>
                                    {existing ? (editMode ? 'Edit Your Feedback' : 'Your Feedback') : 'Leave Feedback'}
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {existing
                                        ? (editMode ? 'Update your rating and comment below.' : 'You already reviewed this order.')
                                        : 'Rate your experience with this order.'}
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                            </div>
                        ) : (
                            <>
                                {/* Order summary */}
                                {order && (
                                    <div className="mb-6 p-4 bg-brand-50 rounded-2xl border border-brand-100">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-mono text-xs text-slate-400">
                                                Order #{order._id.slice(-8).toUpperCase()}
                                            </span>
                                            <span className="text-sm font-bold text-brand-700">
                                                Rs. {order.totalPrice?.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {order.orderItems?.map((item, i) => (
                                                <span key={i} className="text-xs font-semibold bg-white text-brand-600 px-2.5 py-1 rounded-full border border-brand-200">
                                                    {item.name} ×{item.qty}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2">{fmt(order.createdAt)}</p>
                                    </div>
                                )}

                                {/* ── Success banner ── */}
                                {success && (
                                    <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-semibold text-center animate-fadeInUp">
                                        ✓ {existing ? 'Feedback updated!' : 'Feedback submitted!'}
                                    </div>
                                )}

                                {/* ── Error banner ── */}
                                {error && (
                                    <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">{error}</p>
                                )}

                                {/* ── View mode: existing feedback + Edit / Delete buttons ── */}
                                {existing && !editMode && (
                                    <div className="mb-6">
                                        {/* Existing rating display */}
                                        <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100 mb-4">
                                            <div className="flex gap-1 mb-2">
                                                {[1,2,3,4,5].map(s => (
                                                    <span key={s} className={`text-2xl ${s <= existing.rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                                                ))}
                                                <span className="ml-2 text-sm font-bold text-amber-500 self-center">{existing.rating}/5</span>
                                            </div>
                                            {existing.comment && (
                                                <p className="text-sm text-slate-600 italic border-l-2 border-brand-300 pl-3">
                                                    "{existing.comment}"
                                                </p>
                                            )}
                                        </div>

                                        {/* Edit / Delete action buttons */}
                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => { setEditMode(true); setError(''); }}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition-all"
                                            >
                                                ✏️ Edit Review
                                            </button>
                                            <button
                                                onClick={() => setShowDelConfirm(true)}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all"
                                            >
                                                🗑️ Delete Review
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* ── Delete Confirmation Modal ── */}
                                {showDelConfirm && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
                                            <div className="text-4xl mb-3">🗑️</div>
                                            <h3 className="text-lg font-extrabold text-slate-800 mb-1">Delete Review?</h3>
                                            <p className="text-sm text-slate-500 mb-6">
                                                Are you sure you want to delete this review? This action cannot be undone.
                                            </p>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setShowDelConfirm(false)}
                                                    className="flex-1 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleDelete}
                                                    disabled={deleting}
                                                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-all"
                                                >
                                                    {deleting ? 'Deleting…' : 'Yes, Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── Feedback form (new OR edit) ── */}
                                {showForm && (
                                    <form onSubmit={existing ? handleUpdate : handleSubmit} className="space-y-5">
                                        {/* Star rating */}
                                        <div>
                                            <label className="block text-sm font-semibold text-brand-800 mb-3">
                                                Your Rating <span className="text-red-400">*</span>
                                            </label>
                                            <div className="flex gap-2 justify-center">
                                                {[1, 2, 3, 4, 5].map(star => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() => setRating(star)}
                                                        onMouseEnter={() => setHover(star)}
                                                        onMouseLeave={() => setHover(0)}
                                                        className="text-4xl transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer"
                                                    >
                                                        {star <= (hover || rating) ? '⭐' : '☆'}
                                                    </button>
                                                ))}
                                            </div>
                                            {(hover || rating) > 0 && (
                                                <p className="text-center text-sm font-bold text-brand-600 mt-2">
                                                    {STAR_LABELS[hover || rating]}
                                                </p>
                                            )}
                                        </div>

                                        {/* Comment */}
                                        <div>
                                            <label className="block text-sm font-semibold text-brand-800 mb-1">
                                                Comment <span className="text-slate-400 font-normal">(optional)</span>
                                            </label>
                                            <textarea
                                                rows={4}
                                                maxLength={500}
                                                placeholder="Tell us about your experience…"
                                                className="block w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                                value={comment}
                                                onChange={e => setComment(e.target.value)}
                                            />
                                            <p className="text-right text-xs text-slate-400 mt-1">{comment.length}/500</p>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-3">
                                            {editMode && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditMode(false); setRating(existing.rating); setComment(existing.comment); setError(''); }}
                                                    className="flex-1 py-2.5 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                            <button
                                                type="submit"
                                                disabled={submitting || rating === 0}
                                                className="flex-1 py-3 font-bold text-white bg-brand-500 rounded-xl shadow-md hover:bg-brand-600 active:scale-95 disabled:opacity-50 transition-all"
                                            >
                                                {submitting
                                                    ? (editMode ? 'Updating…' : 'Submitting…')
                                                    : (editMode ? '✏️ Update Feedback' : '⭐ Submit Feedback')}
                                            </button>
                                        </div>

                                        <button type="button" onClick={() => navigate('/orders')}
                                            className="w-full py-2.5 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                                            ← Back to My Orders
                                        </button>
                                    </form>
                                )}

                                {/* Back button when viewing (not editing) existing */}
                                {existing && !editMode && (
                                    <button type="button" onClick={() => navigate('/orders')}
                                        className="mt-4 w-full py-2.5 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                                        ← Back to My Orders
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
