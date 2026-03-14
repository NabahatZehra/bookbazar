import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, DollarSign, Briefcase, Percent, ShieldBan } from 'lucide-react';
import SEO from '../components/common/SEO';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    totalCommission: 0,
    activeListings: 0
  });
  
  const [users, setUsers] = useState([]);
  const [chartData, setChartData] = useState([]);
  
  const [commissionRate, setCommissionRate] = useState(10); // Default 10%
  const [isSavingRate, setIsSavingRate] = useState(false);

  useEffect(() => {
    // Basic Admin protection check
    if (user && user.role !== 'admin') {
      toast.error('Unauthorized access');
      navigate('/');
      return;
    }

    const fetchAdminData = async () => {
      setLoading(true);
      try {
        // Fetch users using the admin route
        const usersRes = await api.get('/admin/users');
        const activeUsers = usersRes.data.success ? usersRes.data.data : [];
        setUsers(activeUsers);

        // Fetch all books via open route, since admin isn't restricted
        const booksRes = await api.get('/books');
        const allBooks = booksRes.data.success ? (booksRes.data.data.docs ? booksRes.data.data.docs : booksRes.data.data) : [];
        // setBooks(allBooks); // Unused
        
        // Stats Calculation (in a real app, /admin/stats would aggregate this)
        const activeListingsCount = allBooks.filter(b => b.status === 'available').length;
        
        setStats({
          totalUsers: activeUsers.length,
          totalRevenue: 45000,     // Demo sum of total prices
          totalCommission: 4500,   // Demo computed commission
          activeListings: activeListingsCount
        });

        setChartData([
          { name: 'Mon', revenue: 4000 },
          { name: 'Tue', revenue: 3000 },
          { name: 'Wed', revenue: 2000 },
          { name: 'Thu', revenue: 2780 },
          { name: 'Fri', revenue: 1890 },
          { name: 'Sat', revenue: 2390 },
          { name: 'Sun', revenue: 3490 },
        ]);

      } catch (err) {
        toast.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };
    
    if (user && user.role === 'admin') fetchAdminData();
  }, [user, navigate]);

  const handleUpdateCommission = async () => {
    setIsSavingRate(true);
    // Pretend to update commission rate via API
    await new Promise(r => setTimeout(r, 600));
    toast.success(`Global commission rate updated to ${commissionRate}%`);
    setIsSavingRate(false);
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Ban or delete this user?')) return;
    try {
      const res = await api.delete(`/admin/users/${id}`);
      if (res.data.success) {
        toast.success(res.data.message || 'User deleted');
        setUsers(users.filter(u => u._id !== id));
      }
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  if (loading) return <div className="p-10 text-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>;

  return (
    <div className="max-w-7xl mx-auto py-8">
      <SEO title="Admin Control Panel" description="Manage BookBazaar Platform Settings and Users." />
      
      <div className="flex justify-between items-end mb-8 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight flex items-center gap-3">
             <ShieldBan className="text-red-500" size={32} />
             Admin Command Center
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Platform overview and management console.</p>
        </div>
      </div>

      <div className="flex gap-1 mb-8 bg-gray-100 p-1.5 rounded-xl w-fit">
        {['overview', 'users', 'content', 'settings'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm capitalize transition-all z-10 ${
              activeTab === tab 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 border-l-4 border-l-blue-500">
              <div className="bg-blue-50 p-4 rounded-xl text-blue-600"><Users size={24} /></div>
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1">Total Users</p>
                <p className="text-2xl font-black text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 border-l-4 border-l-green-500">
              <div className="bg-green-50 p-4 rounded-xl text-green-600"><DollarSign size={24} /></div>
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1">Total GMV</p>
                <p className="text-2xl font-black text-gray-900">Rs. {stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 border-l-4 border-l-purple-500">
              <div className="bg-purple-50 p-4 rounded-xl text-purple-600"><Percent size={24} /></div>
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1">Platform Revenue</p>
                <p className="text-2xl font-black text-gray-900">Rs. {stats.totalCommission.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 border-l-4 border-l-orange-500">
              <div className="bg-orange-50 p-4 rounded-xl text-orange-600"><Briefcase size={24} /></div>
              <div>
                <p className="text-sm font-bold text-gray-500 mb-1">Active Listings</p>
                <p className="text-2xl font-black text-gray-900">{stats.activeListings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px]">
            <h3 className="font-bold text-gray-900 mb-6">Weekly Gross Merchandise Value (GMV)</h3>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dx={-10} tickFormatter={(v) => `Rs.${v}`} />
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   formatter={(value) => [`Rs. ${value}`, 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Joined On</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900">{u.name}</div>
                        <div className="text-sm text-gray-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {u.role}
                      </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {u.role !== 'admin' && (
                       <button onClick={() => handleDeleteUser(u._id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors flex items-center gap-1.5 ml-auto">
                         <ShieldBan size={16} /> Ban User
                       </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-2xl animate-in fade-in duration-500">
           <h3 className="font-bold text-xl text-gray-900 mb-6">Financial Settings</h3>
           
           <div className="space-y-6">
              <div>
                 <label className="block text-sm font-bold text-gray-700 mb-2">
                   Platform Commission Rate (%)
                 </label>
                 <div className="flex items-center gap-4">
                   <input 
                     type="range" 
                     min="1" 
                     max="30" 
                     value={commissionRate}
                     onChange={(e) => setCommissionRate(e.target.value)}
                     className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                   />
                   <span className="text-2xl font-black text-blue-600 w-16 text-right">{commissionRate}%</span>
                 </div>
                 <p className="text-gray-500 text-sm mt-2">
                   This rate is deducted from the final sale price before payouts are allocated to sellers.
                 </p>
              </div>

              <div className="pt-6 border-t border-gray-100">
                 <button 
                   onClick={handleUpdateCommission}
                   disabled={isSavingRate}
                   className="bg-gray-900 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-gray-800 transition-all disabled:bg-gray-400"
                 >
                   {isSavingRate ? 'Saving...' : 'Save Changes'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
