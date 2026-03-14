import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { SocketContextProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';

// Components
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import BookDetails from './pages/BookDetails';
import AddBook from './pages/AddBook';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import ChatPage from './pages/ChatPage';
import SellerDashboard from './pages/SellerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';

function App() {
  return (
    <AuthProvider>
      <SocketContextProvider>
        <CartProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
              <Navbar />

              <main className="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/books" element={<Home />} />
                  <Route path="/books/:id" element={<BookDetails />} />
                  <Route path="/book/:id" element={<BookDetails />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Protected Routes */}
                  <Route path="/add-book" element={<ProtectedRoute><AddBook /></ProtectedRoute>} />
                  <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
                  <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                  <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  
                  {/* 404 Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              
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
        </CartProvider>
      </SocketContextProvider>
    </AuthProvider>
  );
}

export default App;
