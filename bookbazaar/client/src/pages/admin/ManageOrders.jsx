import { useEffect, useState } from 'react';
import api from '../../services/api';
import SEO from '../../components/common/SEO';
import toast from 'react-hot-toast';

function StatusPill({ status }) {
  const s = String(status || '').toLowerCase();
  const cls =
    s.includes('completed') ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : s.includes('cancel') ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-amber-50 text-amber-800 border-amber-200';
  return <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${cls}`}>{status || 'Pending'}</span>;
}

export default function ManageOrders() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/revenue');
      setOrders(res?.data?.data?.recentOrders || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <SEO title="Orders Overview" description="Admin orders overview." />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Orders Overview</h1>
          <p className="text-sm text-gray-600">Showing recent paid orders (admin actions coming soon).</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Order ID', 'Buyer', 'Books', 'Total', 'Status', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={7}>Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={7}>No orders found.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">{String(o._id).slice(-8)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{o.buyerId?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{o.bookId?.title || '—'}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">Rs. {Number(o.price || 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusPill status={o.orderStatus || 'Pending'} /></td>
                    <td className="px-4 py-3 text-sm text-gray-700">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <span className="text-xs">View Details / Mark Complete / Cancel (coming soon)</span>
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

