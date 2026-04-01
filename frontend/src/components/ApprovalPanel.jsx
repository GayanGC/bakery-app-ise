// frontend/src/components/ApprovalPanel.jsx
// Admin-only: shows users with status="In Process" and lets Admin approve+assign PIN
import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

// ── Role badge colours ───────────────────────────────────
const ROLE_BADGE = {
    Staff:            'bg-purple-100 text-purple-700',
    Manager:          'bg-amber-100  text-amber-700',
    Admin:            'bg-rose-100   text-rose-700',
    InventoryManager: 'bg-blue-100   text-blue-700',
    InventorySeller:  'bg-teal-100   text-teal-700',
};

// ── Approve Modal ────────────────────────────────────────
function ApproveModal({ user, onConfirm, onClose }) {
    const [pin,     setPin]     = useState('');
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!/^\d{4}$/.test(pin)) { setError('Enter exactly 4 digits.'); return; }
        setLoading(true);
        setError('');
        try {
            await api.post(`/users/${user._id}/approve`, { pin });
            onConfirm(user._id);
        } catch (err) {
            setError(err.response?.data?.message || 'Approval failed.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-2xl">✅</div>
                    <div>
                        <h3 className="text-lg font-extrabold text-slate-800"
                            style={{ fontFamily: '"Playfair Display", serif' }}>Approve Account</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Assign a 4-digit PIN to <strong>{user.name}</strong></p>
                    </div>
                </div>

                {/* User info strip */}
                <div className="bg-brand-50 rounded-xl p-3 mb-5 text-sm">
                    <p className="font-bold text-slate-700">{user.name} <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-1 ${ROLE_BADGE[user.role] || 'bg-slate-100'}`}>{user.role}</span></p>
                    <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                </div>

                {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-1">Security PIN</label>
                        <input
                            type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4}
                            value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="••••"
                            className="w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-center text-2xl tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-green-400"
                            autoFocus
                        />
                        {/* PIN dots */}
                        <div className="flex justify-center gap-2 mt-2">
                            {[0,1,2,3].map(i => (
                                <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${pin.length > i ? 'bg-green-500 scale-110' : 'bg-brand-200'}`} />
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading || pin.length !== 4}
                            className="flex-1 py-2.5 text-sm font-bold text-white bg-green-500 rounded-xl hover:bg-green-600 disabled:opacity-50 transition-all shadow-md">
                            {loading ? 'Approving…' : '✅ Approve & Activate'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main ApprovalPanel ────────────────────────────────────
export default function ApprovalPanel() {
    const [requests, setRequests] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [target,   setTarget]   = useState(null);
    const [toast,    setToast]    = useState('');

    const fetchPending = useCallback(() => {
        setLoading(true);
        api.get('/users/pending')
            .then(({ data }) => setRequests(data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchPending(); }, [fetchPending]);

    const handleApproved = (userId) => {
        const name = requests.find(r => r._id === userId)?.name;
        setRequests(prev => prev.filter(r => r._id !== userId));
        setTarget(null);
        setToast(`${name} approved successfully! ✅`);
        setTimeout(() => setToast(''), 4000);
    };

    const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <>
            {/* Toast */}
            {toast && (
                <div className="fixed top-20 right-4 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-xl font-semibold text-sm animate-fadeInUp">
                    {toast}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-brand-100 shadow-md overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-brand-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">⏳</span>
                        <div>
                            <h3 className="text-lg font-extrabold text-brand-800"
                                style={{ fontFamily: '"Playfair Display", serif' }}>
                                Pending Approval Requests
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                New staff/manager accounts waiting for activation
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {requests.length > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                                {requests.length}
                            </span>
                        )}
                        <button onClick={fetchPending}
                            className="text-xs font-semibold text-brand-500 hover:text-brand-700 transition-colors">
                            ↻ Refresh
                        </button>
                    </div>
                </div>

                {/* Body */}
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="text-4xl mb-3">🎉</div>
                        <p className="text-slate-400 font-semibold text-sm">All caught up! No pending requests.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-brand-50">
                        {requests.map(req => (
                            <div key={req._id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-brand-50/40 transition-colors">
                                {/* Avatar initials */}
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 flex items-center justify-center text-white font-extrabold text-lg shrink-0">
                                    {req.name?.[0]?.toUpperCase()}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-bold text-slate-800 truncate">{req.name}</p>
                                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${ROLE_BADGE[req.role] || 'bg-slate-100 text-slate-600'}`}>
                                            {req.role}
                                        </span>
                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">
                                            ⏳ In Process
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 truncate">{req.email}</p>
                                    <p className="text-xs text-slate-400">📱 {req.phone || '—'} &nbsp;·&nbsp; Registered {fmt(req.createdAt)}</p>
                                </div>

                                {/* Approve button */}
                                <button
                                    onClick={() => setTarget(req)}
                                    className="shrink-0 px-5 py-2.5 bg-green-500 text-white text-sm font-bold rounded-xl hover:bg-green-600 active:scale-95 shadow transition-all">
                                    ✅ Approve
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Approve Modal */}
            {target && (
                <ApproveModal
                    user={target}
                    onConfirm={handleApproved}
                    onClose={() => setTarget(null)}
                />
            )}
        </>
    );
}
