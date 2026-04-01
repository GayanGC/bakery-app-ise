// frontend/src/pages/ProfilePage.jsx
// View / Edit / Avatar-upload for the currently logged-in user.
// Uses GET + PUT /api/users/profile (multipart/form-data for avatar).
import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ProductImage from '../components/ProductImage';

// ── Role badge colours ────────────────────────────────────
const ROLE_BADGE = {
    Admin:            'bg-rose-100   text-rose-700   border-rose-200',
    Manager:          'bg-amber-100  text-amber-700  border-amber-200',
    'Delivery Partner': 'bg-purple-100 text-purple-700 border-purple-200',
    Customer:         'bg-sky-100    text-sky-700    border-sky-200',
    InventoryManager: 'bg-blue-100   text-blue-700   border-blue-200',
    InventorySeller:  'bg-teal-100   text-teal-700   border-teal-200',
};

// ── Validation helpers ────────────────────────────────────
const validators = {
    name:  (v) => (!v.trim() ? 'Name is required.' : !/^[a-zA-Z\s]+$/.test(v.trim()) ? 'Letters and spaces only.' : ''),
    email: (v) => (!v.trim() ? 'Email is required.' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? 'Enter a valid email address.' : ''),
    phone: (v) => (!v.trim() ? 'Phone is required.' : !/^\d{10}$/.test(v.trim()) ? 'Phone must be exactly 10 digits.' : ''),
};


// ── Field with inline error ───────────────────────────────
function Field({ label, error, children }) {
    return (
        <div className="space-y-1">
            <label className="block text-sm font-semibold text-brand-800">{label}</label>
            {children}
            {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
    );
}

// ── Main ProfilePage ──────────────────────────────────────
export default function ProfilePage() {
    const { user: authUser, updateUser } = useAuth();

    const [profile,   setProfile]   = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [editMode,  setEditMode]  = useState(false);
    const [saving,    setSaving]    = useState(false);
    const [toast,     setToast]     = useState('');
    const [apiError,  setApiError]  = useState('');

    // ── Form state ──────────────────────────────────────
    const [form,   setForm]   = useState({ name: '', email: '', phone: '' });
    const [errors, setErrors] = useState({ name: '', email: '', phone: '' });

    // ── Avatar preview ──────────────────────────────────
    const [avatarFile,    setAvatarFile]    = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    const fileRef = useRef();

    // ── Fetch profile ───────────────────────────────────
    useEffect(() => {
        api.get('/users/profile')
            .then(({ data }) => {
                setProfile(data);
                setForm({ name: data.name, email: data.email, phone: data.phone || '' });
            })
            .catch(() => setApiError('Could not load profile.'))
            .finally(() => setLoading(false));
    }, []);

    // ── Clear toast after 4 s ───────────────────────────
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(''), 4000);
        return () => clearTimeout(t);
    }, [toast]);

    // ── Field change + live validation ──────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
        setErrors(er => ({ ...er, [name]: validators[name]?.(value) || '' }));
    };

    // ── Avatar selection ────────────────────────────────
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) { setApiError('Image must be under 3 MB.'); return; }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    // ── Cancel edit ─────────────────────────────────────
    const handleCancel = () => {
        setEditMode(false);
        setAvatarFile(null);
        setAvatarPreview('');
        setErrors({ name: '', email: '', phone: '' });
        setApiError('');
        setForm({ name: profile.name, email: profile.email, phone: profile.phone || '' });
    };

    // ── Validate all fields before submit ───────────────
    const validate = () => {
        const errs = { name: validators.name(form.name), email: validators.email(form.email), phone: validators.phone(form.phone) };
        setErrors(errs);
        return Object.values(errs).every(e => !e);
    };

    // ── Submit update ───────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        setApiError('');
        try {
            const fd = new FormData();
            fd.append('name',  form.name);
            fd.append('email', form.email);
            fd.append('phone', form.phone);
            if (avatarFile) fd.append('avatar', avatarFile);

            const { data } = await api.put('/users/profile', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setProfile({ ...profile, ...data });
            setForm({ name: data.name, email: data.email, phone: data.phone });
            setEditMode(false);
            setAvatarFile(null);
            setAvatarPreview('');
            setToast('Profile updated successfully! ✅');

            // Refresh AuthContext + LocalStorage so avatar persists on refresh
            if (authUser) {
                updateUser({ 
                    name: data.name, 
                    email: data.email, 
                    avatar: data.avatar 
                });
            }
        } catch (err) {
            setApiError(err.response?.data?.message || 'Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = "w-full px-4 py-3 bg-brand-50 border border-brand-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all text-sm";

    if (loading) return (
        <div className="min-h-screen bg-brand-50 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
    );

    const displayAvatar = avatarPreview || profile?.avatar;

    return (
        <div className="min-h-screen bg-brand-50">
            {/* ── Success Toast ────────────────────────── */}
            {toast && (
                <div className="fixed top-20 right-4 z-50 bg-green-500 text-white px-5 py-3 rounded-xl shadow-xl font-semibold text-sm animate-fadeInUp">
                    {toast}
                </div>
            )}

            <main className="max-w-2xl mx-auto px-4 py-10">

                {/* ── Hero Banner ─────────────────────── */}
                <div className="relative rounded-3xl overflow-hidden mb-6 shadow-md"
                    style={{ background: 'linear-gradient(135deg, #4B2C20 0%, #C8730A 100%)' }}>
                    <div className="absolute inset-0 opacity-10"
                        style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 0%, transparent 60%)' }} />
                    <div className="relative px-8 py-10 flex items-center gap-6">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-brand-600">
                                <ProductImage 
                                    src={displayAvatar} 
                                    alt="User Avatar" 
                                    fallbackText={profile?.name ? profile.name.slice(0,2).toUpperCase() : '?'}
                                    className="w-full h-full object-cover text-3xl text-white flex items-center justify-center font-extrabold"
                                />
                            </div>
                            {editMode && (
                                <>
                                    <button type="button" onClick={() => fileRef.current.click()}
                                        className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center text-brand-600 hover:text-brand-800 transition-all border border-brand-100">
                                        📷
                                    </button>
                                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                                </>
                            )}
                        </div>

                        <div className="min-w-0">
                            <h2 className="text-2xl font-extrabold text-white truncate"
                                style={{ fontFamily: '"Playfair Display", serif' }}>
                                {profile?.name}
                            </h2>
                            <p className="text-sm text-white/70 mt-0.5 truncate">{profile?.email}</p>
                            <span className={`inline-flex items-center mt-2 text-xs font-bold px-3 py-1 rounded-full border ${ROLE_BADGE[profile?.role] || 'bg-slate-100 text-slate-600'}`}>
                                {profile?.role}
                            </span>
                        </div>

                        {/* Edit toggle */}
                        {!editMode && (
                            <button onClick={() => setEditMode(true)}
                                className="ml-auto shrink-0 px-4 py-2 text-sm font-bold text-brand-800 bg-white rounded-xl shadow hover:shadow-md active:scale-95 transition-all">
                                ✏️ Edit Profile
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Card ────────────────────────────── */}
                <div className="bg-white rounded-3xl shadow-md border border-brand-100 overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-brand-400 to-brand-600" />
                    <div className="p-8">

                        {apiError && (
                            <div className="mb-5 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">{apiError}</div>
                        )}

                        {/* ── VIEW MODE ────────────────────────── */}
                        {!editMode && (
                            <div className="space-y-4">
                                {[
                                    { label: 'Full Name',     value: profile?.name,         icon: '👤' },
                                    { label: 'Email Address', value: profile?.email,         icon: '📧' },
                                    { label: 'Phone Number',  value: profile?.phone || '—',  icon: '📱' },
                                    { label: 'Role',          value: profile?.role,          icon: '🎖️' },
                                ].map(({ label, value, icon }) => (
                                    <div key={label} className="flex items-center gap-4 p-4 bg-brand-50 rounded-2xl border border-brand-100">
                                        <span className="text-xl shrink-0">{icon}</span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                                            <p className="text-sm font-bold text-slate-800 truncate mt-0.5">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── EDIT MODE ────────────────────────── */}
                        {editMode && (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Field label="Full Name" error={errors.name}>
                                    <input name="name" value={form.name} onChange={handleChange}
                                        placeholder="Your full name" className={inputCls} />
                                </Field>

                                <Field label="Email Address" error={errors.email}>
                                    <input name="email" type="email" value={form.email} onChange={handleChange}
                                        placeholder="your@email.com" className={inputCls} />
                                </Field>

                                <Field label="Phone Number" error={errors.phone}>
                                    <input name="phone" type="text" inputMode="numeric" pattern="[0-9]*" value={form.phone} onChange={(e) => {
                                        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        handleChange(e);
                                    }}
                                        placeholder="10 digits e.g. 0712345678" maxLength={10} className={inputCls} />
                                    <div className="flex gap-1 mt-1">
                                        {[...Array(10)].map((_, i) => (
                                            <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i < form.phone.replace(/\D/g,'').length ? 'bg-brand-500' : 'bg-brand-100'}`} />
                                        ))}
                                    </div>
                                </Field>

                                {/* Avatar upload area */}
                                {avatarPreview && (
                                    <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl border border-brand-200">
                                        <img src={avatarPreview} alt="preview"
                                            className="w-12 h-12 rounded-xl object-cover border-2 border-brand-200" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-brand-700">New avatar ready to upload</p>
                                            <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(''); }}
                                                className="text-xs text-red-400 hover:text-red-600 mt-0.5">Remove</button>
                                        </div>
                                    </div>
                                )}
                                {!avatarPreview && (
                                    <button type="button" onClick={() => fileRef.current.click()}
                                        className="w-full py-3 border-2 border-dashed border-brand-200 rounded-xl text-sm font-semibold text-brand-500 hover:border-brand-400 hover:bg-brand-50 transition-all flex items-center justify-center gap-2">
                                        📷 Change Profile Photo
                                    </button>
                                )}
                                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

                                {/* Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={handleCancel} disabled={saving}
                                        className="flex-1 py-3 text-sm font-semibold text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-all">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={saving || Object.values(errors).some(Boolean)}
                                        className="flex-1 py-3 text-sm font-bold text-white bg-brand-500 rounded-xl hover:bg-brand-600 active:scale-95 disabled:opacity-50 shadow-md transition-all">
                                        {saving ? 'Saving…' : '✅ Save Changes'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
