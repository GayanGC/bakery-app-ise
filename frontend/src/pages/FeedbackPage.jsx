// frontend/src/pages/FeedbackPage.jsx
// Customer: submit a 1–5 star rating + comment for a specific Delivered order
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';


const STAR_LABELS = ['', 'Terrible', 'Poor', 'Good', 'Very Good', 'Excellent'];

export default function FeedbackPage() {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState(null);
    const [existing, setExisting] = useState(null);
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                // Load the order and check for existing feedback in parallel
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
            } catch (e) {
                setError('Could not load order details.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [orderId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) { setError('Please select a star rating.'); return; }
        setSubmitting(true);
        setError('');
        try {
            await api.post('/feedback', { orderId, rating, comment });
            setSuccess(true);
            setTimeout(() => navigate('/orders'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit feedback.');
        } finally {
            setSubmitting(false);
        }
    };

    const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div className="min-h-screen bg-brand-50">
            <main className="max-w-xl mx-auto px-4 py-10">


                <div className="bg-white rounded-3xl shadow-md border border-brand-100 overflow-hidden">
                    {/* Header */}
                    <div className="h-1.5 bg-gradient-to-r from-brand-400 to-brand-600" />
                    <div className="p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-2xl shadow-md">⭐</div>
                            <div>
                                <h2 className="text-2xl font-extrabold text-brand-800"
                                    style={{ fontFamily: '"Playfair Display", serif' }}>
                                    {existing ? 'Your Feedback' : 'Leave Feedback'}
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {existing ? 'You already reviewed this order.' : 'Rate your experience with this order.'}
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

                                {/* Success state */}
                                {success && (
                                    <div className="text-center py-8">
                                        <div className="text-5xl mb-3">🎉</div>
                                        <h3 className="text-xl font-extrabold text-brand-800 mb-1"
                                            style={{ fontFamily: '"Playfair Display", serif' }}>
                                            Thank you!
                                        </h3>
                                        <p className="text-sm text-slate-500">Your feedback has been recorded. Redirecting…</p>
                                    </div>
                                )}

                                {/* Feedback form */}
                                {!success && (
                                    <form onSubmit={handleSubmit} className="space-y-5">
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
                                                        disabled={!!existing}
                                                        onClick={() => !existing && setRating(star)}
                                                        onMouseEnter={() => !existing && setHover(star)}
                                                        onMouseLeave={() => setHover(0)}
                                                        className={`text-4xl transition-all duration-150 hover:scale-110 active:scale-95
                                                            ${!existing ? 'cursor-pointer' : 'cursor-default'}`}>
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
                                                disabled={!!existing}
                                                placeholder="Tell us about your experience…"
                                                className="block w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60 transition-all"
                                                value={comment}
                                                onChange={e => setComment(e.target.value)}
                                            />
                                            <p className="text-right text-xs text-slate-400 mt-1">{comment.length}/500</p>
                                        </div>

                                        {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 px-4 py-2 rounded-xl">{error}</p>}

                                        {!existing && (
                                            <button type="submit"
                                                disabled={submitting || rating === 0}
                                                className="w-full py-3 font-bold text-white bg-brand-500 rounded-xl shadow-md hover:bg-brand-600 active:scale-95 disabled:opacity-50 transition-all">
                                                {submitting ? 'Submitting…' : '⭐ Submit Feedback'}
                                            </button>
                                        )}
                                        {existing && (
                                            <p className="text-center text-sm text-green-600 font-semibold">
                                                ✓ Feedback already submitted for this order.
                                            </p>
                                        )}
                                        <button type="button" onClick={() => navigate('/orders')}
                                            className="w-full py-2.5 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                                            ← Back to My Orders
                                        </button>
                                    </form>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
