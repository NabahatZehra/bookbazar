import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, LogOut, Menu, PlusCircle, User, X } from 'lucide-react';

const CATEGORY_GROUPS = [
  {
    label: 'School Books',
    items: [
      { label: 'Primary (Grade 1-5)', search: 'primary grade books', category: 'primary' },
      { label: 'Secondary (Grade 6-10)', search: 'secondary grade books', category: 'secondary' },
      { label: 'Higher Secondary (11-12)', search: 'higher secondary books', category: 'higher_secondary' },
      { label: 'O/A Levels', search: 'o level a level books', category: 'higher_secondary' },
    ],
  },
  {
    label: 'University',
    items: [
      { label: 'Computer Science', search: 'computer science books', category: 'university' },
      { label: 'Business & Commerce', search: 'business commerce books', category: 'university' },
      { label: 'Engineering', search: 'engineering books', category: 'university' },
      { label: 'Medical/Biology', search: 'medical biology books', category: 'university' },
    ],
  },
  {
    label: 'Popular Reads',
    items: [
      { label: 'Programming', search: 'programming books' },
      { label: 'Mathematics', search: 'mathematics books' },
      { label: 'Physics', search: 'physics books' },
      { label: 'Exam Prep', search: 'exam prep books' },
    ],
  },
];

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleCategoryClick = (item) => {
    const url = `/books?search=${encodeURIComponent(item.search)}&category=${encodeURIComponent(item.category || '')}&page=1`;
    setIsCategoryOpen(false);
    setIsMobileOpen(false);
    navigate(url);
  };

  return (
    <header className="bg-white shadow z-50 relative">
      <div className="px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-blue-600 tracking-tight">BookBazaar</Link>

        <button
          type="button"
          className="md:hidden p-2 rounded-lg border border-gray-200"
          onClick={() => setIsMobileOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className="hidden md:flex gap-6 items-center">
          <Link to="/" className="text-gray-600 hover:text-blue-600 font-medium">Browse</Link>

          <div
            className="relative"
            onMouseEnter={() => setIsCategoryOpen(true)}
            onMouseLeave={() => setIsCategoryOpen(false)}
          >
            <button
              type="button"
              className="inline-flex items-center gap-1 text-gray-600 hover:text-blue-600 font-medium"
              onClick={() => setIsCategoryOpen((v) => !v)}
            >
              Categories <ChevronDown size={16} />
            </button>
            {isCategoryOpen && (
              <div className="absolute left-0 top-full pt-2">
                <div className="w-[620px] bg-white border border-gray-200 shadow-xl rounded-xl p-4 grid grid-cols-3 gap-4">
                  {CATEGORY_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="font-bold text-gray-900 text-sm mb-2">{group.label}</p>
                      <ul className="space-y-1.5">
                        {group.items.map((item) => (
                          <li key={item.label}>
                            <button
                              type="button"
                              className="text-sm text-gray-600 hover:text-blue-600 text-left"
                              onClick={() => handleCategoryClick(item)}
                            >
                              {item.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link to="/cart" className="text-gray-600 hover:text-blue-600 font-medium">Cart</Link>

          {user ? (
            <>
              <Link to="/messages" className="text-gray-600 hover:text-blue-600 font-medium">Messages</Link>
              <Link to="/profile" className="text-gray-600 hover:text-blue-600 font-medium">Profile</Link>
              <Link to="/dashboard" className="text-gray-600 hover:text-blue-600 font-medium">Sell Dashboard</Link>

              {isAdmin && (
                <Link
                  to="/admin/dashboard"
                  className="ml-2 inline-flex items-center gap-2 font-bold text-indigo-700 hover:text-indigo-900 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100"
                >
                  Admin Dashboard
                </Link>
              )}

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
      </div>

      {isMobileOpen && (
        <div className="md:hidden border-t border-gray-200 px-4 py-3 space-y-2">
          <Link to="/books" className="block text-gray-700 font-medium">Browse</Link>
          <Link to="/books" className="block text-gray-700 font-medium">Categories</Link>
          <Link to="/cart" className="block text-gray-700 font-medium">Cart</Link>
          {user ? (
            <>
              <Link to="/messages" className="block text-gray-700 font-medium">Messages</Link>
              <Link to="/profile" className="block text-gray-700 font-medium">Profile</Link>
              <Link to="/dashboard" className="block text-gray-700 font-medium">Sell Dashboard</Link>
              <Link to="/add-book" className="block text-blue-700 font-semibold">Sell a Book</Link>
              <button type="button" onClick={handleLogout} className="block text-red-600 font-semibold">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block text-gray-700 font-medium">Login</Link>
              <Link to="/register" className="block text-blue-700 font-semibold">Register</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;