import { useEffect, useState } from 'react';
import {
  Building2, Eye, Heart, MessageSquare, TrendingUp, DollarSign, BarChart, Clock
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import StatCard from '../../../components/dashboard/StatCard';
import ChartCard from '../../../components/dashboard/ChartCard';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../contexts/AuthContext';
import { Property } from '../../../types/property';
import { Link } from 'react-router-dom';

interface Inquiry {
  id: string;
  propertyId: string;
  propertyTitle: string;
  buyerName: string;
  message: string;
  status: 'pending' | 'answered' | 'closed';
  createdAt: string;
}

const SellerDashboard = () => {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Example data for charts
  const viewsData = [
    { name: 'Mon', count: 15 },
    { name: 'Tue', count: 22 },
    { name: 'Wed', count: 18 },
    { name: 'Thu', count: 25 },
    { name: 'Fri', count: 30 },
    { name: 'Sat', count: 28 },
    { name: 'Sun', count: 20 },
  ];

  const inquiriesData = [
    { name: 'Mon', count: 2 },
    { name: 'Tue', count: 4 },
    { name: 'Wed', count: 3 },
    { name: 'Thu', count: 5 },
    { name: 'Fri', count: 7 },
    { name: 'Sat', count: 4 },
    { name: 'Sun', count: 3 },
  ];

  useEffect(() => {
    if (!user) return;

    const fetchSellerData = async () => {
      setLoading(true);
      try {
        // Fetch seller's properties
        const propertiesQuery = query(
          collection(db, 'properties'),
          where('sellerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const propertiesSnapshot = await getDocs(propertiesQuery);
        const propertiesData = propertiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Property[];
        setProperties(propertiesData);
        
        // Fetch inquiries for seller's properties
        const propertyIds = propertiesData.map(p => p.id);
        const inquiriesQuery = query(
          collection(db, 'inquiries'),
          where('propertyId', 'in', propertyIds.length > 0 ? propertyIds : ['none']),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const inquiriesSnapshot = await getDocs(inquiriesQuery);
        const inquiriesData = inquiriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Inquiry[];
        setInquiries(inquiriesData);
        
        // Fetch wallet balance
        const walletRef = doc(db, 'wallets', user.uid);
        const walletSnapshot = await getDoc(walletRef);
        if (walletSnapshot.exists()) {
          setWalletBalance(walletSnapshot.data().balance || 0);
        }
      } catch (error) {
        console.error('Error fetching seller data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [user]);

  // Calculate totals
  const totalViews = properties.reduce((sum, property) => sum + property.views, 0);
  const totalFavorites = properties.reduce((sum, property) => sum + property.favorites, 0);
  const totalInquiries = properties.reduce((sum, property) => sum + property.inquiries, 0);
  const pendingProperties = properties.filter(p => p.status === 'pending').length;

  return (
    <DashboardLayout title="Seller Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Properties"
            value={properties.length.toString()}
            icon={<Building2 className="h-6 w-6" />}
            color="primary"
          />
          <StatCard
            title="Total Views"
            value={totalViews.toString()}
            icon={<Eye className="h-6 w-6" />}
            trend={{ value: 8, isPositive: true }}
            color="accent"
          />
          <StatCard
            title="Wallet Balance"
            value={`${walletBalance.toLocaleString()} SAR`}
            icon={<DollarSign className="h-6 w-6" />}
            color="success"
          />
          <StatCard
            title="Pending Approvals"
            value={pendingProperties.toString()}
            icon={<Clock className="h-6 w-6" />}
            color="warning"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Property Views"
            subtitle="Daily views this week"
            data={viewsData}
            type="line"
            dataKey="count"
            xAxisDataKey="name"
            color="#047857"
          />
          <ChartCard
            title="Inquiries"
            subtitle="Daily inquiries this week"
            data={inquiriesData}
            type="bar"
            dataKey="count"
            xAxisDataKey="name"
            color="#D97706"
          />
        </div>

        {/* Recent Properties */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Your Properties</h3>
            <Link
              to="/dashboard/properties/add"
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
            >
              Add New Property
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No properties yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first property
              </p>
              <div className="mt-6">
                <Link
                  to="/dashboard/properties/add"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
                >
                  Add Property
                </Link>
              </div>
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
                      Price
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {properties.slice(0, 5).map((property) => (
                    <tr key={property.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <img
                              className="h-10 w-10 rounded-md object-cover"
                              src={property.images[0]}
                              alt={property.title}
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{property.title}</div>
                            <div className="text-sm text-gray-500">{property.location.city}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 capitalize">{property.type}</div>
                        <div className="text-sm text-gray-500 capitalize">{property.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{property.price.toLocaleString()} SAR</div>
                        {property.category === 'rent' && (
                          <div className="text-xs text-gray-500">per month</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          property.status === 'approved'
                            ? 'bg-success-100 text-success-800'
                            : property.status === 'pending'
                            ? 'bg-warning-100 text-warning-800'
                            : 'bg-error-100 text-error-800'
                        }`}>
                          {property.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            <Eye className="h-4 w-4 text-gray-400 mr-1" />
                            {property.views}
                          </div>
                          <div className="flex items-center">
                            <Heart className="h-4 w-4 text-gray-400 mr-1" />
                            {property.favorites}
                          </div>
                          <div className="flex items-center">
                            <MessageSquare className="h-4 w-4 text-gray-400 mr-1" />
                            {property.inquiries}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link to={`/properties/${property.id}`} className="text-accent-600 hover:text-accent-900 mr-3">
                          View
                        </Link>
                        <Link to={`/dashboard/properties/edit/${property.id}`} className="text-primary-600 hover:text-primary-900 mr-3">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {properties.length > 5 && (
                <div className="mt-4 text-center">
                  <Link
                    to="/dashboard/properties"
                    className="text-sm text-primary-600 hover:text-primary-500"
                  >
                    View all properties
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Inquiries */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Inquiries</h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : inquiries.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No inquiries yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Inquiries from potential buyers will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {inquiries.slice(0, 5).map((inquiry) => (
                <div key={inquiry.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {inquiry.propertyTitle}
                      </h4>
                      <p className="text-xs text-gray-500">
                        From: {inquiry.buyerName} • {new Date(inquiry.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 h-6 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
                      inquiry.status === 'answered'
                        ? 'bg-success-100 text-success-800'
                        : inquiry.status === 'pending'
                        ? 'bg-warning-100 text-warning-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {inquiry.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {inquiry.message}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <button className="text-xs text-primary-600 hover:text-primary-700">
                      Reply
                    </button>
                  </div>
                </div>
              ))}
              
              {inquiries.length > 5 && (
                <div className="mt-4 text-center">
                  <Link
                    to="/dashboard/messages"
                    className="text-sm text-primary-600 hover:text-primary-500"
                  >
                    View all inquiries
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

export default SellerDashboard;