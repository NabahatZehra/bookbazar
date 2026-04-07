import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { SocketContextProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';

// Components
import UserNavbar from './components/UserNavbar';
import AdminNavbar from './components/AdminNavbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminRoute from './components/common/AdminRoute';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import EducationProfileModal from './components/onboarding/EducationProfileModal';
import AdminLayout from './layouts/AdminLayout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import BookDetails from './pages/BookDetails';
import AddBook from './pages/AddBook';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import ChatPage from './pages/ChatPage';
import MessagesPage from './pages/MessagesPage';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminLogin from './pages/admin/AdminLogin';
import ManageBooks from './pages/admin/ManageBooks';
import ManageUsers from './pages/admin/ManageUsers';
import ManageOrders from './pages/admin/ManageOrders';
import Reports from './pages/admin/Reports';
import AdminSettings from './pages/admin/AdminSettings.jsx';
import UserProfile from './pages/user/UserProfile';
import Wishlist from './pages/user/Wishlist';
import OrderHistory from './pages/user/OrderHistory';
import OrderTracking from './pages/user/OrderTracking';
import OrderConfirmation from './pages/OrderConfirmation';
import NotFound from './pages/NotFound';
import api from './services/api';
import { useAuth } from './context/AuthContext';

function MainLayout({ isAdmin, showEducationModal, setShowEducationModal }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans overflow-x-hidden">
      {isAdmin ? <AdminNavbar /> : <UserNavbar />}
      <main className="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      <ChatbotWidget />
      {!isAdmin && (
        <EducationProfileModal
          isOpen={showEducationModal}
          onSaved={() => setShowEducationModal(false)}
        />
      )}

      <footer className="bg-gray-900 border-t border-gray-800 text-gray-300 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm">
          <p>&copy; {new Date().getFullYear()} BookBazaar. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Help</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isAdmin } = useAuth();
  const [showEducationModal, setShowEducationModal] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated || isAdmin) return setShowEducationModal(false);
      try {
        const res = await api.get('/users/profile');
        const complete = Boolean(res?.data?.data?.user?.educationProfile?.isProfileComplete);
        setShowEducationModal(!complete);
      } catch {
        setShowEducationModal(false);
      }
    };
    void load();
  }, [isAuthenticated, isAdmin]);

  return (
    <Router>
      <Routes>
        <Route element={<MainLayout isAdmin={isAdmin} showEducationModal={showEducationModal} setShowEducationModal={setShowEducationModal} />}>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/books" element={<Home />} />
          <Route path="/books/:id" element={<BookDetails />} />
          <Route path="/book/:id" element={<BookDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected Routes */}
          <Route path="/add-book" element={<ProtectedRoute><AddBook /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/messages/:conversationId" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/chat/:userId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderTracking /></ProtectedRoute>} />
          <Route path="/order-confirmation/:id" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
          <Route path="/order/success/:id" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/books" element={<ManageBooks />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/orders" element={<ManageOrders />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Routes>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <SocketContextProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </SocketContextProvider>
    </AuthProvider>
  );
}

export default App;
