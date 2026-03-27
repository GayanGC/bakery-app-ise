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
    // If it's a relative path starting with /uploads, prepend the backend URL
    // Otherwise assume it's an absolute URL (like a placeholder or external link)
    const imageUrl = src.startsWith('/uploads') ? `${API_BASE_URL}${src}` : src;

    if (error) {
        return (
            <div className={`bg-brand-100 flex items-center justify-center text-brand-400 font-semibold ${className}`}>
                {fallbackText}
            </div>
        );
    }

    return (
        <img 
            src={imageUrl} 
            alt={alt} 
            className={className}
            onError={() => setError(true)}
            crossOrigin="anonymous" // Helpful if the backend sends CORS headers for images
        />
    );
}
