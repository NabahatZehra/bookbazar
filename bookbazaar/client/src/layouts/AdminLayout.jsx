import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, BookOpen, Users, ShoppingCart, Flag, Settings, LogOut } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const linkBase =
  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors';

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  const navItems = useMemo(
    () => [
      { to: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      { to: '/admin/books', label: 'Books', icon: <BookOpen size={18} />, badge: pendingCount },
      { to: '/admin/users', label: 'Users', icon: <Users size={18} /> },
      { to: '/admin/orders', label: 'Orders', icon: <ShoppingCart size={18} /> },
      { to: '/admin/reports', label: 'Reports', icon: <Flag size={18} /> },
      { to: '/admin/settings', label: 'Settings', icon: <Settings size={18} /> },
    ],
    [pendingCount]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/books?status=pending&limit=1&page=1');
        const total = Number(res?.data?.data?.total || 0);
        setPendingCount(Number.isFinite(total) ? total : 0);
      } catch {
        setPendingCount(0);
      }
    };
    void load();
  }, []);

  const onLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <aside className="w-64 bg-slate-900 text-slate-100 hidden md:flex flex-col">
          <div className="px-4 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="font-extrabold text-lg tracking-tight">BookBazaar</div>
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-red-600 text-white">
                ADMIN
              </span>
            </div>
            <div className="text-xs text-slate-300 mt-1">Admin Panel</div>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `${linkBase} ${
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-200 hover:bg-slate-800/70 hover:text-white'
                  }`
                }
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {!!item.badge && item.badge > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-600 text-white text-[11px] font-black inline-flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto p-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onLogout}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm font-bold"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="font-extrabold text-gray-900">BookBazaar Admin Panel</div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-700 font-semibold">
                {user?.name || 'Admin'}
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </header>

          <main className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

