import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Users, ShoppingCart, DollarSign } from 'lucide-react';
import api from '../../services/api';
import SEO from '../../components/common/SEO';

function StatCard({ title, value, subtitle, icon, accent }) {
  return (
    <div className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 border-l-4 ${accent}`}>
      <div className="bg-gray-50 p-4 rounded-xl text-gray-700">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-black text-gray-900 truncate">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ booksCount: 0, usersCount: 0, ordersCount: 0, totalRevenue: 0 });
  const [revenue, setRevenue] = useState({ totalCommission: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [statsRes, revenueRes] = await Promise.all([api.get('/admin/stats'), api.get('/admin/revenue')]);
        setStats(statsRes?.data?.data || stats);
        setRevenue(revenueRes?.data?.data || revenue);
      } finally {
        setLoading(false);
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cards = useMemo(
    () => [
      {
        title: 'Total Books',
        value: loading ? '—' : String(stats.booksCount),
        subtitle: '📚 Active listings',
        icon: <BookOpen size={22} />,
        accent: 'border-l-blue-500',
      },
      {
        title: 'Total Users',
        value: loading ? '—' : String(stats.usersCount),
        subtitle: '👤 Registered',
        icon: <Users size={22} />,
        accent: 'border-l-emerald-500',
      },
      {
        title: 'Total Orders',
        value: loading ? '—' : String(stats.ordersCount),
        subtitle: '🛒 Placed',
        icon: <ShoppingCart size={22} />,
        accent: 'border-l-amber-500',
      },
      {
        title: 'Revenue',
        value: loading ? '—' : `Rs. ${Number(revenue.totalCommission || 0).toLocaleString()}`,
        subtitle: '💰 Platform',
        icon: <DollarSign size={22} />,
        accent: 'border-l-purple-500',
      },
    ],
    [loading, revenue.totalCommission, stats.booksCount, stats.ordersCount, stats.usersCount]
  );

  return (
    <div className="space-y-8">
      <SEO title="Admin Dashboard" description="BookBazaar admin overview." />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Platform overview and management console.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/books" className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold hover:bg-slate-800">
            Manage Books
          </Link>
          <Link to="/admin/users" className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold hover:bg-gray-50">
            Manage Users
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((c) => (
          <StatCard key={c.title} {...c} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-extrabold text-gray-900 mb-2">Reports & Flagged Content</h2>
          <p className="text-sm text-gray-600">No reports yet. Flagged books and users will appear here.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-extrabold text-gray-900 mb-2">Activity Log</h2>
          <p className="text-sm text-gray-600">Coming soon: last 10 admin actions with timestamps.</p>
        </div>
      </div>
    </div>
  );
}

