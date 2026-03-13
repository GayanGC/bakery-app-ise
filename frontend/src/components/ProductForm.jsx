import { useState, useRef } from 'react';
import api from '../api/axios';

const SERVER_URL = 'http://localhost:5000';

function ProductForm({ product, onClose, onSaved }) {
    const [form, setForm] = useState({
        name: product ? product.name : '',
        description: product ? product.description : '',
        price: product ? product.price : '',
        category: product ? product.category : '',
        countInStock: product ? product.countInStock : '',
    });

    // imageFile  – the newly selected File object (if any)
    // previewUrl – object URL for the chosen file, or the existing server image
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(
        product?.image ? `${SERVER_URL}${product.image}` : ''
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Build FormData so multer can parse the multipart body
            const data = new FormData();
            data.append('name', form.name);
            data.append('description', form.description);
            data.append('price', form.price);
            data.append('category', form.category);
            data.append('countInStock', form.countInStock);
            if (imageFile) data.append('image', imageFile);

            const config = { headers: { 'Content-Type': 'multipart/form-data' } };

            if (product && product._id) {
                await api.put(`/products/${product._id}`, data, config);
            } else {
                await api.post('/products', data, config);
            }
            onSaved();
        } catch (err) {
            setError(
                err.response?.data?.message ?? 'Failed to save product.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-full">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-800">
                        {product ? 'Edit Product' : 'Add New Product'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {error && (
                        <div className="mb-4 p-3 text-sm text-red-700 bg-red-100 rounded-lg border border-red-200">
                            {error}
                        </div>
                    )}

                    <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Name</label>
                            <input
                                type="text"
                                name="name"
                                required
                                value={form.name}
                                onChange={handleChange}
                                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-brand-500"
                                placeholder="Chocolate Cake"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Price (Rs.)</label>
                                <input
                                    type="number"
                                    name="price"
                                    step="0.01"
                                    required
                                    value={form.price}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                                    placeholder="15.99"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Stock Count</label>
                                <input
                                    type="number"
                                    name="countInStock"
                                    required
                                    value={form.countInStock}
                                    onChange={handleChange}
                                    className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                                    placeholder="20"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Category</label>
                            <input
                                type="text"
                                name="category"
                                required
                                value={form.category}
                                onChange={handleChange}
                                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                                placeholder="Cakes, Pastries, etc."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700">Description</label>
                            <textarea
                                name="description"
                                required
                                value={form.description}
                                onChange={handleChange}
                                rows={3}
                                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 resize-none"
                                placeholder="Delicious chocolate cake with frosting..."
                            />
                        </div>

                        {/* ── Image Upload ──────────────────────────────────── */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Product Image
                                <span className="ml-1 text-xs text-slate-400 font-normal">(optional · max 5 MB)</span>
                            </label>

                            {/* Hidden native file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                                id="product-image-input"
                            />

                            {/* Custom styled trigger */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-1 w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-colors text-sm font-medium"
                            >
                                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {imageFile ? imageFile.name : 'Click to choose an image…'}
                            </button>

                            {/* Preview */}
                            {previewUrl && (
                                <div className="mt-2 rounded-lg overflow-hidden h-32 bg-slate-100 flex items-center justify-center relative group">
                                    <img
                                        src={previewUrl}
                                        alt="Product preview"
                                        className="h-full w-full object-cover"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => { setImageFile(null); setPreviewUrl(''); }}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Remove image"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="product-form"
                        disabled={loading}
                        className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg shadow-sm hover:bg-brand-500 disabled:opacity-50"
                    >
                        {loading ? 'Saving…' : 'Save Product'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProductForm;
