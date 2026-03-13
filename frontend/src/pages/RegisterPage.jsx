// frontend/src/pages/RegisterPage.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

// ── Validation rules ────────────────────────────────────────
const VALID_ROLES = ['Customer', 'Staff', 'Manager', 'Admin', 'InventoryManager', 'InventorySeller'];
const PIN_REQUIRED_ROLES = ['Admin', 'Manager'];

const validators = {
    name: (v) => {
        if (!v.trim()) return 'Full name is required';
        if (!/^[a-zA-Z\s]+$/.test(v.trim())) return 'Name can only contain letters and spaces';
        return '';
    },
    email: (v) => {
        if (!v.trim()) return 'Email address is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'Enter a valid email address';
        return '';
    },
    phone: (v) => {
        if (!v.trim()) return 'Phone number is required';
        if (!/^\d{10}$/.test(v.trim())) return 'Phone must be exactly 10 digits (numbers only)';
        return '';
    },
    role: (v) => {
        if (!VALID_ROLES.includes(v)) return 'Please select a valid role';
        return '';
    },
    password: (v) => {
        if (!v) return 'Password is required';
        if (v.length < 8) return 'Password must be at least 8 characters';
        if (!/[a-zA-Z]/.test(v)) return 'Password must include at least one letter';
        if (!/[0-9]/.test(v)) return 'Password must include at least one number';
        return '';
    },
    pin: (v, role) => {
        const required = PIN_REQUIRED_ROLES.includes(role);
        if (required && !v) return 'PIN is required for Admin and Manager roles';
        if (v && !/^\d{4}$/.test(v)) return 'PIN must be exactly 4 digits';
        return '';
    },
};

export default function RegisterPage() {
    const [form, setForm] = useState({
        name: '', email: '', phone: '', password: '', pin: '', role: 'Customer'
    });
    const [fieldErrors, setFieldErrors] = useState({
        name: '', email: '', phone: '', role: '', password: '', pin: ''
    });
    const [touched, setTouched] = useState({});
    const [showPwd, setShowPwd] = useState(false);
    const [showPin, setShowPin] = useState(false);
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // ── Validate a single field ──────────────────────────────
    const validateField = (name, value, currentForm = form) => {
        if (name === 'pin') return validators.pin(value, currentForm.role);
        return validators[name] ? validators[name](value) : '';
    };

    // ── Handle input changes ─────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;

        // PIN: silently strip non-digits, cap at 4
        if (name === 'pin') {
            const digits = value.replace(/\D/g, '').slice(0, 4);
            const newForm = { ...form, pin: digits };
            setForm(newForm);
            if (touched.pin) {
                setFieldErrors(prev => ({ ...prev, pin: validateField('pin', digits, newForm) }));
            }
            return;
        }

        // Phone: strip non-digits, cap at 10
        if (name === 'phone') {
            const digits = value.replace(/\D/g, '').slice(0, 10);
            const newForm = { ...form, phone: digits };
            setForm(newForm);
            if (touched.phone) {
                setFieldErrors(prev => ({ ...prev, phone: validateField('phone', digits) }));
            }
            return;
        }

        const newForm = { ...form, [name]: value };
        setForm(newForm);

        // Re-validate PIN when role changes (PIN requirement may change)
        if (name === 'role') {
            setFieldErrors(prev => ({
                ...prev,
                role: validateField('role', value),
                pin: touched.pin ? validators.pin(newForm.pin, value) : prev.pin,
            }));
            return;
        }

        if (touched[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value, newForm) }));
        }
    };

    // ── Mark field as touched on blur and validate ───────────
    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        setFieldErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
    };

    // ── Submit ────────────────────────────────────────────────
    const handleRegister = async (e) => {
        e.preventDefault();
        setServerError('');

        // Validate all fields and mark all as touched
        const allTouched = Object.keys(form).reduce((acc, k) => ({ ...acc, [k]: true }), {});
        setTouched(allTouched);

        const errors = {
            name:     validators.name(form.name),
            email:    validators.email(form.email),
            phone:    validators.phone(form.phone),
            role:     validators.role(form.role),
            password: validators.password(form.password),
            pin:      validators.pin(form.pin, form.role),
        };
        setFieldErrors(errors);

        const hasErrors = Object.values(errors).some(Boolean);
        if (hasErrors) return;

        setLoading(true);
        try {
            await api.post('/users/register', form);
            navigate('/login');
        } catch (err) {
            setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Styles ────────────────────────────────────────────────
    const inputCls = (field) =>
        `block w-full px-4 py-3 bg-brand-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
            fieldErrors[field]
                ? 'border-red-400 focus:ring-red-400 bg-red-50'
                : 'border-brand-200 focus:ring-brand-500'
        }`;

    const FieldError = ({ field }) =>
        fieldErrors[field] ? (
            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                <span>⚠</span> {fieldErrors[field]}
            </p>
        ) : null;

    const pinRequired = PIN_REQUIRED_ROLES.includes(form.role);

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

                {/* Server-level error banner */}
                {serverError && (
                    <div className="p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-200 flex items-center gap-2">
                        <span>❌</span> {serverError}
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleRegister} noValidate>

                    {/* ── Full Name ── */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-1">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <input type="text" name="name" placeholder="John Doe"
                            className={inputCls('name')} value={form.name}
                            onChange={handleChange} onBlur={handleBlur} />
                        <FieldError field="name" />
                    </div>

                    {/* ── Email ── */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-1">
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <input type="email" name="email" placeholder="john@example.com"
                            className={inputCls('email')} value={form.email}
                            onChange={handleChange} onBlur={handleBlur} />
                        <FieldError field="email" />
                    </div>

                    {/* ── Phone ── */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-1">
                            Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input type="tel" name="phone" placeholder="0712345678"
                            maxLength={10}
                            className={inputCls('phone')} value={form.phone}
                            onChange={handleChange} onBlur={handleBlur} />
                        <FieldError field="phone" />
                    </div>

                    {/* ── Role ── */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-1">
                            Role <span className="text-red-500">*</span>
                        </label>
                        <select name="role" className={inputCls('role')} value={form.role}
                            onChange={handleChange} onBlur={handleBlur}>
                            <option value="Customer">Customer</option>
                            <option value="Staff">Staff</option>
                            <option value="Manager">Manager</option>
                            <option value="Admin">Admin</option>
                            <option value="InventoryManager">Inventory Manager</option>
                            <option value="InventorySeller">Inventory Seller</option>
                        </select>
                        <FieldError field="role" />
                    </div>

                    {/* ── Password ── */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-1">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input type={showPwd ? 'text' : 'password'} name="password"
                                placeholder="Min. 8 chars with a letter and number"
                                className={`${inputCls('password')} pr-12`} value={form.password}
                                onChange={handleChange} onBlur={handleBlur} />
                            <button type="button" tabIndex={-1}
                                onClick={() => setShowPwd(s => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 text-lg">
                                {showPwd ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <FieldError field="password" />
                    </div>

                    {/* ── Security PIN ── */}
                    <div>
                        <label className="block text-sm font-semibold text-brand-800 mb-1">
                            4-Digit Security PIN
                            {pinRequired
                                ? <span className="ml-1 text-xs font-bold text-red-500">(required for {form.role})</span>
                                : <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
                            }
                        </label>
                        <div className="relative">
                            <input type={showPin ? 'text' : 'password'} name="pin"
                                maxLength={4} placeholder="••••"
                                className={`${inputCls('pin')} pr-12 tracking-widest text-center text-xl`}
                                value={form.pin} onChange={handleChange} onBlur={handleBlur} />
                            <button type="button" tabIndex={-1}
                                onClick={() => setShowPin(s => !s)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 text-lg">
                                {showPin ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <FieldError field="pin" />
                        {!fieldErrors.pin && (
                            <p className="text-xs text-slate-400 mt-1">Used to confirm deletions and sensitive operations.</p>
                        )}
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
