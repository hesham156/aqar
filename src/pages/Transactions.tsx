import { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import ChartCard from '../components/dashboard/ChartCard';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

interface Transaction {
  id: string;
  type: 'withdrawal' | 'payment' | 'refund' | 'commission';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  userId: string;
  userName: string;
  method?: string;
  createdAt: string;
}

const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [newStatus, setNewStatus] = useState<'completed' | 'pending' | 'failed'>('completed');
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    successRate: 0,
    pendingAmount: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      setLoading(true);
      try {
        let transactionsQuery;

        if (user.role === 'admin') {
          transactionsQuery = query(
            collection(db, 'withdrawalRequests'),
            orderBy('createdAt', 'desc')
          );
        } else {
          transactionsQuery = query(
            collection(db, 'withdrawalRequests'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
        }

        const snapshot = await getDocs(transactionsQuery);
        const transactionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
        })) as Transaction[];

        // Calculate stats
        const total = transactionsData.reduce((sum, tx) => sum + tx.amount, 0);
        const completed = transactionsData.filter(tx => tx.status === 'completed');
        const pending = transactionsData.filter(tx => tx.status === 'pending');
        const successRate = transactionsData.length > 0 ? (completed.length / transactionsData.length) * 100 : 0;
        const pendingAmount = pending.reduce((sum, tx) => sum + tx.amount, 0);

        setStats({
          totalTransactions: transactionsData.length,
          totalAmount: total,
          successRate,
          pendingAmount,
        });

        setTransactions(transactionsData);
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to load transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  const handleUpdateStatus = async (transaction: Transaction, status: 'completed' | 'pending' | 'failed') => {
    if (!user || user.role !== 'admin') return;

    setUpdatingStatus(transaction.id);
    try {
      // Update transaction status
      await updateDoc(doc(db, 'withdrawalRequests', transaction.id), {
        status,
        updatedAt: new Date().toISOString(),
      });

      // If completing a withdrawal, update user's wallet balance
      if (transaction.type === 'withdrawal' && status === 'completed') {
        const walletRef = doc(db, 'wallets', transaction.userId);
        const walletDoc = await getDoc(walletRef);
        
        if (walletDoc.exists()) {
          const currentBalance = walletDoc.data().balance || 0;
          await updateDoc(walletRef, {
            balance: currentBalance - transaction.amount,
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // Update local state
      setTransactions(transactions.map(tx =>
        tx.id === transaction.id ? { ...tx, status } : tx
      ));

      toast.success(`Transaction status updated to ${status}`);
    } catch (error) {
      console.error('Error updating transaction status:', error);
      toast.error('Failed to update transaction status');
    } finally {
      setUpdatingStatus(null);
      setShowStatusModal(false);
    }
  };

  const openStatusModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setNewStatus(transaction.status);
    setShowStatusModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success-100 text-success-800';
      case 'pending':
        return 'bg-warning-100 text-warning-800';
      case 'failed':
        return 'bg-error-100 text-error-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <ArrowUpRight className="h-5 w-5" />;
      case 'refund':
        return <ArrowDownLeft className="h-5 w-5" />;
      case 'commission':
        return <DollarSign className="h-5 w-5" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter !== 'all' && transaction.type !== filter) return false;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.userName.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const transactionData = [
    { name: 'Mon', amount: 5000 },
    { name: 'Tue', amount: 7500 },
    { name: 'Wed', amount: 6000 },
    { name: 'Thu', amount: 8000 },
    { name: 'Fri', amount: 9500 },
    { name: 'Sat', amount: 7000 },
    { name: 'Sun', amount: 6500 },
  ];

  return (
    <DashboardLayout title="Transactions">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Transactions"
            value={stats.totalTransactions.toString()}
            icon={<CreditCard className="h-6 w-6" />}
            color="primary"
          />
          <StatCard
            title="Total Amount"
            value={`${stats.totalAmount.toLocaleString()} SAR`}
            icon={<DollarSign className="h-6 w-6" />}
            color="success"
          />
          <StatCard
            title="Success Rate"
            value={`${stats.successRate.toFixed(1)}%`}
            icon={<TrendingUp className="h-6 w-6" />}
            trend={{ value: 5, isPositive: true }}
            color="accent"
          />
          <StatCard
            title="Pending Amount"
            value={`${stats.pendingAmount.toLocaleString()} SAR`}
            icon={<TrendingDown className="h-6 w-6" />}
            color="warning"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard
            title="Transaction Volume"
            subtitle="Daily transaction volume"
            data={transactionData}
            type="area"
            dataKey="amount"
            xAxisDataKey="name"
            color="#047857"
          />
          <ChartCard
            title="Transaction Count"
            subtitle="Number of transactions"
            data={transactionData}
            type="bar"
            dataKey="amount"
            xAxisDataKey="name"
            color="#0369A1"
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3 md:mb-0">Transaction History</h3>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>

              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Types</option>
                  <option value="withdrawal">Withdrawals</option>
                  <option value="payment">Payments</option>
                  <option value="refund">Refunds</option>
                  <option value="commission">Commissions</option>
                </select>
                <Filter className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as 'week' | 'month' | 'year')}
                  className="pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
                <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>

              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No transactions found</h3>
              <p className="mt-1 text-gray-500">
                {searchQuery ? 'Try adjusting your search or filters' : 'Transactions will appear here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    {user?.role === 'admin' && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                    )}
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    {user?.role === 'admin' && (
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-full mr-3 ${
                            transaction.type === 'payment' || transaction.type === 'commission'
                              ? 'bg-success-100 text-success-700'
                              : 'bg-warning-100 text-warning-700'
                          }`}>
                            {getTransactionTypeIcon(transaction.type)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 capitalize">
                              {transaction.type}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.description}
                            </div>
                            {transaction.method && (
                              <div className="text-xs text-gray-400">
                                Method: {transaction.method}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {user?.role === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {transaction.userName}
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          transaction.type === 'payment' || transaction.type === 'commission'
                            ? 'text-success-600'
                            : 'text-warning-600'
                        }`}>
                          {transaction.type === 'refund' ? '-' : '+'}
                          {transaction.amount.toLocaleString()} SAR
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      {user?.role === 'admin' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => openStatusModal(transaction)}
                            className="text-primary-600 hover:text-primary-900"
                            disabled={updatingStatus === transaction.id}
                          >
                            {updatingStatus === transaction.id ? (
                              <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                              'Update Status'
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showStatusModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Update Transaction Status
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Status
                </label>
                <div className={`inline-flex px-2 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedTransaction.status)}`}>
                  {selectedTransaction.status}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'completed' | 'pending' | 'failed')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              <div className="pt-4">
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedTransaction, newStatus)}
                    disabled={updatingStatus === selectedTransaction.id}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {updatingStatus === selectedTransaction.id ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Updating...
                      </>
                    ) : (
                      'Update Status'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Transactions;