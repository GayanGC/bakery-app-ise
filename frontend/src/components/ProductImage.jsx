import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ProductImage({ 
    src, 
    alt = "Product Image", 
    className = "", 
    fallbackText = "🥐 Bakery Item" 
}) {
    const [error, setError] = useState(false);

    // If no source provided at all, immediately fail to fallback
    if (!src) {
        return (
            <div className={`bg-brand-100 flex items-center justify-center text-brand-400 font-semibold ${className}`}>
                {fallbackText}
            </div>
        );
    }

    // Process the source URL
    let imageUrl = src;
    if (src.includes('uploads/')) {
        // Ensure '/uploads/...' format
        const cleanPath = src.substring(src.indexOf('uploads/'));
        imageUrl = `${API_BASE_URL}/${cleanPath}`;
    } else if (!src.startsWith('http')) {
        // Fallback for unexpected missing protocols
        imageUrl = `https://${src}`;
    }

    if (error) {
        return (
            <div className={`bg-brand-100 flex flex-col items-center justify-center text-brand-400 font-semibold p-4 text-center ${className}`}>
                <span className="text-4xl mb-2">🧁</span>
                <span className="text-sm">{fallbackText}</span>
            </div>
        );
    }

    return (
        <img 
            src={imageUrl} 
            alt={alt} 
            className={className}
            onError={() => setError(true)}
        />
    );
}
