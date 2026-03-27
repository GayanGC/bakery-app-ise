// frontend/src/pages/ForgotPasswordPage.jsx
// 2-step Password Reset: Step 1 = enter email → OTP sent; Step 2 = enter OTP + new password
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

export default function ForgotPasswordPage() {
    const navigate = useNavigate();
    const [step,        setStep]        = useState(1);   // 1 = email, 2 = OTP + new pass
    const [email,       setEmail]       = useState('');
    const [otp,         setOtp]         = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirm,     setConfirm]     = useState('');
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState('');
    const [success,     setSuccess]     = useState('');

    // ── Step 1: request OTP ─────────────────────────────────
    const handleRequestOtp = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await api.post('/users/forgot-password', { email });
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP.');
        } finally { setLoading(false); }
    };

    // ── Step 2: verify OTP + set new password ───────────────
    const handleReset = async (e) => {
        e.preventDefault();
        if (newPassword !== confirm) { setError('Passwords do not match.'); return; }
        setLoading(true); setError('');
        try {
            await api.post('/users/reset-password', { email, otp, newPassword });
            setSuccess('Password reset! Redirecting to login…');
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password.');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                {/* Card */}
                <div className="bg-white rounded-3xl shadow-md border border-brand-100 overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-brand-400 to-brand-700" />
                    <div className="p-8">
                        {/* Icon + Title */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-brand-500 flex items-center justify-center text-2xl shadow-md">🔑</div>
                            <div>
                                <h2 className="text-2xl font-extrabold text-brand-800"
                                    style={{ fontFamily: '"Playfair Display", serif' }}>
                                    {step === 1 ? 'Forgot Password?' : 'Reset Password'}
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {step === 1
                                        ? 'Enter your email to receive a one-time code.'
                                        : `OTP sent to ${email}. Check your inbox.`}
                                </p>
                            </div>
                        </div>

                        {/* Step dots */}
                        <div className="flex items-center gap-2 mb-6">
                            {[1, 2].map(s => (
                                <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-brand-500' : 'bg-brand-100'}`} />
                            ))}
                        </div>

                        {/* Banners */}
                        {error   && <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">{error}</div>}
                        {success && <div className="mb-4 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl">{success}</div>}

                        {/* ── Step 1 form ── */}
                        {step === 1 && (
                            <form onSubmit={handleRequestOtp} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                                    <input
                                        type="email" required autoFocus
                                        value={email} onChange={e => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                                <button type="submit" disabled={loading}
                                    className="w-full py-3 font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-all">
                                    {loading ? 'Sending OTP…' : 'Send OTP →'}
                                </button>
                            </form>
                        )}

                        {/* ── Step 2 form ── */}
                        {step === 2 && (
                            <form onSubmit={handleReset} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">6-Digit OTP</label>
                                    <input
                                        type="text" inputMode="numeric" maxLength={6} required autoFocus
                                        value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="123456"
                                        className="w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 text-center text-2xl tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                    <input
                                        type="password" required minLength={8}
                                        value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Min 8 chars, letter + number"
                                        className="w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                                    <input
                                        type="password" required
                                        value={confirm} onChange={e => setConfirm(e.target.value)}
                                        placeholder="Repeat new password"
                                        className="w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => { setStep(1); setError(''); }}
                                        className="flex-1 py-3 font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                                        ← Back
                                    </button>
                                    <button type="submit" disabled={loading}
                                        className="flex-1 py-3 font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 disabled:opacity-50 transition-all">
                                        {loading ? 'Resetting…' : '🔒 Reset Password'}
                                    </button>
                                </div>
                            </form>
                        )}

                        <p className="text-center text-sm text-slate-400 mt-6">
                            Remembered it?{' '}
                            <Link to="/login" className="font-semibold text-brand-600 hover:underline">Back to Login</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
