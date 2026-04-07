import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Navigate, Outlet } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';

const Spinner = () => (
  <div className="flex justify-center items-center py-24" aria-busy="true" aria-label="Loading">
    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * Layout guard for /admin/* (use with <Route element={<AdminRoute />}> child routes).
 * Renders <Outlet /> when used as a layout route; otherwise renders children.
 */
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated && !isAdmin) {
      toast.error('Access Denied');
    }
  }, [loading, isAuthenticated, isAdmin]);

  if (loading) return <Spinner />;

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return children ?? <Outlet />;
};

AdminRoute.propTypes = {
  children: PropTypes.node,
};

export default AdminRoute;
