// frontend/src/pages/LoginPage.jsx
// Split-screen premium login: left = animated bakery hero, right = login form
// Two-phase: Phase 1 = Email + Password, Phase 2 = 4-digit PIN (Manager/InventoryManager)
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

// ── Inline SVG eye icons (chocolate brown theme) ─────────────
const EyeOpen = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);
const EyeClosed = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
);

// ── Bakery hero SVG illustration ─────────────────────────────
function BakeryHero() {
    return (
        <div className="relative w-full h-full min-h-[500px] flex flex-col items-center justify-center p-10 overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #4B2C20 0%, #7C4006 40%, #C8730A 100%)' }}>

            {/* Ghost illustration circles */}
            <div className="absolute top-10 right-10 w-40 h-40 rounded-full bg-white/5 border border-white/10" />
            <div className="absolute bottom-16 left-6 w-24 h-24 rounded-full bg-white/5 border border-white/10" />
            <div className="absolute top-1/2 left-2 w-16 h-16 rounded-full bg-white/5" />

            {/* Inline SVG – bakery illustration */}
            <svg viewBox="0 0 320 280" className="w-full max-w-xs drop-shadow-2xl" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Bread loaf body */}
                <ellipse cx="160" cy="180" rx="110" ry="55" fill="#FCD9A1" stroke="#C8730A" strokeWidth="3" />
                <ellipse cx="160" cy="160" rx="100" ry="50" fill="#F5BC67" />
                <ellipse cx="160" cy="148" rx="88" ry="38" fill="#FAD9A1" stroke="#C8730A" strokeWidth="2" />
                {/* Score marks on bread */}
                <path d="M120 145 Q140 130 160 145 Q180 130 200 145" stroke="#C8730A" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M130 158 Q150 143 170 158 Q190 143 205 158" stroke="#C8730A" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                {/* Steam wisps */}
                <path d="M130 118 Q125 108 132 100 Q139 92 133 82" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
                <path d="M160 110 Q155 100 162 92 Q169 84 163 74" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5" />
                <path d="M190 118 Q185 108 192 100 Q199 92 193 82" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.4" />
                {/* Wheat stalks */}
                <line x1="40" y1="220" x2="40" y2="160" stroke="#FAD9A1" strokeWidth="2" opacity="0.6" />
                <ellipse cx="40" cy="155" rx="7" ry="14" fill="#FAD9A1" opacity="0.55" transform="rotate(-10 40 155)" />
                <ellipse cx="33" cy="165" rx="6" ry="12" fill="#FAD9A1" opacity="0.5" transform="rotate(-35 33 165)" />
                <ellipse cx="47" cy="163" rx="6" ry="12" fill="#FAD9A1" opacity="0.5" transform="rotate(20 47 163)" />
                <line x1="280" y1="215" x2="280" y2="155" stroke="#FAD9A1" strokeWidth="2" opacity="0.6" />
                <ellipse cx="280" cy="150" rx="7" ry="14" fill="#FAD9A1" opacity="0.55" transform="rotate(10 280 150)" />
                <ellipse cx="273" cy="160" rx="6" ry="12" fill="#FAD9A1" opacity="0.5" transform="rotate(-20 273 160)" />
                <ellipse cx="287" cy="158" rx="6" ry="12" fill="#FAD9A1" opacity="0.5" transform="rotate(35 287 158)" />
                {/* Small croissant */}
                <path d="M 60 70 Q 70 52 88 56 Q 106 60 102 78 Q 94 96 76 90 Q 56 82 60 70 Z" fill="#FCD9A1" stroke="#C8730A" strokeWidth="1.5" opacity="0.85" />
                <path d="M 63 72 Q 82 66 100 78" stroke="#C8730A" strokeWidth="1" fill="none" opacity="0.6" />
                {/* Rolling pin */}
                <rect x="200" y="48" width="80" height="16" rx="8" fill="#FAD9A1" stroke="#C8730A" strokeWidth="1.5" transform="rotate(-25 200 48)" opacity="0.9" />
                <rect x="193" y="46" width="13" height="20" rx="4" fill="#C8730A" transform="rotate(-25 193 46)" opacity="0.9" />
                <rect x="268" y="22" width="13" height="20" rx="4" fill="#C8730A" transform="rotate(-25 268 22)" opacity="0.9" />
            </svg>

            {/* Tagline */}
            <div className="mt-8 text-center z-10">
                <h2 className="text-3xl font-bold text-white leading-tight"
                    style={{ fontFamily: '"Playfair Display", serif' }}>
                    Fresh. Warm.<br />Every Morning.
                </h2>
                <p className="mt-3 text-sm text-white/70 font-light tracking-wide">
                    Bakery Management System
                </p>
                {/* Decorative dots */}
                <div className="flex justify-center gap-2 mt-5">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    ))}
                </div>
            </div>

            {/* Floating badge */}
            <div className="absolute top-8 left-8 bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-2">
                <p className="text-xs text-white/80 font-semibold">🥐 6 Roles · MERN Stack</p>
            </div>
        </div>
    );
}

// ── Input field wrapper ───────────────────────────────────────
function FormField({ label, children }) {
    return (
        <div className="space-y-1.5 animate-fadeInUp">
            <label className="block text-sm font-semibold text-brand-800">{label}</label>
            {children}
        </div>
    );
}

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [pin, setPin] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [phase, setPhase] = useState(1);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    const getHome = (role) => {
        const map = { Admin: '/admin', Manager: '/admin', Staff: '/orders', Customer: '/shop', InventoryManager: '/inventory', InventorySeller: '/purchases' };
        return map[role] || '/shop';
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const payload = { email, password };
            if (phase === 2) payload.pin = pin;
            const { data } = await api.post('/users/login', payload);
            login(data);
            navigate(getHome(data.user.role));
        } catch (err) {
            const body = err.response?.data;
            if (body?.requiresPin) { setPhase(2); setError(body.message); }
            else setError(body?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetToPhase1 = () => { setPhase(1); setPin(''); setError(''); };

    const inputCls = "block w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all duration-200 text-sm";

    return (
        <div className="flex min-h-screen bg-bakery-illustrations">

            {/* ── Left Hero Panel ─────────────────────────────────── */}
            <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-shrink-0">
                <BakeryHero />
            </div>

            {/* ── Right Form Panel ───────────────────────────────── */}
            <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12">
                <div className="w-full max-w-md animate-fadeInUp">

                    {/* Mobile brand header (hidden on desktop — hero is there) */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-800 mb-3 shadow-lg">
                            <span className="text-3xl">{phase === 1 ? '🥐' : '🔒'}</span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-brand-800" style={{ fontFamily: '"Playfair Display", serif' }}>
                            Bakery Management
                        </h1>
                    </div>

                    {/* Card */}
                    <div className="glass-card p-8 space-y-6 card-hover">

                        {/* Progress bar */}
                        <div className="h-1 rounded-full bg-brand-100 -mx-8 -mt-8 mb-6 overflow-hidden">
                            <div className="h-1 bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-700"
                                style={{ width: phase === 1 ? '50%' : '100%' }} />
                        </div>

                        {/* Heading */}
                        <div>
                            <div className="hidden lg:flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-brand-800 flex items-center justify-center text-2xl shadow-md">
                                    {phase === 1 ? '🥐' : '🔒'}
                                </div>
                                <div>
                                    <h1 className="text-2xl font-extrabold text-brand-800 leading-tight"
                                        style={{ fontFamily: '"Playfair Display", serif' }}>
                                        {phase === 1 ? 'Welcome Back' : 'Security PIN'}
                                    </h1>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {phase === 1 ? 'Sign in to manage your bakery.' : 'Enter the PIN assigned by Admin.'}
                                    </p>
                                </div>
                            </div>
                            <div className="lg:hidden mb-4">
                                <h2 className="text-xl font-extrabold text-brand-800" style={{ fontFamily: '"Playfair Display", serif' }}>
                                    {phase === 1 ? 'Welcome Back' : 'Security PIN'}
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {phase === 1 ? 'Sign in to manage your bakery.' : 'Enter the PIN assigned by Admin.'}
                                </p>
                            </div>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className={`p-3 text-sm rounded-xl border animate-fadeInUp ${phase === 2 && error.toLowerCase().includes('wrong')
                                    ? 'text-red-700 bg-red-50 border-red-200'
                                    : 'text-amber-700 bg-amber-50 border-amber-200'
                                }`}>
                                {error}
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleLogin}>

                            {/* Phase 1 — Email + Password */}
                            {phase === 1 && (
                                <>
                                    <FormField label="Email Address">
                                        <input type="email" required autoFocus
                                            className={inputCls}
                                            placeholder="baker@example.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)} />
                                    </FormField>

                                    <FormField label="Password">
                                        <div className="relative">
                                            <input type={showPwd ? 'text' : 'password'} required
                                                className={`${inputCls} pr-12`}
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)} />
                                            <button type="button" tabIndex={-1}
                                                onClick={() => setShowPwd(s => !s)}
                                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-600 hover:text-brand-800 transition-colors">
                                                {showPwd ? <EyeClosed /> : <EyeOpen />}
                                            </button>
                                        </div>
                                    </FormField>
                                </>
                            )}

                            {/* Phase 2 — PIN Entry */}
                            {phase === 2 && (
                                <FormField label="4-Digit Security PIN">
                                    <div className="relative">
                                        <input
                                            type={showPin ? 'text' : 'password'}
                                            inputMode="numeric" maxLength={4}
                                            required autoFocus pattern="\d{4}"
                                            placeholder="••••"
                                            className="block w-full px-4 py-4 pr-12 bg-brand-50 border-2 border-brand-300 rounded-xl text-slate-900 text-center text-3xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                                            value={pin}
                                            onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
                                        <button type="button" tabIndex={-1}
                                            onClick={() => setShowPin(s => !s)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-600 hover:text-brand-800 transition-colors">
                                            {showPin ? <EyeClosed /> : <EyeOpen />}
                                        </button>
                                    </div>
                                    {/* PIN dot indicators */}
                                    <div className="flex justify-center gap-3 mt-3">
                                        {[0, 1, 2, 3].map(i => (
                                            <div key={i} className={`w-3 h-3 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-brand-500 scale-110 shadow-sm' : 'bg-brand-200'}`} />
                                        ))}
                                    </div>
                                </FormField>
                            )}

                            {/* Submit / Back */}
                            <div className="flex gap-3 pt-1">
                                {phase === 2 && (
                                    <button type="button" onClick={resetToPhase1}
                                        className="flex-none px-4 py-3 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                                        ← Back
                                    </button>
                                )}
                                <button type="submit"
                                    disabled={loading || (phase === 2 && pin.length !== 4)}
                                    className="flex-1 py-3 px-4 text-sm font-bold text-white rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed btn-glow"
                                    style={{ background: 'linear-gradient(135deg, #C8730A 0%, #4B2C20 100%)' }}>
                                    {loading
                                        ? (phase === 1 ? 'Checking…' : 'Verifying PIN…')
                                        : (phase === 1 ? 'Continue →' : '🔓 Sign In')}
                                </button>
                            </div>
                        </form>

                        <p className="text-center text-sm text-slate-500 pt-1">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-800 transition-colors">
                                Register here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
