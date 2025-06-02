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
const Users = lazy(() => import('./pages/dashboard/admin/Users'));
const SellerDashboard = lazy(() => import('./pages/dashboard/seller/SellerDashboard'));
const AddProperty = lazy(() => import('./pages/dashboard/seller/AddProperty'));
const AllProperties = lazy(() => import('./pages/dashboard/seller/AllProperties'));
const BuyerDashboard = lazy(() => import('./pages/dashboard/buyer/BuyerDashboard'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Profile = lazy(() => import('./pages/Profile'));
const Transactions = lazy(() => import('./pages/Transactions'));
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

          <Route path="dashboard/admin/users" element={
            <RoleBasedRoute allowedRoles={['admin']}>
              <Users />
            </RoleBasedRoute>
          } />
          
          <Route path="dashboard/seller" element={
            <RoleBasedRoute allowedRoles={['seller']}>
              <SellerDashboard />
            </RoleBasedRoute>
          } />

          <Route path="dashboard/seller/properties" element={
            <RoleBasedRoute allowedRoles={['seller']}>
              <AllProperties />
            </RoleBasedRoute>
          } />

          <Route path="dashboard/seller/properties/add" element={
            <RoleBasedRoute allowedRoles={['seller']}>
              <AddProperty />
            </RoleBasedRoute>
          } />
          
          <Route path="dashboard/buyer" element={
            <RoleBasedRoute allowedRoles={['buyer']}>
              <BuyerDashboard />
            </RoleBasedRoute>
          } />
          
          <Route path="transactions" element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={['admin', 'seller', 'buyer']}>
                <Transactions />
              </RoleBasedRoute>
            </ProtectedRoute>
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