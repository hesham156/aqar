import { Link } from 'react-router-dom';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Mail, 
  Phone, 
  MapPin 
} from 'lucide-react';
import Logo from './Logo';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center mb-4">
              <Logo className="h-8 w-8 text-primary-400" />
              <span className="ml-2 text-xl font-heading font-bold text-white">Aqar</span>
            </div>
            <p className="text-gray-400 mb-6">
              Your trusted partner for buying, selling, and renting properties in Saudi Arabia.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Facebook size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-400 transition-colors">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-heading font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-primary-400 transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/?category=buy" className="text-gray-400 hover:text-primary-400 transition-colors">Properties for Sale</Link>
              </li>
              <li>
                <Link to="/?category=rent" className="text-gray-400 hover:text-primary-400 transition-colors">Properties for Rent</Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-400 hover:text-primary-400 transition-colors">Login</Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-400 hover:text-primary-400 transition-colors">Register</Link>
              </li>
            </ul>
          </div>
          
          {/* Property Types */}
          <div>
            <h3 className="text-lg font-heading font-semibold mb-4">Property Types</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/?type=apartment" className="text-gray-400 hover:text-primary-400 transition-colors">Apartments</Link>
              </li>
              <li>
                <Link to="/?type=villa" className="text-gray-400 hover:text-primary-400 transition-colors">Villas</Link>
              </li>
              <li>
                <Link to="/?type=office" className="text-gray-400 hover:text-primary-400 transition-colors">Offices</Link>
              </li>
              <li>
                <Link to="/?type=land" className="text-gray-400 hover:text-primary-400 transition-colors">Land</Link>
              </li>
              <li>
                <Link to="/?type=commercial" className="text-gray-400 hover:text-primary-400 transition-colors">Commercial</Link>
              </li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-heading font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <MapPin className="w-5 h-5 mr-2 text-primary-400 mt-0.5" />
                <span className="text-gray-400">
                  123 Riyadh Business Center, King Fahd Road, Riyadh, Saudi Arabia
                </span>
              </li>
              <li className="flex items-center">
                <Phone className="w-5 h-5 mr-2 text-primary-400" />
                <span className="text-gray-400">+966 12 345 6789</span>
              </li>
              <li className="flex items-center">
                <Mail className="w-5 h-5 mr-2 text-primary-400" />
                <span className="text-gray-400">info@aqar.com</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} Aqar. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <Link to="/privacy-policy" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms-of-service" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">
                Terms of Service
              </Link>
              <Link to="/contact" className="text-gray-400 hover:text-primary-400 text-sm transition-colors">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;