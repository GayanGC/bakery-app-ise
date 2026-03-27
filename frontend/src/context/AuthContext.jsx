// frontend/src/context/AuthContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            const info = localStorage.getItem('userInfo');
            return info ? JSON.parse(info).user : null;
        } catch { return null; }
    });

    const [greeting, setGreeting] = useState('');

    const login = useCallback((data) => {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userInfo', JSON.stringify(data));
        setUser(data.user);
        setGreeting(`Hello ${data.user.name} (${data.user.role})! 🎉`);
        // Clear greeting after 4 seconds
        setTimeout(() => setGreeting(''), 4000);
    }, []);

    const updateUser = useCallback((updatedUserData) => {
        setUser(prevUser => {
            const newUser = { ...prevUser, ...updatedUserData };
            try {
                const info = JSON.parse(localStorage.getItem('userInfo') || '{}');
                info.user = newUser;
                localStorage.setItem('userInfo', JSON.stringify(info));
            } catch (e) { console.error('Failed to update localStorage userInfo', e); }
            return newUser;
        });
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        setUser(null);
        setGreeting('');
    }, []);

    const hasRole = useCallback((...roles) => user && roles.includes(user.role), [user]);

    return (
        <AuthContext.Provider value={{ user, greeting, login, logout, updateUser, hasRole }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
