import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import ProductForm from '../components/ProductForm';
import { useAuth } from '../context/AuthContext';

function ProductDashboard() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    // Only Admin and Manager may create / edit / delete products
    const canManage = user && ['Admin', 'Manager'].includes(user.role);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/products');
            setProducts(data);
        } catch (err) {
            setError('Failed to fetch products. Check if you are logged in.');
            if (err.response && err.response.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProducts(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this product?')) return;
        try {
            await api.delete(`/products/${id}`);
            fetchProducts();
        } catch {
            alert('Failed to delete product.');
        }
    };

    const openAddForm = () => { setEditingProduct(null); setIsFormOpen(true); };
    const openEditForm = (product) => { setEditingProduct(product); setIsFormOpen(true); };
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-brand-50">



            {/* ── Main Content ───────────────────────────────────── */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                {/* Section Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2
                            className="text-3xl font-extrabold text-brand-800"
                            style={{ fontFamily: '"Playfair Display", serif' }}
                        >
                            Our Products
                        </h2>
                        {/* Role greeting */}
                        {user && (
                            <p className="text-sm text-slate-500 mt-1">
                                Hello <span className="font-semibold text-brand-700">{user.name}</span>!&nbsp;
                                Logged in as: <span className={`font-bold px-2 py-0.5 rounded-full text-xs ${canManage ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600'
                                    }`}>{user.role}</span>
                            </p>
                        )}
                    </div>

                    {/* Add Product — Admin & Manager only */}
                    {canManage && (
                        <button
                            onClick={openAddForm}
                            className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-brand-600 active:scale-95 transition-all duration-200"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Product
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
                        {error}
                    </div>
                )}

                {/* Loading Spinner */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                        {/* Product Cards */}
                        {products.map((product) => (
                            <div
                                key={product._id}
                                className="bg-white rounded-2xl shadow-md border border-brand-100 overflow-hidden flex flex-col transition-all hover:shadow-xl hover:-translate-y-1.5 duration-300"
                            >
                                {/* Card top accent bar */}
                                <div className="h-1.5 bg-gradient-to-r from-brand-400 to-brand-600" />

                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-brand-800 line-clamp-1">
                                            {product.name}
                                        </h3>
                                        <span className="ml-2 shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-brand-500 text-white shadow-sm">
                                            Rs. {product.price}
                                        </span>
                                    </div>
                                    <p className="text-xs font-semibold text-brand-500 uppercase tracking-wider mb-3">
                                        {product.category}
                                    </p>
                                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">
                                        {product.description}
                                    </p>
                                    <div className="text-sm font-medium text-slate-600 bg-brand-50 p-3 rounded-xl flex justify-between items-center border border-brand-100">
                                        <span className="text-xs uppercase tracking-wide font-semibold text-slate-400">Stock</span>
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${product.countInStock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {product.countInStock} available
                                        </span>
                                    </div>
                                </div>

                                {/* Card Actions — Admin & Manager only */}
                                {canManage && (
                                    <div className="bg-brand-50 border-t border-brand-100 px-5 py-3 flex justify-end gap-4">
                                        <button
                                            onClick={() => openEditForm(product)}
                                            className="text-sm font-semibold text-brand-600 hover:text-brand-800 transition-colors"
                                        >
                                            ✏️ Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(product._id)}
                                            className="text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
                                        >
                                            🗑 Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Empty State */}
                        {!loading && products.length === 0 && (
                            <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-brand-200">
                                <div className="text-5xl mb-4">🧁</div>
                                <p className="text-lg font-bold text-brand-800" style={{ fontFamily: '"Playfair Display", serif' }}>
                                    No products yet
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                    Start by adding your first delicious product!
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ── Product Form Modal ─────────────────────────────── */}
            {isFormOpen && (
                <ProductForm
                    product={editingProduct}
                    onClose={() => setIsFormOpen(false)}
                    onSaved={() => { setIsFormOpen(false); fetchProducts(); }}
                />
            )}
        </div>
    );
}

export default ProductDashboard;
