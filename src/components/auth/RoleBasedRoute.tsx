import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import PageLoader from '../common/PageLoader';

interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

const RoleBasedRoute = ({ children, allowedRoles }: RoleBasedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to the appropriate dashboard based on user role
    if (user.role === 'admin') {
      return <Navigate to="/dashboard/admin" />;
    } else if (user.role === 'seller') {
      return <Navigate to="/dashboard/seller" />;
    } else {
      return <Navigate to="/dashboard/buyer" />;
    }
  }

  return <>{children}</>;
};

export default RoleBasedRoute;