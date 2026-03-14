import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Contexts
import { AuthProvider } from './context/AuthContext';
import { SocketContextProvider } from './context/SocketContext';
import { CartProvider } from './context/CartContext';

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
              <header className="bg-white shadow p-4 flex justify-between items-center z-50 relative">
                <a href="/" className="text-2xl font-bold text-blue-600 tracking-tight">BookBazaar</a>
                <nav className="hidden md:flex gap-6">
                  <a href="/" className="text-gray-600 hover:text-blue-600 font-medium">Browse</a>
                  <a href="/add-book" className="text-gray-600 hover:text-blue-600 font-medium">Sell Book</a>
                  <a href="/cart" className="text-gray-600 hover:text-blue-600 font-medium">Cart</a>
                  <a href="/chat" className="text-gray-600 hover:text-blue-600 font-medium">Messages</a>
                  <a href="/dashboard" className="text-gray-600 hover:text-blue-600 font-medium">Dashboard</a>
                </nav>
              </header>

              <main className="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/book/:id" element={<BookDetails />} />
                  <Route path="/add-book" element={<AddBook />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/dashboard" element={<SellerDashboard />} />
                  <Route path="/admin" element={<AdminDashboard />} />
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
