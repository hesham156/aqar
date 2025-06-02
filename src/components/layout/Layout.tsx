import { Outlet } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '../../contexts/AuthContext';

const Layout = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Check if we're on a dashboard page
  const isDashboardPage = location.pathname.includes('/dashboard');
  
  // Don't show navbar and footer on dashboard pages
  if (isDashboardPage && user) {
    return <Outlet />;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;