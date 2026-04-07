import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import SEO from '../../components/common/SEO';
import toast from 'react-hot-toast';

const statusFilters = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'available', label: 'Approved' },
  { id: 'reported', label: 'Reported' },
];

export default function ManageBooks() {
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (status !== 'all' && status !== 'reported') params.append('status', status);
      params.append('limit', '50');
      params.append('page', '1');
      const res = await api.get(`/admin/books?${params.toString()}`);
      const list = res?.data?.data?.books || [];
      const filtered = status === 'reported' ? list.filter((b) => b.isReported === true) : list;
      setBooks(filtered);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load books');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBooks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const approveBook = async (id) => {
    try {
      const res = await api.patch(`/admin/books/${id}/status`, { status: 'available' });
      if (res?.data?.success) {
        toast.success('Approved');
        setBooks((prev) => prev.map((b) => (b._id === id ? { ...b, status: 'available' } : b)));
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to approve');
    }
  };

  const removeBook = async (id) => {
    if (!window.confirm('Remove this book listing?')) return;
    try {
      const res = await api.delete(`/admin/books/${id}`);
      if (res?.data?.success) {
        toast.success('Removed');
        setBooks((prev) => prev.filter((b) => b._id !== id));
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to remove');
    }
  };

  const rows = useMemo(() => books, [books]);

  return (
    <div className="space-y-6">
      <SEO title="Manage Books" description="Admin books management." />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Book Listings</h1>
          <p className="text-sm text-gray-600">Review, approve, and remove listings.</p>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or seller..."
            className="w-64 max-w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void fetchBooks()}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50"
          >
            Search
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {statusFilters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatus(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
              status === f.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Cover', 'Title', 'Seller', 'Price', 'Category', 'Condition', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={8}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={8}>No books found.</td></tr>
              ) : (
                rows.map((b) => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <img src={b.image} alt="" className="w-10 h-14 object-cover rounded" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900 line-clamp-1">{b.title}</div>
                      <div className="text-xs text-gray-500 line-clamp-1">{b.author}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="font-semibold">{b.sellerId?.name || '—'}</div>
                      <div className="text-xs text-gray-500">{b.sellerId?.email || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">Rs. {Number(b.price || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{b.educationMeta?.level || b.category || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{b.condition}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-gray-100 text-gray-800">
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {b.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => void approveBook(b._id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                        )}
                        <Link
                          to={`/book/${b._id}`}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-bold hover:bg-gray-50"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          onClick={() => void removeBook(b._id)}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

