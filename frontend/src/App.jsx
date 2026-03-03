// frontend/src/App.jsx
// AppLayout wraps all authenticated routes with the global Navbar.
// Login and Register pages render without the Navbar.
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductDashboard from './pages/ProductDashboard';
import ShopPage from './pages/ShopPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import AdminDashboard from './pages/AdminDashboard';
import InventoryPage from './pages/InventoryPage';
import PurchaseRequestsPage from './pages/PurchaseRequestsPage';
import FeedbackPage from './pages/FeedbackPage';

// Pages that should NOT show the Navbar
const NO_NAV_PATHS = ['/login', '/register', '/'];

function AppLayout({ children }) {
  const location = useLocation();
  const showNav = !NO_NAV_PATHS.includes(location.pathname);
  return (
    <>
      {showNav && <Navbar />}
      {children}
    </>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-brand-50 text-slate-900 font-sans">
      <AppLayout>
        <Routes>
          {/* ── Public / Auth ─────────────────────────── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ── Product Management (Admin / Manager) ──── */}
          <Route path="/dashboard" element={<ProductDashboard />} />

          {/* ── Customer / Staff / Manager ────────────── */}
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/orders" element={<OrderHistoryPage />} />

          {/* ── Customer Feedback ─────────────────────── */}
          <Route path="/feedback/:orderId" element={<FeedbackPage />} />

          {/* ── Admin / Manager Analytics ─────────────── */}
          <Route path="/admin" element={<AdminDashboard />} />

          {/* ── InventoryManager ──────────────────────── */}
          <Route path="/inventory" element={<InventoryPage />} />

          {/* ── InventorySeller + InventoryManager ─────── */}
          <Route path="/purchases" element={<PurchaseRequestsPage />} />
        </Routes>
      </AppLayout>
    </div>
  );
}

export default App;
