import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { Mail, Calendar, Edit3, Key, Image } from 'lucide-react';
import EducationProfileModal from '../../components/onboarding/EducationProfileModal';
import { Link } from 'react-router-dom';

const UserProfile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({ name: '', avatar: '' });
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [stats, setStats] = useState({ booksListed: 0, booksSold: 0, purchasesMade: 0 });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [preview, setPreview] = useState('');
  const [showEducationModal, setShowEducationModal] = useState(false);
  const [adminStats, setAdminStats] = useState({ usersCount: 0, booksCount: 0, ordersCount: 0, totalRevenue: 0, totalCommission: 0 });

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      void fetchAdminStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/profile');
      if (res.data.success) {
        setProfileData({
          name: res.data.data.user.name,
          avatar: res.data.data.user.avatar
        });
        setPreview(res.data.data.user.avatar);
        setStats(res.data.data.stats);
      }
    } catch (err) {
      toast.error('Failed to load profile');
    }
  };

  const fetchAdminStats = async () => {
    try {
      const [statsRes, revenueRes] = await Promise.all([api.get('/admin/stats'), api.get('/admin/revenue')]);
      setAdminStats({
        ...(statsRes?.data?.data || {}),
        totalCommission: Number(revenueRes?.data?.data?.totalCommission || 0),
      });
    } catch {
      // ignore
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', profileData.name);
      if (file) formData.append('avatar', file);

      const res = await api.put('/users/profile', formData);
      if (res.data.success) {
        toast.success('Profile updated successfully');
        // Update context or reload
        window.location.reload(); 
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    setPassLoading(true);
    try {
      const res = await api.put('/users/change-password', {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword
      });
      if (res.data.success) {
        toast.success('Password changed successfully');
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password update failed');
    } finally {
      setPassLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  if (!user) return null;

  if (user.role === 'admin') {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <Helmet><title>Admin Profile - BookBazaar</title></Helmet>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex flex-col items-center gap-4">
            <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-gray-50 shadow-md flex items-center justify-center bg-slate-900 text-white text-3xl font-black">
              A
            </div>
            <div className="text-center">
              <div className="inline-flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-gray-900">{user.name || 'Admin'}</h2>
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-red-50 text-red-700 border border-red-200">
                  ADMIN
                </span>
              </div>
              <p className="text-gray-500 text-sm flex items-center justify-center gap-1 mt-1"><Mail size={14}/> {user.email}</p>
              <p className="text-gray-400 text-xs flex items-center justify-center gap-1 mt-1"><Calendar size={14}/> Account created {new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">
              <p className="text-3xl font-black text-slate-900 mb-1">{adminStats.booksCount || 0}</p>
              <p className="text-sm font-medium text-slate-700">Books Managed</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">
              <p className="text-3xl font-black text-slate-900 mb-1">{adminStats.usersCount || 0}</p>
              <p className="text-sm font-medium text-slate-700">Users Managed</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">
              <p className="text-3xl font-black text-slate-900 mb-1">{adminStats.ordersCount || 0}</p>
              <p className="text-sm font-medium text-slate-700">Orders Processed</p>
            </div>
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">
              <p className="text-3xl font-black text-slate-900 mb-1">Rs. {Number(adminStats.totalCommission || 0).toLocaleString()}</p>
              <p className="text-sm font-medium text-slate-700">Platform Revenue</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-extrabold text-gray-900 mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/admin/books" className="px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-bold text-gray-900">
              → Manage Books
            </Link>
            <Link to="/admin/users" className="px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-bold text-gray-900">
              → Manage Users
            </Link>
            <Link to="/admin/orders" className="px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-bold text-gray-900">
              → View Orders
            </Link>
            <Link to="/admin/settings" className="px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 font-bold text-gray-900">
              → Site Settings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Helmet><title>My Profile - BookBazaar</title></Helmet>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col md:flex-row gap-8 items-start">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-50 shadow-md relative group">
            <img src={preview || user.avatar || 'https://via.placeholder.com/150'} alt={user.name} className="w-full h-full object-cover" />
            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer cursor-allowed">
              <Image size={24} />
              <span className="text-xs font-medium mt-1">Change</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">{profileData.name || user.name}</h2>
            <p className="text-gray-500 text-sm flex items-center justify-center gap-1 mt-1"><Mail size={14}/> {user.email}</p>
            <p className="text-gray-400 text-xs flex items-center justify-center gap-1 mt-1"><Calendar size={14}/> Member since {new Date(user.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="flex-1 grid grid-cols-3 gap-4 w-full md:w-auto">
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
            <p className="text-3xl font-black text-blue-600 mb-1">{stats.booksListed}</p>
            <p className="text-sm font-medium text-blue-800">Books Listed</p>
          </div>
          <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100 text-center">
            <p className="text-3xl font-black text-emerald-600 mb-1">{stats.booksSold}</p>
            <p className="text-sm font-medium text-emerald-800">Books Sold</p>
          </div>
          <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 text-center">
            <p className="text-3xl font-black text-purple-600 mb-1">{stats.purchasesMade}</p>
            <p className="text-sm font-medium text-purple-800">Purchases</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Education Profile</h3>
          <p className="text-sm text-gray-600">Keep your academic profile updated for smarter recommendations.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowEducationModal(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
        >
          Edit Education Profile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Edit Profile */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6 border-b pb-4"><Edit3 size={18}/> Update Profile</h3>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input 
                type="text" 
                value={profileData.name} 
                onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-xs text-gray-400 font-normal">(Cannot be changed)</span></label>
               <input 
                type="text" 
                value={user.email} 
                disabled
                className="w-full p-2.5 bg-gray-100 text-gray-400 border border-gray-200 rounded-lg cursor-not-allowed"
              />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
           <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6 border-b pb-4"><Key size={18}/> Change Password</h3>
           <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input 
                  type="password" 
                  value={passwordData.oldPassword} 
                  required
                  onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input 
                  type="password" 
                  value={passwordData.newPassword} 
                  required minLength={6}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input 
                  type="password" 
                  value={passwordData.confirmPassword} 
                  required minLength={6}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button type="submit" disabled={passLoading} className="w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {passLoading ? 'Updating...' : 'Update Password'}
            </button>
           </form>
        </div>
      </div>

      <EducationProfileModal
        isOpen={showEducationModal}
        onSaved={() => {
          setShowEducationModal(false);
          void fetchProfile();
        }}
      />
    </div>
  );
};
export default UserProfile;
