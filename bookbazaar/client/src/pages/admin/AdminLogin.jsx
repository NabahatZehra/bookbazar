import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated && isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate, authLoading, isAuthenticated, isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      const data = res.data;
      const authUser = data?.user;
      const authToken = data?.token;

      if (!authUser || !authToken) {
        toast.error('Invalid login response');
        return;
      }

      if (authUser.role !== 'admin') {
        toast.error('This account does not have admin privileges');
        return;
      }

      login({ token: authToken, user: authUser });
      toast.success('Admin login successful');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin Portal - BookBazaar</title>
        <meta name="description" content="Secure administrative access for BookBazaar" />
      </Helmet>

      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-emerald-900 p-8 text-center border-b-[6px] border-emerald-500">
            <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Admin Portal</h2>
            <p className="text-emerald-100 text-sm font-medium">Restricted Access</p>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none bg-gray-50 text-gray-900"
                  placeholder="Admin email"
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none bg-gray-50 text-gray-900"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-3">Admin access only</p>
                <button
                  type="submit"
                  disabled={submitting || authLoading}
                  className={`w-full bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-lg shadow-emerald-200 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {submitting ? 'Authenticating...' : 'Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminLogin;
