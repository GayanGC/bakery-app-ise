// frontend/src/components/Navbar.jsx
// Global role-aware navbar — mounted in App.jsx layout wrapper, visible on every authenticated page.
// All 6 roles: Customer, Staff, Manager, Admin, InventoryManager, InventorySeller
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import ProductImage from '../components/ProductImage';
import api from '../api/axios';

// ── Role badge colours ──────────────────────────────────────────
const roleBadge = {
    Customer: 'bg-green-500/20  text-green-300',
    Staff: 'bg-blue-500/20   text-blue-300',
    Manager: 'bg-purple-500/20 text-purple-300',
    Admin: 'bg-red-500/20    text-red-300',
    InventoryManager: 'bg-amber-500/20  text-amber-300',
    InventorySeller: 'bg-orange-500/20 text-orange-300'
};

// ── Nav links per role ──────────────────────────────────────────
// 'isCart' → show cart count badge
// 'alert' → show stock-alert badge (InventoryManager)
const roleLinks = {
    Customer: [
        { to: '/shop', label: '🛒 Shop' },
        { to: '/cart', label: '🧺 Cart', isCart: true },
        { to: '/orders', label: '📦 My Orders' }
    ],
    Staff: [
        { to: '/shop', label: '🛒 Shop' },
        { to: '/cart', label: '🧺 Cart', isCart: true },
        { to: '/orders', label: '📋 Order Management' },
        { to: '/my-deliveries', label: '🛵 My Deliveries' }
    ],
    Manager: [
        { to: '/shop', label: '🛒 Shop' },
        { to: '/cart', label: '🧺 Cart', isCart: true },
        { to: '/orders', label: '📋 Orders' },
        { to: '/admin', label: '📊 Reports' }
    ],
    Admin: [
        { to: '/shop', label: '🛒 Shop' },
        { to: '/cart', label: '🧺 Cart', isCart: true },
        { to: '/dashboard', label: '⚙️ Products' },
        { to: '/orders', label: '📋 Orders' },
        { to: '/admin', label: '📊 Admin Panel' }
    ],
    InventoryManager: [
        { to: '/shop', label: '🛒 Shop' },
        { to: '/cart', label: '🧺 Cart', isCart: true },
        { to: '/inventory', label: '🏭 Inventory', alert: true },
        { to: '/purchases', label: '📋 Stock Requests' }
    ],
    InventorySeller: [
        { to: '/shop', label: '🛒 Shop' },
        { to: '/cart', label: '🧺 Cart', isCart: true },
        { to: '/purchases', label: '📋 Purchase Requests' }
    ]
};

// ── NavItem component (handles active state styling) ────────────
function NavItem({ to, children, className = '' }) {
    return (
        <NavLink
            to={to}
            end
            className={({ isActive }) =>
                `relative text-sm font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap
                 ${isActive
                    ? 'bg-brand-600 text-white shadow-inner'
                    : 'text-brand-200 hover:text-white hover:bg-brand-700'}
                 ${className}`
            }>
            {children}
        </NavLink>
    );
}

// ── Main Navbar ─────────────────────────────────────────────────
export default function Navbar() {
    const { user, logout, greeting } = useAuth();
    const { cartItems } = useCart();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [pendingRequests, setPendingRequests] = useState(0);

    const cartCount = cartItems.reduce((s, i) => s + i.cartQty, 0);
    const links = user ? (roleLinks[user.role] || []) : [];

    // ── Fetch pending stock requests for Inventory roles ─────────
    useState(() => {
        if (user && (user.role === 'InventoryManager' || user.role === 'InventorySeller')) {
            api.get('/purchases').then(({ data }) => {
                const pending = data.filter(r => r.status === 'Pending' || r.status === 'Sent').length;
                setPendingRequests(pending);
            }).catch(() => { });
        }
    }, [user]);

    const handleLogout = () => { logout(); navigate('/login'); setMenuOpen(false); };

    return (
        <>
            {/* ── Login Greeting Banner ─────────────────────────────── */}
            {greeting && (
                <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white text-center text-sm font-semibold py-2 px-4">
                    {greeting}
                </div>
            )}

            {/* ── Main Navigation Bar ───────────────────────────────── */}
            <nav className="bg-brand-800 shadow-xl sticky top-0 z-50 border-b border-brand-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">

                        {/* ── Logo / Brand ─────────────────────────────── */}
                        <Link
                            to={user ? (links[0]?.to || '/shop') : '/login'}
                            className="flex items-center gap-2.5 no-underline shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-xl shadow-md">
                                🥐
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-lg font-extrabold text-brand-100 leading-tight tracking-tight"
                                    style={{ fontFamily: '"Playfair Display", serif' }}>
                                    Sweet Delights
                                </p>
                                {user && (
                                    <p className="text-[10px] text-brand-400 leading-none">
                                        {user.role === 'InventoryManager' ? 'Inventory Mgr' : user.role} Portal
                                    </p>
                                )}
                            </div>
                        </Link>

                        {/* ── Desktop Links ────────────────────────────── */}
                        <div className="hidden md:flex items-center gap-1.5">
                            {links.map(link => (
                                <NavItem key={link.to} to={link.to}>
                                    {link.label}
                                    {/* Cart item count badge */}
                                    {link.isCart && cartCount > 0 && (
                                        <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 flex items-center justify-center bg-brand-400 text-brand-900 text-[9px] font-black rounded-full shadow-lg border border-brand-800">
                                            {cartCount}
                                        </span>
                                    )}
                                    {/* Pending stock requests badge (Inventory roles) */}
                                    {((link.to === '/purchases' || link.alert) && (pendingRequests > 0 || user.unreadNotifications)) && (
                                        <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 flex items-center justify-center bg-rose-500 text-white text-[9px] font-black rounded-full shadow-lg shadow-rose-900/40 border border-rose-400/30 animate-pulse">
                                            {pendingRequests || '!'}
                                        </span>
                                    )}
                                </NavItem>
                            ))}
                        </div>

                        {/* ── Right side: User pill + Logout ───────────── */}
                        <div className="flex items-center gap-2">

                            {/* User name + role tag */}
                            {user && (
                                <Link to="/profile"
                                    className="hidden sm:flex items-center gap-3 pl-3 border-l border-brand-700 hover:opacity-90 transition-opacity">
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-brand-100 leading-none">
                                            {user.name}
                                        </p>
                                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${roleBadge[user.role] || 'bg-slate-500/20 text-slate-300'}`}>
                                            {user.role}
                                        </span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full border-2 border-brand-600 shadow-sm overflow-hidden bg-brand-700">
                                        <ProductImage
                                            src={user.avatar}
                                            alt={user.name}
                                            fallbackText={user.name[0].toUpperCase()}
                                            className="w-full h-full object-cover text-white flex items-center justify-center font-bold text-xs"
                                        />
                                    </div>
                                </Link>
                            )}

                            {/* Logout */}
                            <button
                                onClick={handleLogout}
                                className="text-xs font-bold text-brand-200 hover:text-white border border-brand-600 hover:border-white px-3 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap">
                                🚪 Logout
                            </button>

                            {/* Mobile hamburger */}
                            {links.length > 0 && (
                                <button
                                    onClick={() => setMenuOpen(o => !o)}
                                    className="md:hidden text-brand-200 hover:text-white p-2 rounded-lg border border-brand-700 hover:border-brand-500 transition-all">
                                    {menuOpen ? '✕' : '☰'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Mobile Dropdown Menu ─────────────────────────────── */}
                {menuOpen && (
                    <div className="md:hidden bg-brand-900 border-t border-brand-700 px-4 pb-4 pt-2 space-y-1 animate-slideDown">
                        {/* Mobile user identity */}
                        {user && (
                            <div className="flex items-center gap-3 py-2 mb-2 border-b border-brand-700">
                                <div className="w-10 h-10 rounded-full border-2 border-brand-600 bg-brand-700 flex items-center justify-center overflow-hidden">
                                    <ProductImage
                                        src={user.avatar}
                                        alt={user.name}
                                        fallbackText={user.name[0]?.toUpperCase()}
                                        className="w-full h-full object-cover text-sm font-extrabold text-white flex items-center justify-center"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-brand-100">{user.name}</p>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${roleBadge[user.role] || ''}`}>
                                        {user.role}
                                    </span>
                                </div>
                            </div>
                        )}
                        {links.map(link => (
                            <Link
                                key={link.to}
                                to={link.to}
                                onClick={() => setMenuOpen(false)}
                                className="flex items-center justify-between w-full text-sm font-semibold text-brand-200 hover:text-white hover:bg-brand-700 px-4 py-2.5 rounded-lg transition-all">
                                {link.label}
                                {link.isCart && cartCount > 0 && (
                                    <span className="text-xs font-bold bg-brand-400 text-brand-900 px-1.5 py-0.5 rounded-full">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                        ))}
                        {/* Profile link — always visible in mobile menu */}
                        {user && (
                            <Link to="/profile" onClick={() => setMenuOpen(false)}
                                className="flex items-center w-full text-sm font-semibold text-brand-200 hover:text-white hover:bg-brand-700 px-4 py-2.5 rounded-lg transition-all">
                                👤 My Profile
                            </Link>
                        )}
                    </div>
                )}
            </nav>

            {/* ── Wavy transition below navbar ──────────────────────── */}
            <div className="wave-divider -mt-px pointer-events-none">
                <svg viewBox="0 0 1440 28" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path d="M0,18 C240,30 480,6 720,18 C960,30 1200,8 1440,18 L1440,0 L0,0 Z" fill="#4B2C20" />
                </svg>
            </div>
        </>
    );
}
