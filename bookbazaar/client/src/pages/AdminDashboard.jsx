import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, DollarSign, Briefcase, Percent, ShieldBan } from 'lucide-react';
import SEO from '../components/common/SEO';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    totalCommission: 0,
    activeListings: 0
  });
  
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [chartData, setChartData] = useState([]);
  
  const [commissionRate, setCommissionRate] = useState(10); // Default 10%
  const [isSavingRate, setIsSavingRate] = useState(false);

  // Edit Product Modal State
  const [editingBook, setEditingBook] = useState(null);
  const [isSavingBook, setIsSavingBook] = useState(false);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const [usersRes, booksRes, statsRes, revenueRes] = await Promise.all([
          api.get('/admin/users'),
          api.get('/books'),
          api.get('/admin/stats'),
          api.get('/admin/revenue'),
        ]);

        const activeUsers = usersRes.data.success ? (usersRes.data.data?.users || []) : [];
        setUsers(activeUsers);

        const allBooks = booksRes.data.success ? (booksRes.data.data?.books || []) : [];
        setBooks(allBooks);

        const activeListingsCount = allBooks.filter(b => b.status === 'available').length;

        const serverStats = statsRes.data?.data || {};
        const revenueData = revenueRes.data?.data || {};

        const serverCommissionRate = Number(revenueData.commissionRate ?? 0.10);
        setCommissionRate(Math.round(serverCommissionRate * 100));

        setStats({
          totalUsers: activeUsers.length,
          totalRevenue: Number(serverStats.totalRevenue || 0),
          totalCommission: Number(revenueData.totalCommission || 0),
          activeListings: activeListingsCount,
        });

        const recentOrders = revenueData.recentOrders || [];
        const points = recentOrders
          .slice(0, 7)
          .map((o) => ({
            name: new Date(o.createdAt).toLocaleDateString(undefined, { weekday: 'short' }),
            revenue: Number(o.commissionAmount || 0),
          }));

        setChartData(points.length ? points : []);

      } catch (err) {
        toast.error('Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };
    
    if (user?.role === 'admin') fetchAdminData();
  }, [user]);

  const handleUpdateCommission = async () => {
    setIsSavingRate(true);
    try {
      const res = await api.put('/admin/commission', { rate: Number(commissionRate) / 100 });
      if (res.data.success) {
        toast.success(`Global commission rate updated to ${commissionRate}%`);
      } else {
        toast.error(res.data.message || 'Failed to update commission');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update commission');
    } finally {
      setIsSavingRate(false);
    }
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

  const handleDeleteBook = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      const res = await api.delete(`/admin/books/${id}`);
      if (res.data.success) {
        toast.success('Book deleted');
        setBooks(books.filter(b => b._id !== id));
      }
    } catch (err) {
      toast.error('Failed to delete book');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSavingBook(true);
    try {
      // Create FormData if we need to send files, but here we update text fields including SEO
      const formBody = {
        title: editingBook.title,
        price: editingBook.price,
        seoTitle: editingBook.seoTitle,
        seoDescription: editingBook.seoDescription,
        metaTags: editingBook.metaTags,
      };
      
      const res = await api.put(`/books/${editingBook._id}`, formBody);
      if (res.data.success) {
        toast.success('Book updated successfully');
        setBooks(books.map(b => b._id === editingBook._id ? res.data.data : b));
        setEditingBook(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update book');
    } finally {
      setIsSavingBook(false);
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

      {activeTab === 'content' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {books.map((b) => (
                <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
                        <img src={b.image || 'https://via.placeholder.com/40'} alt={b.title} className="object-cover w-full h-full" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900">{b.title}</div>
                        <div className="text-sm text-gray-500">{b.author}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                     Rs. {b.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                     <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                        b.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {b.status}
                      </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                     <button onClick={() => setEditingBook(b)} className="text-blue-600 hover:text-blue-900 mr-4 font-bold">Edit</button>
                     <button onClick={() => handleDeleteBook(b._id)} className="text-red-500 hover:text-red-700 font-bold">Delete</button>
                  </td>
                </tr>
              ))}
              {books.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No products found.</td>
                </tr>
              )}
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

      {/* Edit Book Modal */}
      {editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-900">Edit Product & SEO</h2>
              <button onClick={() => setEditingBook(null)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-6">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                   <input required type="text" value={editingBook.title} onChange={e => setEditingBook({...editingBook, title: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Price</label>
                   <input required type="number" value={editingBook.price} onChange={e => setEditingBook({...editingBook, price: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                 </div>
               </div>

               <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-4">
                 <h3 className="font-bold text-blue-900 text-sm">SEO & Metadata</h3>
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">SEO Title Tag</label>
                   <input type="text" value={editingBook.seoTitle || ''} onChange={e => setEditingBook({...editingBook, seoTitle: e.target.value})} placeholder="e.g. Buy Used Calculus Textbooks" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Meta Description</label>
                   <textarea value={editingBook.seoDescription || ''} onChange={e => setEditingBook({...editingBook, seoDescription: e.target.value})} placeholder="Optimal length ~150 chars" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none h-20" />
                 </div>
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">Meta Tags (comma separated)</label>
                   <input type="text" value={Array.isArray(editingBook.metaTags) ? editingBook.metaTags.join(', ') : (editingBook.metaTags || '')} onChange={e => setEditingBook({...editingBook, metaTags: e.target.value})} placeholder="book, used, textbooks" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                 </div>
               </div>

               <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setEditingBook(null)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" disabled={isSavingBook} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50">
                    {isSavingBook ? 'Saving...' : 'Save Changes'}
                  </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
