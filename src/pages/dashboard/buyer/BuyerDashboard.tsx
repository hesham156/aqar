import { useEffect, useState } from 'react';
import {
  Home, Heart, MessageSquare, CreditCard, MapPin, Building2, ChevronRight
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import StatCard from '../../../components/dashboard/StatCard';
import { collection, getDocs, query, where, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../contexts/AuthContext';
import { Property } from '../../../types/property';
import { Link } from 'react-router-dom';
import PropertyCard from '../../../components/property/PropertyCard';

interface SavedProperty extends Property {
  savedAt: string;
}

interface PropertyRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  sellerId: string;
  sellerName: string;
  type: 'visit' | 'offer';
  status: 'pending' | 'accepted' | 'rejected';
  amount?: number;
  message: string;
  createdAt: string;
}

const BuyerDashboard = () => {
  const { user } = useAuth();
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [requests, setRequests] = useState<PropertyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchBuyerData = async () => {
      setLoading(true);
      try {
        // Get user data including favorites
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const favorites = userData?.favorites || [];
        
        // Fetch saved properties
        const savedPropertiesData: SavedProperty[] = [];
        for (const propertyId of favorites) {
          const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
          if (propertyDoc.exists()) {
            savedPropertiesData.push({
              id: propertyDoc.id,
              ...propertyDoc.data(),
              savedAt: new Date().toISOString(), // This would ideally come from the favorites timestamp
            } as SavedProperty);
          }
        }
        setSavedProperties(savedPropertiesData);
        
        // Fetch recent properties (newest listings)
        const recentPropertiesQuery = query(
          collection(db, 'properties'),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(4)
        );
        const recentPropertiesSnapshot = await getDocs(recentPropertiesQuery);
        const recentPropertiesData = recentPropertiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Property[];
        setRecentProperties(recentPropertiesData);
        
        // Fetch property requests
        const requestsQuery = query(
          collection(db, 'propertyRequests'),
          where('buyerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        const requestsData = requestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as PropertyRequest[];
        setRequests(requestsData);
      } catch (error) {
        console.error('Error fetching buyer data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBuyerData();
  }, [user]);

  const handleFavoriteToggle = (propertyId: string, isFavorited: boolean) => {
    if (!isFavorited) {
      // If unfavorited, remove from saved properties
      setSavedProperties(savedProperties.filter(p => p.id !== propertyId));
    }
  };

  return (
    <DashboardLayout title="Buyer Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Saved Properties"
            value={savedProperties.length.toString()}
            icon={<Heart className="h-6 w-6" />}
            color="error"
          />
          <StatCard
            title="Property Requests"
            value={requests.length.toString()}
            icon={<MessageSquare className="h-6 w-6" />}
            color="primary"
          />
          <StatCard
            title="Scheduled Visits"
            value={requests.filter(r => r.type === 'visit' && r.status === 'accepted').length.toString()}
            icon={<Home className="h-6 w-6" />}
            color="success"
          />
          <StatCard
            title="Active Offers"
            value={requests.filter(r => r.type === 'offer' && r.status === 'pending').length.toString()}
            icon={<CreditCard className="h-6 w-6" />}
            color="warning"
          />
        </div>

        {/* Saved Properties */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Saved Properties</h3>
            <Link
              to="/dashboard/saved-properties"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              View all <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : savedProperties.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No saved properties</h3>
              <p className="mt-1 text-sm text-gray-500">
                Properties you save will appear here
              </p>
              <div className="mt-6">
                <Link
                  to="/"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
                >
                  Browse Properties
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedProperties.slice(0, 3).map((property) => (
                <PropertyCard 
                  key={property.id} 
                  property={property} 
                  onFavoriteToggle={handleFavoriteToggle}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Properties */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Properties</h3>
            <Link
              to="/"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
            >
              Browse all <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentProperties.slice(0, 3).map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Requests */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Your Requests</h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No requests yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                When you request property visits or make offers, they will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.slice(0, 5).map((request) => (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img
                              className="h-10 w-10 rounded-md object-cover"
                              src={request.propertyImage}
                              alt={request.propertyTitle}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{request.propertyTitle}</div>
                            <div className="text-sm text-gray-500">Seller: {request.sellerName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.type === 'visit'
                            ? 'bg-accent-100 text-accent-800'
                            : 'bg-secondary-100 text-secondary-800'
                        }`}>
                          {request.type === 'visit' ? 'Visit Request' : 'Purchase Offer'}
                        </span>
                        {request.type === 'offer' && request.amount && (
                          <div className="text-sm text-gray-500 mt-1">
                            {request.amount.toLocaleString()} SAR
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          request.status === 'accepted'
                            ? 'bg-success-100 text-success-800'
                            : request.status === 'pending'
                            ? 'bg-warning-100 text-warning-800'
                            : 'bg-error-100 text-error-800'
                        }`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link to={`/properties/${request.propertyId}`} className="text-accent-600 hover:text-accent-900 mr-3">
                          View Property
                        </Link>
                        {request.status === 'pending' && (
                          <button className="text-error-600 hover:text-error-900">
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {requests.length > 5 && (
                <div className="mt-4 text-center">
                  <Link
                    to="/dashboard/requests"
                    className="text-sm text-primary-600 hover:text-primary-500"
                  >
                    View all requests
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BuyerDashboard;