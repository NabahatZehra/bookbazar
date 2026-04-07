import { useEffect, useState } from 'react';
import SEO from '../../components/common/SEO';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [commissionRate, setCommissionRate] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/revenue');
        const rate = Number(res?.data?.data?.commissionRate ?? 0.1);
        setCommissionRate(Math.round(rate * 100));
      } catch {
        setCommissionRate(10);
      }
    };
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put('/admin/commission', {
        rate: Number(commissionRate) / 100,
      });
      if (res?.data?.success) toast.success('Settings saved');
      else toast.error(res?.data?.message || 'Failed to save');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl">
      <SEO title="Admin Settings" description="Admin settings." />
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Settings</h1>
      <p className="text-sm text-gray-600 mb-6">Site settings and financial controls.</p>

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
            onChange={(e) => setCommissionRate(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="text-2xl font-black text-blue-600 w-16 text-right">
            {commissionRate}%
          </span>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="mt-6 px-5 py-2.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

