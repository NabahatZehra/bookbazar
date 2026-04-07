import { useEffect, useState } from 'react';
import api from '../../services/api';
import SEO from '../../components/common/SEO';
import toast from 'react-hot-toast';

export default function ManageUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users?limit=50&page=1');
      setUsers(res?.data?.data?.users || []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleSuspend = async (id) => {
    if (!window.confirm('Suspend/unsuspend this user?')) return;
    try {
      const res = await api.patch(`/admin/users/${id}/ban`);
      if (res?.data?.success) {
        toast.success(res.data.message || 'Updated');
        setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, isBanned: !u.isBanned } : u)));
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed');
    }
  };

  const removeUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      const res = await api.delete(`/admin/users/${id}`);
      if (res?.data?.success) {
        toast.success('User removed');
        setUsers((prev) => prev.filter((u) => u._id !== id));
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      <SEO title="Manage Users" description="Admin user management." />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Users</h1>
          <p className="text-sm text-gray-600">Suspend or remove accounts.</p>
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
                {['Avatar', 'Name', 'Email', 'Role', 'Joined Date', 'Books Listed', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={7}>Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td className="px-4 py-6 text-sm text-gray-500" colSpan={7}>No users found.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-black flex items-center justify-center">
                        {String(u.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{u.name}</div>
                      {u.isBanned && <div className="text-xs text-red-600 font-semibold">Suspended</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-black ${u.role === 'admin' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-800'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{Number(u.booksListed || 0)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        {u.role !== 'admin' && (
                          <>
                            <button
                              type="button"
                              onClick={() => void toggleSuspend(u._id)}
                              className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs font-bold hover:bg-amber-100"
                            >
                              {u.isBanned ? 'Unsuspend' : 'Suspend'}
                            </button>
                            <button
                              type="button"
                              onClick={() => void removeUser(u._id)}
                              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </>
                        )}
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

