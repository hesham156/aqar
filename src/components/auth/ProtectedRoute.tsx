import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PageLoader from '../common/PageLoader';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;