import { useEffect, useState } from 'react';
import {
  Building2, Users, CreditCard, TrendingUp, Clock, CheckCircle, XCircle, BarChart
} from 'lucide-react';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import StatCard from '../../../components/dashboard/StatCard';
import ChartCard from '../../../components/dashboard/ChartCard';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../firebase/config';

interface RecentActivity {
  id: string;
  type: string;
  user: string;
  property?: string;
  amount?: number;
  status: string;
  date: string;
}

const AdminDashboard = () => {
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Example data for charts
  const propertyData = [
    { name: 'Jan', count: 65 },
    { name: 'Feb', count: 78 },
    { name: 'Mar', count: 83 },
    { name: 'Apr', count: 75 },
    { name: 'May', count: 92 },
    { name: 'Jun', count: 97 },
    { name: 'Jul', count: 105 },
  ];

  const revenueData = [
    { name: 'Jan', amount: 25000 },
    { name: 'Feb', amount: 32000 },
    { name: 'Mar', amount: 28000 },
    { name: 'Apr', amount: 35000 },
    { name: 'May', amount: 42000 },
    { name: 'Jun', amount: 38000 },
    { name: 'Jul', amount: 45000 },
  ];

  const userActivityData = [
    { name: 'Buyers', value: 65 },
    { name: 'Sellers', value: 35 },
  ];

  const cityData = [
    { name: 'Riyadh', properties: 320 },
    { name: 'Jeddah', properties: 280 },
    { name: 'Mecca', properties: 150 },
    { name: 'Medina', properties: 120 },
    { name: 'Dammam', properties: 100 },
    { name: 'Al Khobar', properties: 90 },
  ];

  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        // Fetch recent property listings
        const propertiesQuery = query(
          collection(db, 'properties'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const propertiesSnapshot = await getDocs(propertiesQuery);
        
        // Fetch recent transactions
        const transactionsQuery = query(
          collection(db, 'transactions'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const transactionsSnapshot = await getDocs(transactionsQuery);
        
        // Fetch recent user registrations
        const usersQuery = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const usersSnapshot = await getDocs(usersQuery);
        
        // Process and combine the data
        const activities: RecentActivity[] = [
          ...propertiesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              type: 'property',
              user: data.sellerName || 'Unknown Seller',
              property: data.title,
              status: data.status,
              date: new Date(data.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }),
            };
          }),
          
          ...transactionsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              type: 'transaction',
              user: data.userName || 'Unknown User',
              property: data.propertyTitle,
              amount: data.amount,
              status: data.status,
              date: new Date(data.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }),
            };
          }),
          
          ...usersSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              type: 'user',
              user: data.displayName || 'New User',
              status: 'active',
              date: new Date(data.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              }),
            };
          }),
        ];
        
        // Sort by date (newest first) and take only the most recent 10
        activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setRecentActivities(activities.slice(0, 10));
      } catch (error) {
        console.error('Error fetching recent activities:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivities();
  }, []);

  return (
    <DashboardLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Properties"
            value="1,256"
            icon={<Building2 className="h-6 w-6" />}
            trend={{ value: 12, isPositive: true }}
            color="primary"
          />
          <StatCard
            title="Total Users"
            value="3,872"
            icon={<Users className="h-6 w-6" />}
            trend={{ value: 8, isPositive: true }}
            color="secondary"
          />
          <StatCard
            title="Total Revenue"
            value="245,000 SAR"
            icon={<CreditCard className="h-6 w-6" />}
            trend={{ value: 15, isPositive: true }}
            color="accent"
          />
          <StatCard
            title="Pending Approvals"
            value="24"
            icon={<Clock className="h-6 w-6" />}
            trend={{ value: 5, isPositive: false }}
            color="warning"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Property Listings"
            subtitle="Monthly property listings over time"
            data={propertyData}
            type="area"
            dataKey="count"
            xAxisDataKey="name"
            color="#047857"
          />
          <ChartCard
            title="Revenue"
            subtitle="Monthly revenue in SAR"
            data={revenueData}
            type="bar"
            dataKey="amount"
            xAxisDataKey="name"
            color="#D97706"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="User Activity"
            subtitle="Distribution of user types"
            data={userActivityData}
            type="bar"
            dataKey="value"
            xAxisDataKey="name"
            color="#0369A1"
          />
          <ChartCard
            title="Properties by City"
            subtitle="Number of properties in top cities"
            data={cityData}
            type="bar"
            dataKey="properties"
            xAxisDataKey="name"
            color="#047857"
          />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentActivities.map((activity) => (
                    <tr key={activity.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {activity.type === 'property' && <Building2 className="h-5 w-5 text-primary-500 mr-2" />}
                          {activity.type === 'transaction' && <CreditCard className="h-5 w-5 text-secondary-500 mr-2" />}
                          {activity.type === 'user' && <Users className="h-5 w-5 text-accent-500 mr-2" />}
                          <span className="text-sm text-gray-900 capitalize">{activity.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{activity.user}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {activity.type === 'property' && `Listed: ${activity.property}`}
                          {activity.type === 'transaction' && `${activity.property} - ${activity.amount} SAR`}
                          {activity.type === 'user' && 'New user registration'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          activity.status === 'approved' || activity.status === 'active' || activity.status === 'completed'
                            ? 'bg-success-100 text-success-800'
                            : activity.status === 'pending'
                            ? 'bg-warning-100 text-warning-800'
                            : 'bg-error-100 text-error-800'
                        }`}>
                          {activity.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {activity.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;