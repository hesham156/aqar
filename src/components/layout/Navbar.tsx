import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogIn, UserPlus, Home, Building2, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from './Logo';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo className="h-8 w-auto" />
            <span className="ml-2 text-xl font-heading font-bold text-primary-700">Aqar</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
              Home
            </Link>
            <Link to="/?category=buy" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
              Buy
            </Link>
            <Link to="/?category=rent" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">
              Rent
            </Link>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 rounded-full border border-gray-300 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </form>
          </nav>

          {/* Authentication Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/dashboard"
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="flex items-center px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 font-medium transition-colors"
                >
                  <LogIn className="h-4 w-4 mr-1" />
                  Login
                </Link>
                <Link
                  to="/register"
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-primary-50 focus:outline-none"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="px-4 pt-2 pb-4 space-y-3">
            <form onSubmit={handleSearch} className="relative mb-4">
              <input
                type="text"
                placeholder="Search properties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-full border border-gray-300 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </form>
            
            <Link
              to="/"
              className="flex items-center px-3 py-2 rounded-md text-gray-700 hover:bg-primary-50 hover:text-primary-600"
              onClick={toggleMenu}
            >
              <Home className="h-5 w-5 mr-2" />
              Home
            </Link>
            <Link
              to="/?category=buy"
              className="flex items-center px-3 py-2 rounded-md text-gray-700 hover:bg-primary-50 hover:text-primary-600"
              onClick={toggleMenu}
            >
              <Building2 className="h-5 w-5 mr-2" />
              Buy
            </Link>
            <Link
              to="/?category=rent"
              className="flex items-center px-3 py-2 rounded-md text-gray-700 hover:bg-primary-50 hover:text-primary-600"
              onClick={toggleMenu}
            >
              <Building2 className="h-5 w-5 mr-2" />
              Rent
            </Link>
            
            <div className="pt-3 border-t border-gray-200">
              {user ? (
                <div className="space-y-2">
                  <Link
                    to="/dashboard"
                    className="block px-3 py-2 rounded-md text-primary-600 hover:bg-primary-50 font-medium"
                    onClick={toggleMenu}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      toggleMenu();
                    }}
                    className="block w-full text-left px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    className="flex items-center px-3 py-2 rounded-md text-primary-600 hover:bg-primary-50 font-medium"
                    onClick={toggleMenu}
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center px-3 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 font-medium"
                    onClick={toggleMenu}
                  >
                    <UserPlus className="h-5 w-5 mr-2" />
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;