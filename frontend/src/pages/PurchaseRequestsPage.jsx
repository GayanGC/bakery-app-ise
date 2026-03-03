// frontend/src/pages/PurchaseRequestsPage.jsx
import { useState, useEffect } from 'react';
import api from '../api/axios';

import { useAuth } from '../context/AuthContext';

const statusStyle = {
    Pending: 'bg-amber-100 text-amber-700',
    Sent: 'bg-blue-100  text-blue-700',
    Received: 'bg-green-100 text-green-700'
};

export default function PurchaseRequestsPage() {
    const { hasRole } = useAuth();
    const [requests, setRequests] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [activeTab, setActiveTab] = useState('Pending'); // Pending | History
    const [saving, setSaving] = useState({});

    // New request form (InventoryManager only)
    const [showForm, setShowForm] = useState(false);
    const [newReq, setNewReq] = useState({ materialId: '', quantity: 1, notes: '' });

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const [reqRes, matRes] = await Promise.all([
                api.get('/purchases'),
                hasRole('InventoryManager', 'Admin') ? api.get('/inventory') : Promise.resolve({ data: [] })
            ]);
            setRequests(reqRes.data);
            setMaterials(matRes.data);
        } catch (e) {
            setError('Failed to load purchase requests.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRequests(); }, []);

    const handleMarkSent = async (id) => {
        setSaving(p => ({ ...p, [id]: true }));
        try {
            const { data } = await api.put(`/purchases/${id}/status`, { status: 'Sent' });
            setMsg(data.message);
            fetchRequests();
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            setMsg(e.response?.data?.message || 'Failed to update.');
        } finally {
            setSaving(p => ({ ...p, [id]: false }));
        }
    };

    const handleCreateRequest = async (e) => {
        e.preventDefault();
        setSaving(p => ({ ...p, new: true }));
        try {
            await api.post('/purchases', newReq);
            setShowForm(false);
            setNewReq({ materialId: '', quantity: 1, notes: '' });
            fetchRequests();
            setMsg('Purchase request created ✅');
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            setMsg(e.response?.data?.message || 'Failed to create request.');
        } finally {
            setSaving(p => ({ ...p, new: false }));
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

    const pendingList = requests.filter(r => r.status === 'Pending');
    const historyList = requests.filter(r => r.status !== 'Pending');

    const canCreate = hasRole('InventoryManager', 'Admin');
    const canSend = hasRole('InventorySeller', 'Admin');

    return (
        <div className="min-h-screen bg-brand-50">


            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-extrabold text-brand-800"
                            style={{ fontFamily: '"Playfair Display", serif' }}>
                            Purchase Requests
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            {canSend ? 'Mark items as Sent once dispatched to the supplier.' : 'Track all raw material purchase requests.'}
                        </p>
                    </div>
                    {canCreate && (
                        <button onClick={() => setShowForm(s => !s)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-brand-600 active:scale-95 transition-all">
                            {showForm ? '✕ Cancel' : '+ New Request'}
                        </button>
                    )}
                </div>

                {msg && <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-200 text-sm font-semibold">{msg}</div>}
                {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">{error}</div>}

                {/* Create Request Form */}
                {showForm && canCreate && (
                    <form onSubmit={handleCreateRequest}
                        className="bg-white rounded-2xl border border-brand-100 shadow-md p-6 space-y-4">
                        <h3 className="font-extrabold text-brand-800">New Purchase Request</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-brand-800 mb-1">Material</label>
                                <select required
                                    className="block w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    value={newReq.materialId}
                                    onChange={e => setNewReq({ ...newReq, materialId: e.target.value })}>
                                    <option value="">Select material…</option>
                                    {materials.map(m => (
                                        <option key={m._id} value={m._id}>{m.name} ({m.unit})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-brand-800 mb-1">Quantity</label>
                                <input type="number" min="1" required
                                    className="block w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    value={newReq.quantity}
                                    onChange={e => setNewReq({ ...newReq, quantity: Number(e.target.value) })} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-brand-800 mb-1">Notes (optional)</label>
                            <input placeholder="Any special instructions…"
                                className="block w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                                value={newReq.notes}
                                onChange={e => setNewReq({ ...newReq, notes: e.target.value })} />
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={saving.new}
                                className="px-6 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-xl hover:bg-brand-600 active:scale-95 transition-all disabled:opacity-50">
                                {saving.new ? 'Creating…' : 'Create Request'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Tabs */}
                <div className="flex gap-1 bg-white border border-brand-100 rounded-xl p-1 w-fit shadow-sm">
                    {['Pending', 'History'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab ? 'bg-brand-500 text-white shadow' : 'text-slate-500 hover:text-brand-700'}`}>
                            {tab}
                            <span className="ml-1.5 text-xs">({tab === 'Pending' ? pendingList.length : historyList.length})</span>
                        </button>
                    ))}
                </div>

                {/* Request List */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {(activeTab === 'Pending' ? pendingList : historyList).map(req => (
                            <div key={req._id}
                                className="bg-white rounded-2xl border border-brand-100 shadow-sm p-5 flex items-center gap-5 hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center text-2xl shrink-0">🏭</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <p className="font-bold text-brand-800">{req.materialName}</p>
                                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${statusStyle[req.status]}`}>
                                            {req.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        Qty: <strong>{req.quantity} {req.unit}</strong>
                                        {req.requestedBy && ` · Requested by: ${req.requestedBy.name}`}
                                    </p>
                                    {req.notes && <p className="text-xs text-slate-400 mt-0.5 italic">"{req.notes}"</p>}
                                    <div className="flex gap-4 mt-1 text-xs text-slate-400">
                                        <span>Created: {formatDate(req.createdAt)}</span>
                                        {req.sentAt && <span>Sent: {formatDate(req.sentAt)}</span>}
                                        {req.receivedAt && <span>Received: {formatDate(req.receivedAt)}</span>}
                                    </div>
                                </div>
                                {canSend && req.status === 'Pending' && (
                                    <button
                                        onClick={() => handleMarkSent(req._id)}
                                        disabled={saving[req._id]}
                                        className="shrink-0 px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50">
                                        {saving[req._id] ? '…' : '📮 Mark as Sent'}
                                    </button>
                                )}
                            </div>
                        ))}
                        {(activeTab === 'Pending' ? pendingList : historyList).length === 0 && (
                            <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-brand-200">
                                <div className="text-5xl mb-3">📋</div>
                                <p className="text-lg font-bold text-brand-800"
                                    style={{ fontFamily: '"Playfair Display", serif' }}>
                                    No {activeTab.toLowerCase()} requests
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
