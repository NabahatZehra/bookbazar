import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, PlusCircle } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow p-4 flex justify-between items-center z-50 relative">
      <Link to="/" className="text-2xl font-bold text-blue-600 tracking-tight">BookBazaar</Link>
      <nav className="hidden md:flex gap-6 items-center">
        <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium">Browse</Link>
        <Link to="/cart" className="text-gray-600 hover:text-blue-600 font-medium">Cart</Link>
        
        {user ? (
          <>
            <Link to="/chat" className="text-gray-600 hover:text-blue-600 font-medium">Messages</Link>
            <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 font-medium">Dashboard</Link>
            
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-200">
              <Link to="/add-book" className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition-colors">
                <PlusCircle size={18} />
                Sell a Book
              </Link>
              
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 shrink-0 capitalize">
                  {user.name?.charAt(0) || <User size={16} />}
                </div>
                <span>{user.name}</span>
              </div>
              
              <button onClick={handleLogout} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 font-medium">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
            <Link to="/login" className="text-gray-700 font-bold hover:text-blue-600 transition-colors">Login</Link>
            <Link to="/register" className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-all hover:-translate-y-0.5">Register</Link>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;