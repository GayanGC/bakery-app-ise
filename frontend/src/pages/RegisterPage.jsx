// frontend/src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

export default function RegisterPage() {
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', pin: '', role: 'Customer' });
    const [showPwd, setShowPwd] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (form.pin && !/^\d{4}$/.test(form.pin)) {
            setError('PIN must be exactly 4 digits (numbers only).');
            return;
        }
        setLoading(true);
        try {
            await api.post('/users/register', form);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "block w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all";

    return (
        <div className="flex items-center justify-center min-h-screen bg-brand-50 py-12 px-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-3xl shadow-xl border border-brand-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">

                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-3 shadow-md">
                        <span className="text-2xl">🥐</span>
                    </div>
                    <h2 className="text-3xl font-extrabold text-brand-800"
                        style={{ fontFamily: '"Playfair Display", serif' }}>
                        Create Account
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">Join the Bakery Management system.</p>
                </div>

                {error && (
                    <div className="p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200">{error}</div>
                )}

                <form className="space-y-4" onSubmit={handleRegister}>
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-1">Full Name</label>
                        <input type="text" name="name" required placeholder="John Doe"
                            className={inputCls} value={form.name} onChange={handleChange} />
                    </div>
                    {/* Email */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-1">Email Address</label>
                        <input type="email" name="email" required placeholder="john@example.com"
                            className={inputCls} value={form.email} onChange={handleChange} />
                    </div>
                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-1">Phone</label>
                        <input type="tel" name="phone" placeholder="07X-XXX-XXXX"
                            className={inputCls} value={form.phone} onChange={handleChange} />
                    </div>
                    {/* Role */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-1">Role</label>
                        <select name="role" className={inputCls} value={form.role} onChange={handleChange}>
                            <option value="Customer">Customer</option>
                            <option value="Staff">Staff</option>
                            <option value="Manager">Manager</option>
                            <option value="Admin">Admin</option>
                            <option value="InventoryManager">Inventory Manager</option>
                            <option value="InventorySeller">Inventory Seller</option>
                        </select>
                    </div>
                    {/* Password */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-1">Password</label>
                        <div className="relative">
                            <input type={showPwd ? 'text' : 'password'} name="password" required placeholder="••••••••"
                                className={`${inputCls} pr-12`} value={form.password} onChange={handleChange} />
                            <button type="button" tabIndex={-1}
                                onClick={() => setShowPwd(s => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 text-lg">
                                {showPwd ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>
                    {/* PIN */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-1">
                            4-Digit Security PIN
                            <span className="ml-1 text-xs font-normal text-slate-400">(required for sensitive actions)</span>
                        </label>
                        <div className="relative">
                            <input type={showPin ? 'text' : 'password'} name="pin" required
                                maxLength={4} pattern="\d{4}" placeholder="••••"
                                className={`${inputCls} pr-12 tracking-widest text-center text-xl`}
                                value={form.pin} onChange={handleChange} />
                            <button type="button" tabIndex={-1}
                                onClick={() => setShowPin(s => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 text-lg">
                                {showPin ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Used to confirm deletions and sensitive operations.</p>
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full py-3 px-4 text-sm font-bold text-white bg-brand-500 rounded-xl shadow-md hover:bg-brand-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
                        {loading ? 'Registering…' : 'Create Account'}
                    </button>
                </form>

                <p className="text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link to="/login" className="font-semibold text-brand-500 hover:text-brand-700 transition-colors">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
