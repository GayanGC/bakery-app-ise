// frontend/src/pages/InventoryPage.jsx
import { useState, useEffect } from 'react';
import api from '../api/axios';


export default function InventoryPage() {
    const [materials, setMaterials] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editId, setEditId] = useState(null);
    const [editVal, setEditVal] = useState({});

    // New material form
    const [showForm, setShowForm] = useState(false);
    const [newMat, setNewMat] = useState({ name: '', unit: 'kg', quantity: 0, lowStockThreshold: 10, supplier: '', notes: '' });
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [matRes, lowRes] = await Promise.all([
                api.get('/inventory'),
                api.get('/inventory/low-stock')
            ]);
            setMaterials(matRes.data);
            setLowStock(lowRes.data);
        } catch (e) {
            setError('Failed to load inventory. Are you authorized?');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const startEdit = (mat) => {
        setEditId(mat._id);
        setEditVal({ quantity: mat.quantity, lowStockThreshold: mat.lowStockThreshold, supplier: mat.supplier, notes: mat.notes });
    };

    const saveEdit = async (id) => {
        setSaving(true);
        try {
            const { data } = await api.put(`/inventory/${id}`, editVal);
            setMsg(data.message);
            setEditId(null);
            fetchData();
            setTimeout(() => setMsg(''), 3000);
        } catch (e) {
            setMsg(e.response?.data?.message || 'Save failed.');
        } finally { setSaving(false); }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/inventory', { ...newMat, quantity: Number(newMat.quantity), lowStockThreshold: Number(newMat.lowStockThreshold) });
            setShowForm(false);
            setNewMat({ name: '', unit: 'kg', quantity: 0, lowStockThreshold: 10, supplier: '', notes: '' });
            fetchData();
        } catch (e) {
            setMsg(e.response?.data?.message || 'Failed to add material.');
        } finally { setSaving(false); }
    };

    const inputCls = "px-3 py-1.5 text-sm bg-brand-50 border border-brand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500";

    return (
        <div className="min-h-screen bg-brand-50">


            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* ── Low Stock Alert ─────────────────────────── */}
                {lowStock.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">⚠️</span>
                            <h3 className="font-extrabold text-red-700">Low Stock Alert — {lowStock.length} item(s) need attention</h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {lowStock.map(m => (
                                <span key={m._id} className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                                    {m.name}: {m.quantity} {m.unit} (min: {m.lowStockThreshold})
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Header ─────────────────────────────────── */}
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-extrabold text-brand-800"
                            style={{ fontFamily: '"Playfair Display", serif' }}>Raw Materials</h2>
                        <p className="text-sm text-slate-500 mt-1">Manage stock levels — no deletions allowed</p>
                    </div>
                    <button onClick={() => setShowForm(s => !s)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-brand-600 active:scale-95 transition-all">
                        {showForm ? '✕ Cancel' : '+ Add Material'}
                    </button>
                </div>

                {msg && <div className={`p-4 rounded-xl text-sm font-semibold ${msg.includes('LOW') ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>{msg}</div>}
                {error && <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm">{error}</div>}

                {/* ── Add Material Form ──────────────────────── */}
                {showForm && (
                    <form onSubmit={handleAdd}
                        className="bg-white rounded-2xl border border-brand-100 shadow-md p-6 grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-brand-800 mb-1">Material Name</label>
                            <input required placeholder="e.g. Wheat Flour" className={`${inputCls} w-full`}
                                value={newMat.name} onChange={e => setNewMat({ ...newMat, name: e.target.value })} />
                        </div>
                        {[
                            { label: 'Unit', field: 'unit', placeholder: 'kg / litres / pcs' },
                            { label: 'Supplier', field: 'supplier', placeholder: 'Supplier name' }
                        ].map(f => (
                            <div key={f.field}>
                                <label className="block text-sm font-semibold text-brand-800 mb-1">{f.label}</label>
                                <input placeholder={f.placeholder} className={`${inputCls} w-full`}
                                    value={newMat[f.field]} onChange={e => setNewMat({ ...newMat, [f.field]: e.target.value })} />
                            </div>
                        ))}
                        <div>
                            <label className="block text-sm font-semibold text-brand-800 mb-1">Initial Quantity</label>
                            <input type="number" min="0" className={`${inputCls} w-full`}
                                value={newMat.quantity} onChange={e => setNewMat({ ...newMat, quantity: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-brand-800 mb-1">Low Stock Threshold</label>
                            <input type="number" min="1" className={`${inputCls} w-full`}
                                value={newMat.lowStockThreshold} onChange={e => setNewMat({ ...newMat, lowStockThreshold: e.target.value })} />
                        </div>
                        <div className="col-span-2 flex justify-end">
                            <button type="submit" disabled={saving}
                                className="px-6 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-xl hover:bg-brand-600 active:scale-95 transition-all disabled:opacity-50">
                                {saving ? 'Saving…' : 'Add Material'}
                            </button>
                        </div>
                    </form>
                )}

                {/* ── Materials Table ────────────────────────── */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-brand-100 shadow-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-brand-50 text-xs uppercase text-slate-400 tracking-wide">
                                    <tr>
                                        {['Material', 'Unit', 'Quantity', 'Min Threshold', 'Supplier', 'Status', 'Actions'].map(h => (
                                            <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-50">
                                    {materials.map(mat => (
                                        <tr key={mat._id} className={`transition-colors hover:bg-brand-50/40 ${mat.isLowStock ? 'bg-red-50/30' : ''}`}>
                                            <td className="px-5 py-4 font-semibold text-brand-800">{mat.name}</td>
                                            <td className="px-5 py-4 text-slate-500">{mat.unit}</td>
                                            <td className="px-5 py-4">
                                                {editId === mat._id ? (
                                                    <input type="number" min="0"
                                                        className={`${inputCls} w-24`}
                                                        value={editVal.quantity}
                                                        onChange={e => setEditVal({ ...editVal, quantity: Number(e.target.value) })} />
                                                ) : (
                                                    <span className={`font-bold ${mat.isLowStock ? 'text-red-600' : 'text-slate-800'}`}>
                                                        {mat.quantity}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-slate-500">{mat.lowStockThreshold}</td>
                                            <td className="px-5 py-4 text-slate-500">{mat.supplier || '—'}</td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${mat.isLowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                    {mat.isLowStock ? '⚠️ Low Stock' : '✅ OK'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                {editId === mat._id ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => saveEdit(mat._id)} disabled={saving}
                                                            className="text-xs font-semibold text-green-600 hover:text-green-800">
                                                            {saving ? '…' : '✓ Save'}
                                                        </button>
                                                        <button onClick={() => setEditId(null)}
                                                            className="text-xs font-semibold text-slate-400 hover:text-slate-600">
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => startEdit(mat)}
                                                        className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors">
                                                        ✏️ Edit Stock
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {materials.length === 0 && (
                                        <tr><td colSpan={7} className="text-center py-12 text-slate-400">No materials added yet.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
