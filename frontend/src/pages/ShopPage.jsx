// frontend/src/pages/ShopPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import ProductImage from '../components/ProductImage';


function ShopPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState('All');
    const [added, setAdded] = useState({});   // brief "Added!" per product
    const { addToCart } = useCart();
    const navigate = useNavigate();

    const fetchProducts = async (searchVal = '', catVal = 'All') => {
        try {
            setSearchLoading(true);
            const params = {};
            if (searchVal) params.search = searchVal;
            if (catVal !== 'All') params.category = catVal;
            
            const { data } = await api.get('/products', { params });
            setProducts(data);
        } catch (err) {
            setError('Failed to load products.');
            if (err.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
            setSearchLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchProducts();
    }, [navigate]);

    // ── 300ms Debounce for Search ───────────────────────────
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchProducts(searchTerm, category);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, category]);

    const handleAdd = (product) => {
        addToCart(product, 1);
        setAdded(prev => ({ ...prev, [product._id]: true }));
        setTimeout(() => setAdded(prev => ({ ...prev, [product._id]: false })), 1200);
    };

    const categories = ['All', 'Bread', 'Cakes', 'Pastries', 'Savory', 'Sweets'];

    return (
        <div className="min-h-screen bg-brand-50 bg-bakery-illustrations">

            {/* ── Page Header & Search ───────────────────────────── */}
            <div className="bg-brand-800 text-white px-6 pt-12 pb-20 relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                        <div>
                            <h2 className="text-4xl font-extrabold leading-tight"
                                style={{ fontFamily: '"Playfair Display", serif' }}>
                                Fresh Bakes Today
                            </h2>
                            <p className="text-brand-300 text-base mt-2 font-light max-w-lg">
                                Browse our handcrafted selection — baked fresh every morning with premium ingredients and love.
                            </p>
                        </div>

                        {/* ── Glassmorphism Search Bar ── */}
                        <div className="relative w-full md:w-96 group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                {searchLoading ? (
                                    <div className="w-4 h-4 border-2 border-brand-300 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <span className="text-brand-300 group-focus-within:text-white transition-colors">🔍</span>
                                )}
                            </div>
                            <input
                                type="text"
                                placeholder="Search pastries, cakes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/10 backdrop-blur-lg border border-white/20 text-white placeholder-brand-300/60 rounded-2xl py-3.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-all shadow-xl"
                            />
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex gap-2 mt-8 overflow-x-auto pb-2 no-scrollbar">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap
                                    ${category === cat 
                                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-900/40' 
                                        : 'bg-white/10 backdrop-blur-sm text-brand-200 hover:bg-white/20'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Wave transition */}
            <div className="wave-divider -mt-px relative z-0">
                <svg viewBox="0 0 1440 80" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path d="M0,40 C360,90 1080,0 1440,50 L1440,0 L0,0 Z" fill="#4B2C20" />
                </svg>
            </div>

            {/* ── Main Content ───────────────────────────────────── */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

                {error && (
                    <div className="mb-8 p-5 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 text-sm flex items-center gap-3">
                        <span className="text-xl">⚠️</span> {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-16 h-16 border-4 border-brand-100 border-t-brand-500 rounded-full animate-spin mb-4" />
                        <p className="text-brand-800 font-medium animate-pulse">Gathering fresh bakes...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {products.map((product, idx) => (
                            <div key={product._id}
                                className="glass-card card-hover overflow-hidden flex flex-col group relative"
                                style={{ animationDelay: `${idx * 0.05}s` }}>
                                
                                {/* Neon Sale Badge */}
                                {product.onSale && (
                                    <div className="absolute top-4 right-4 z-20">
                                        <div className="bg-pink-600/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(219,39,119,0.5)] border border-pink-400/30">
                                            🔥 SALE
                                        </div>
                                    </div>
                                )}

                                <div className="h-1.5 bg-gradient-to-r from-brand-400 to-brand-800 rounded-t-3xl" />
                                
                                <div className="p-5 flex-1 flex flex-col">
                                    {/* Product image container */}
                                    <div className="w-full h-44 rounded-2xl overflow-hidden mb-5 bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center relative shadow-inner">
                                        <ProductImage 
                                            src={product.image} 
                                            alt={product.name} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                            fallbackText="🧁" 
                                        />
                                        {!product.countInStock && (
                                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                                                <span className="bg-white/90 text-slate-800 px-4 py-1 rounded-lg text-sm font-black transform -rotate-12">OUT OF STOCK</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-bold text-brand-800 line-clamp-1 flex-1 pr-2"
                                            style={{ fontFamily: '"Playfair Display", serif' }}>
                                            {product.name}
                                        </h3>
                                        <p className="text-[10px] font-bold text-brand-600/60 uppercase tracking-widest mt-1">
                                            {product.category}
                                        </p>
                                    </div>

                                    <div className="mb-4">
                                        {product.onSale ? (
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl font-black text-rose-600">
                                                    Rs. {product.discountPrice}
                                                </span>
                                                <span className="text-sm text-slate-400 line-through font-medium">
                                                    Rs. {product.price}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-2xl font-black text-brand-900">
                                                Rs. {product.price}
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs text-slate-500 line-clamp-2 mb-6 flex-1 italic leading-relaxed">
                                        "{product.description}"
                                    </p>

                                    <div className="flex justify-between items-center bg-brand-50/50 border border-brand-100/50 rounded-2xl px-4 py-3 mb-5">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Availability</span>
                                            <span className={`text-xs font-black ${product.countInStock > 5 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {product.countInStock > 0 ? `${product.countInStock} Available` : 'Wait until morning'}
                                            </span>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-brand-100">
                                            🥐
                                        </div>
                                    </div>

                                    <button
                                        disabled={product.countInStock === 0}
                                        onClick={() => handleAdd(product)}
                                        className={`w-full py-3.5 rounded-2xl text-sm font-black transition-all duration-300 transform active:scale-95 shadow-lg
                                            ${added[product._id]
                                                ? 'bg-emerald-500 text-white shadow-emerald-200'
                                                : product.countInStock === 0
                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                                    : 'text-white hover:-translate-y-1 hover:shadow-brand-200 group-hover:shadow-[0_10px_20px_rgba(75,44,32,0.15)]'}`}
                                        style={product.countInStock > 0 && !added[product._id]
                                            ? { background: 'linear-gradient(135deg, #C8730A, #4B2C20)' }
                                            : {}}>
                                        {added[product._id] 
                                            ? '✓ ADDED TO CART' 
                                            : product.countInStock === 0 
                                                ? 'SOLD OUT' 
                                                : '🛒 ADD TO CART'}
                                    </button>
                                </div>
                            </div>
                        ))}

                        {!searchLoading && products.length === 0 && (
                            <div className="col-span-full py-32 text-center">
                                <div className="text-8xl mb-6 opacity-40">🥯</div>
                                <h3 className="text-2xl font-bold text-brand-800" style={{ fontFamily: '"Playfair Display", serif' }}>
                                    No bakes matched your search
                                </h3>
                                <p className="mt-2 text-slate-400 max-w-sm mx-auto">
                                    Try searching for something else or browse another category.
                                </p>
                                <button 
                                    onClick={() => {setSearchTerm(''); setCategory('All');}}
                                    className="mt-8 text-brand-600 font-bold border-b-2 border-brand-200 hover:border-brand-600 transition-all text-sm uppercase tracking-widest"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );

}

export default ShopPage;
