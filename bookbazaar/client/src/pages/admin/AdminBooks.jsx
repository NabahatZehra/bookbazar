import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const AdminBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/books', {
        params: { page, limit: 10, search, condition, status },
      });

      if (data.success) {
        setBooks(data.data.books);
        setTotalPages(data.data.pages);
      } else {
        toast.error('Failed to fetch books');
      }
    } catch {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  }, [page, search, condition, status]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this book? This will also remove it from active carts.')) return;
    
    try {
      const { data } = await api.delete(`/admin/books/${id}`);

      if (data.success) {
        toast.success(data.message);
        fetchBooks();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Failed to delete book');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const { data } = await api.patch(`/admin/books/${id}/status`, { status: newStatus });

      if (data.success) {
        toast.success('Status updated');
        setBooks(books.map(b => b._id === id ? { ...b, status: newStatus } : b));
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <Helmet>
        <title>Manage Books - Admin Portal</title>
      </Helmet>

      {/* Header and Controls */}
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Books Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all books across the marketplace</p>
        </div>
        <Link 
          to="/admin/books/new" 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-sm"
        >
          + Add New Book
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-gray-50 p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center">
        <div className="flex-grow max-w-md">
          <input 
            type="text" 
            placeholder="Search by title..." 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <select 
          value={condition} 
          onChange={(e) => { setCondition(e.target.value); setPage(1); }}
          className="px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="all">All Conditions</option>
          <option value="New">New</option>
          <option value="Good">Good</option>
          <option value="Fair">Fair</option>
        </select>
        <select 
          value={status} 
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="px-4 py-2 rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="available">Available</option>
          <option value="sold">Sold</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-sm border-b border-gray-200">
              <th className="p-4 font-semibold">Book</th>
              <th className="p-4 font-semibold">Price</th>
              <th className="p-4 font-semibold">Condition</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : books.length === 0 ? (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500">No books found matching criteria.</td></tr>
            ) : (
              books.map((book) => (
                <tr key={book._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <img src={book.image} alt={book.title} className="w-12 h-16 object-cover rounded shadow-sm" />
                      <div>
                        <p className="font-semibold text-gray-900 max-w-xs truncate">{book.title}</p>
                        <p className="text-xs text-gray-500 truncate">{book.author}</p>
                        <p className="text-xs text-blue-500 truncate">Seller: {book.sellerId?.name || 'Unknown'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-gray-900">${Number(book.price).toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      book.condition === 'New' ? 'bg-green-100 text-green-700' :
                      book.condition === 'Good' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {book.condition}
                    </span>
                  </td>
                  <td className="p-4">
                    <select 
                      value={book.status} 
                      onChange={(e) => handleStatusChange(book._id, e.target.value)}
                      className={`text-sm rounded-lg px-2 py-1 outline-none font-medium border-0 cursor-pointer ${
                        book.status === 'available' ? 'bg-emerald-50 text-emerald-700' : 
                        book.status === 'sold' ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <option value="available">Available</option>
                      <option value="sold">Sold</option>
                      <option value="removed">Removed</option>
                    </select>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <Link to={`/admin/books/edit/${book._id}`} className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">Edit</Link>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => handleDelete(book._id)} className="text-red-600 hover:text-red-900 text-sm font-medium">Delete</button>
                    <span className="text-gray-300">|</span>
                    <Link to={`/books/${book._id}`} target="_blank" className="text-gray-600 hover:text-gray-900 text-sm font-medium">View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 flex items-center justify-between border-t border-gray-100">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 border rounded-lg text-sm font-medium disabled:opacity-50 text-gray-700"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 font-medium">Page {page} of {totalPages}</span>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 border rounded-lg text-sm font-medium disabled:opacity-50 text-gray-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminBooks;
