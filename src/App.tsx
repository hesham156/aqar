import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import PageLoader from './components/common/PageLoader';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleBasedRoute from './components/auth/RoleBasedRoute';

// Lazy loaded components
const Home = lazy(() => import('./pages/Home'));
const PropertyDetails = lazy(() => import('./pages/PropertyDetails'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const AdminDashboard = lazy(() => import('./pages/dashboard/admin/AdminDashboard'));
const SellerDashboard = lazy(() => import('./pages/dashboard/seller/SellerDashboard'));
const BuyerDashboard = lazy(() => import('./pages/dashboard/buyer/BuyerDashboard'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Set document title
    document.title = 'Aqar - Saudi Real Estate Platform';
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Public routes */}
          <Route index element={<Home />} />
          <Route path="properties/:id" element={<PropertyDetails />} />
          <Route path="login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
          
          {/* Protected routes */}
          <Route path="dashboard" element={
            <ProtectedRoute>
              {user?.role === 'admin' ? <Navigate to="/dashboard/admin" /> : 
               user?.role === 'seller' ? <Navigate to="/dashboard/seller" /> : 
               <Navigate to="/dashboard/buyer" />}
            </ProtectedRoute>
          } />
          
          <Route path="dashboard/admin" element={
            <RoleBasedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </RoleBasedRoute>
          } />
          
          <Route path="dashboard/seller" element={
            <RoleBasedRoute allowedRoles={['seller']}>
              <SellerDashboard />
            </RoleBasedRoute>
          } />
          
          <Route path="dashboard/buyer" element={
            <RoleBasedRoute allowedRoles={['buyer']}>
              <BuyerDashboard />
            </RoleBasedRoute>
          } />
          
          <Route path="wallet" element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          } />
          
          <Route path="profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;