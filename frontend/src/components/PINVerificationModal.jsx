import { useState } from 'react';

export default function PINVerificationModal({ title, subtitle, loading, error, onConfirm, onCancel }) {
    const [pin, setPin] = useState('');
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-fadeInUp">
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-2xl">🔒</div>
                    <div>
                        <h3 className="text-lg font-extrabold text-slate-800"
                            style={{ fontFamily: '"Playfair Display", serif' }}>
                            {title || 'Security Verification'}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {subtitle || 'Enter 4-digit PIN'}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-xs text-red-600 font-bold flex items-center gap-2">
                        <span>⚠</span> {error}
                    </div>
                )}

                <div className="mb-5">
                    <input type="password" inputMode="numeric" maxLength={4} placeholder="••••"
                        className="block w-full px-4 py-3 text-center text-2xl tracking-widest font-bold bg-brand-50 border border-brand-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 transition-all"
                        value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} autoFocus />
                    
                    {/* Visual dot indicator */}
                    <div className="flex justify-center gap-2 mt-3">
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`w-2 h-2 rounded-full transition-all ${pin.length > i ? 'bg-red-500 scale-125' : 'bg-brand-200'}`} />
                        ))}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={onCancel}
                        className="flex-1 py-2.5 font-semibold text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={() => onConfirm(pin)} disabled={loading || pin.length !== 4}
                        className="flex-1 py-2.5 font-semibold text-sm text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors shadow-md">
                        {loading ? 'Verifying…' : 'Verify & Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}
