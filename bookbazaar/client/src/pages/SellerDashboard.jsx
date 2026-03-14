import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BookOpen, DollarSign, ListOrdered, CheckCircle, Edit, Trash2 } from 'lucide-react';
import SEO from '../components/common/SEO';
import api from '../services/api';
import toast from 'react-hot-toast';

const SellerDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, listings, sales
  
  const [stats, setStats] = useState({
    totalListed: 0,
    totalSold: 0,
    earnings: 0,
    pendingOrders: 0
  });
  
  const [myBooks, setMyBooks] = useState([]);
  const [mySales, setMySales] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // In a real app, you might have an aggregated /api/dashboard/seller endpoint.
        // We'll fetch the individual pieces.
        const [booksRes, salesRes] = await Promise.all([
          api.get(`/books/user/${user._id}`),
          api.get('/orders/my-sales')
        ]);
        
        const books = booksRes.data.success ? booksRes.data.data : [];
        const sales = salesRes.data.success ? salesRes.data.data : [];
        
        setMyBooks(books);
        setMySales(sales);
        
        // Calculate Stats
        const soldBooks = books.filter(b => b.status === 'sold').length;
        const pending = sales.filter(s => s.orderStatus === 'Pending' || s.orderStatus === 'Processing').length;
        // Seller earnings
        const earnings = sales.reduce((sum, order) => sum + (order.sellerAmount || 0), 0);
        
        setStats({
          totalListed: books.length,
          totalSold: soldBooks,
          earnings,
          pendingOrders: pending
        });

        // Mock Chart Data for recent months (in a real app, generate from sales dates)
        setChartData([
          { name: 'Jan', earnings: 0 },
          { name: 'Feb', earnings: 1500 },
          { name: 'Mar', earnings: 3200 },
          { name: 'Apr', earnings: 1800 },
          { name: 'May', earnings: earnings > 0 ? earnings : 4500 } // Add current earnings to latest for demo
        ]);
        
      } catch (err) {
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) fetchDashboardData();
  }, [user]);

  const handleDeleteBook = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      const res = await api.delete(`/books/${id}`);
      if (res.data.success) {
        toast.success('Book deleted successfully');
        setMyBooks(myBooks.filter(b => b._id !== id));
        setStats(prev => ({ ...prev, totalListed: prev.totalListed - 1 }));
      }
    } catch (err) {
      toast.error('Failed to delete book');
    }
  };

  if (loading) return <div className="p-10 text-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>;

  return (
    <div className="max-w-7xl mx-auto py-8">
      <SEO title="Seller Dashboard" description="Manage your BookBazaar listings and sales." />
      
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">Seller Dashboard</h1>
          <p className="text-gray-500 mt-1 font-medium">Welcome back, {user?.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-gray-100 p-1.5 rounded-xl w-fit">
        {['overview', 'listings', 'sales'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-lg font-bold text-sm capitalize transition-all ${
              activeTab === tab 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-blue-100 p-4 rounded-xl text-blue-600"><BookOpen size={24} /></div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Listed</p>
                <p className="text-2xl font-black text-gray-900">{stats.totalListed}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-green-100 p-4 rounded-xl text-green-600"><CheckCircle size={24} /></div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Sold</p>
                <p className="text-2xl font-black text-gray-900">{stats.totalSold}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-purple-100 p-4 rounded-xl text-purple-600"><DollarSign size={24} /></div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Earnings</p>
                <p className="text-2xl font-black text-gray-900">Rs. {stats.earnings.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="bg-orange-100 p-4 rounded-xl text-orange-600"><ListOrdered size={24} /></div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Pending Orders</p>
                <p className="text-2xl font-black text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-96">
            <h3 className="font-bold text-gray-900 mb-6">Earnings Overview</h3>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} dx={-10} tickFormatter={(value) => `Rs.${value}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`Rs. ${value}`, 'Earnings']}
                />
                <Line type="monotone" dataKey="earnings" stroke="#2563eb" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* LISTINGS TAB */}
      {activeTab === 'listings' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Book</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Price (Rs)</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Listed On</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {myBooks.map((book) => (
                  <tr key={book._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 rounded bg-gray-100 border border-gray-200 overflow-hidden">
                          <img className="h-full w-full object-cover" src={book.image} alt="" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-bold text-gray-900 max-w-[200px] truncate">{book.title}</div>
                          <div className="text-sm text-gray-500">{book.condition}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">
                      {book.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                        book.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {book.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {new Date(book.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-4 bg-blue-50 p-2 rounded-lg transition-colors"><Edit size={16} /></button>
                      <button onClick={() => handleDeleteBook(book._id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
                {myBooks.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">No books listed yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SALES TAB */}
      {activeTab === 'sales' && (
         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Item</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Buyer</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Earnings (Rs)</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mySales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{sale._id.toString().slice(-6)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{sale.bookId?.title || 'Unknown Book'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{sale.buyerId?.name || 'Unknown Buyer'}</div>
                      <div className="text-xs text-gray-500">{sale.buyerId?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-green-600">
                      +{sale.sellerAmount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                        sale.orderStatus === 'Completed' ? 'bg-green-100 text-green-800' : 
                        sale.orderStatus === 'Processing' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {sale.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {mySales.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">No sales yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default SellerDashboard;
