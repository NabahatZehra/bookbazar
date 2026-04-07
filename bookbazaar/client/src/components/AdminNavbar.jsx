import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminNavbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <header className="bg-slate-900 text-slate-100 shadow z-50 relative">
      <div className="px-4 py-4 flex justify-between items-center">
        <Link to="/admin/dashboard" className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
          <span className="text-white">BookBazaar</span>
          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white">
            ADMIN
          </span>
        </Link>

        <nav className="hidden md:flex gap-6 items-center">
          <Link to="/books" className="text-slate-200 hover:text-white font-semibold">Browse</Link>
          <Link to="/messages" className="text-slate-200 hover:text-white font-semibold">Messages</Link>
          <Link to="/profile" className="text-slate-200 hover:text-white font-semibold">Profile</Link>
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center gap-2 font-black text-white px-3 py-1 rounded-lg bg-slate-800 border border-slate-700"
          >
            Admin Dashboard
          </Link>

          <div className="flex items-center gap-3 ml-4 pl-4 border-l border-slate-700">
            <div className="flex items-center gap-2 text-slate-100 font-semibold">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-700 text-slate-100 shrink-0 capitalize">
                {user?.name?.charAt(0) || <User size={16} />}
              </div>
              <span>{user?.name || 'Admin'}</span>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="text-red-300 hover:text-red-200 p-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 font-semibold"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}

