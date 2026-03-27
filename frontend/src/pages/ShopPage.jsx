// frontend/src/pages/ShopPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import ProductImage from '../components/ProductImage';


function ShopPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [added, setAdded] = useState({});   // brief "Added!" per product
    const { addToCart } = useCart();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const { data } = await api.get('/products');
                setProducts(data);
            } catch (err) {
                setError('Failed to load products.');
                if (err.response?.status === 401) navigate('/login');
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [navigate]);

    const handleAdd = (product) => {
        addToCart(product, 1);
        setAdded(prev => ({ ...prev, [product._id]: true }));
        setTimeout(() => setAdded(prev => ({ ...prev, [product._id]: false })), 1200);
    };

    return (
        <div className="min-h-screen bg-brand-50 bg-bakery-illustrations">

            {/* ── Page Header ────────────────────────────────────── */}
            <div className="bg-brand-800 text-white px-6 py-8">
                {/* Wavy divider at bottom */}
                <div className="max-w-7xl mx-auto">
                    <h2 className="text-3xl font-extrabold leading-tight"
                        style={{ fontFamily: '"Playfair Display", serif' }}>
                        Fresh Bakes Today
                    </h2>
                    <p className="text-brand-300 text-sm mt-1 font-light">
                        Browse our handcrafted selection — baked fresh every morning
                    </p>
                </div>
            </div>
            {/* Wave transition */}
            <div className="wave-divider -mt-px">
                <svg viewBox="0 0 1440 50" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path d="M0,30 C360,60 1080,0 1440,30 L1440,0 L0,0 Z" fill="#4B2C20" />
                </svg>
            </div>

            {/* ── Main Content ───────────────────────────────────── */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-sm">{error}</div>
                )}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product, idx) => (
                            <div key={product._id}
                                className="glass-card card-hover overflow-hidden flex flex-col"
                                style={{ animationDelay: `${idx * 0.07}s` }}>
                                <div className="h-1.5 bg-gradient-to-r from-brand-400 to-brand-800 rounded-t-3xl" />
                                <div className="p-5 flex-1 flex flex-col">
                                    {/* Product image / fallback */}
                                    <div className="w-full h-28 rounded-2xl overflow-hidden mb-4 bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center">
                                        <ProductImage 
                                            src={product.image} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover" 
                                            fallbackText="🧁" 
                                        />
                                    </div>
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="text-base font-bold text-brand-800 line-clamp-1"
                                            style={{ fontFamily: '"Playfair Display", serif' }}>
                                            {product.name}
                                        </h3>
                                        <span className="ml-2 shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-brand-500 text-white shadow-sm">
                                            Rs. {product.price}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-semibold text-brand-500 uppercase tracking-widest mb-2">
                                        {product.category}
                                    </p>
                                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">
                                        {product.description}
                                    </p>
                                    <div className="flex justify-between items-center bg-brand-50/80 border border-brand-100 rounded-xl px-3 py-2 mb-4">
                                        <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-400">In Stock</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${product.countInStock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {product.countInStock} left
                                        </span>
                                    </div>
                                    <button
                                        disabled={product.countInStock === 0}
                                        onClick={() => handleAdd(product)}
                                        className={`w-full py-2.5 rounded-xl text-sm font-bold btn-glow
                                            ${added[product._id]
                                                ? 'bg-green-500 text-white'
                                                : product.countInStock === 0
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'text-white shadow-md'}`}
                                        style={product.countInStock > 0 && !added[product._id]
                                            ? { background: 'linear-gradient(135deg, #C8730A, #4B2C20)' }
                                            : {}}>
                                        {added[product._id] ? '✓ Added to Cart!' : product.countInStock === 0 ? 'Out of Stock' : '🛒 Add to Cart'}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {products.length === 0 && (
                            <div className="col-span-full py-20 text-center glass-card">
                                <div className="text-6xl mb-4">🧁</div>
                                <p className="text-xl font-bold text-brand-800" style={{ fontFamily: '"Playfair Display", serif' }}>
                                    No products available
                                </p>
                                <p className="mt-1 text-sm text-slate-400">Check back soon for fresh bakes!</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );

}

export default ShopPage;
