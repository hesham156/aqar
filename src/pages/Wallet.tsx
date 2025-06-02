import { useEffect, useState } from 'react';
import {
  Wallet as WalletIcon,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  Filter,
  Download,
  Plus
} from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { doc, getDoc, updateDoc, setDoc, collection, addDoc, serverTimestamp, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  createdAt: string;
}

const Wallet = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [withdrawMethod, setWithdrawMethod] = useState<string>('bank');
  const [isWithdrawLoading, setIsWithdrawLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!user) return;

    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        // Fetch wallet data
        const walletRef = doc(db, 'wallets', user.uid);
        const walletSnap = await getDoc(walletRef);
        
        if (walletSnap.exists()) {
          const walletData = walletSnap.data();
          setBalance(walletData.balance || 0);
        } else {
          await setDoc(walletRef, {
            balance: 0,
            userId: user.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          setBalance(0);
        }

        // Fetch transactions from withdrawalRequests collection
        const transactionsQuery = query(
          collection(db, 'withdrawalRequests'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(transactionsQuery);
        const transactionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
        })) as Transaction[];

        setTransactions(transactionsData);
      } catch (error) {
        console.error('Error fetching wallet data:', error);
        toast.error('Failed to load wallet data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  const handleWithdraw = async () => {
    if (!user) return;
    
    if (withdrawAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (withdrawAmount > balance) {
      toast.error('Withdrawal amount exceeds available balance');
      return;
    }
    
    setIsWithdrawLoading(true);
    
    try {
      // Add withdrawal request
      const withdrawalRequest = {
        userId: user.uid,
        userName: user.displayName,
        amount: withdrawAmount,
        method: withdrawMethod,
        type: 'withdrawal',
        status: 'pending',
        description: `Withdrawal request via ${withdrawMethod}`,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'withdrawalRequests'), withdrawalRequest);
      
      toast.success('Withdrawal request submitted successfully');
      setIsWithdrawModalOpen(false);
      setWithdrawAmount(0);

      // Refresh transactions
      const transactionsQuery = query(
        collection(db, 'withdrawalRequests'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(transactionsQuery);
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
      })) as Transaction[];

      setTransactions(transactionsData);
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast.error('Failed to process withdrawal');
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.type === filter;
  });

  return (
    <DashboardLayout title="Wallet">
      <div className="space-y-6">
        {/* Balance Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-primary-100">Available Balance</p>
                <h2 className="text-3xl font-bold mt-1">{balance.toLocaleString()} SAR</h2>
              </div>
              <div className="p-4 bg-white bg-opacity-20 rounded-full">
                <WalletIcon className="h-8 w-8" />
              </div>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setIsWithdrawModalOpen(true)}
              className="flex items-center justify-center px-4 py-3 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
            >
              <ArrowUpRight className="h-5 w-5 mr-2" />
              Withdraw Funds
            </button>
            <button
              className="flex items-center justify-center px-4 py-3 bg-accent-50 text-accent-700 rounded-lg hover:bg-accent-100 transition-colors"
              disabled
            >
              <ArrowDownLeft className="h-5 w-5 mr-2" />
              Add Payment Method
            </button>
          </div>
        </div>
        
        {/* Transaction History */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3 md:mb-0">Transaction History</h3>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="appearance-none pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="all">All Transactions</option>
                  <option value="deposit">Deposits</option>
                  <option value="withdrawal">Withdrawals</option>
                  <option value="payment">Payments</option>
                  <option value="refund">Refunds</option>
                </select>
                <Filter className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              
              <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No transactions yet</h3>
              <p className="mt-1 text-gray-500">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
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
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.createdAt}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-full mr-3 ${
                            transaction.type === 'deposit' || transaction.type === 'refund'
                              ? 'bg-success-100 text-success-700'
                              : 'bg-warning-100 text-warning-700'
                          }`}>
                            {transaction.type === 'deposit' || transaction.type === 'refund' ? (
                              <ArrowDownLeft className="h-5 w-5" />
                            ) : (
                              <ArrowUpRight className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 capitalize">
                              {transaction.type}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          transaction.type === 'deposit' || transaction.type === 'refund'
                            ? 'text-success-600'
                            : 'text-warning-600'
                        }`}>
                          {transaction.type === 'deposit' || transaction.type === 'refund' ? '+' : '-'}
                          {transaction.amount.toLocaleString()} SAR
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transaction.status === 'completed'
                            ? 'bg-success-100 text-success-800'
                            : transaction.status === 'pending'
                            ? 'bg-warning-100 text-warning-800'
                            : 'bg-error-100 text-error-800'
                        }`}>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Withdraw Funds</h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (SAR)
                </label>
                <input
                  type="number"
                  id="amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter amount"
                  min="0"
                  max={balance}
                />
                <p className="mt-1 text-sm text-gray-500">
                  Available balance: {balance.toLocaleString()} SAR
                </p>
              </div>
              
              <div>
                <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-1">
                  Withdrawal Method
                </label>
                <select
                  id="method"
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="card">Credit Card</option>
                </select>
              </div>
              
              {withdrawMethod === 'bank' && (
                <div>
                  <label htmlFor="bankDetails" className="block text-sm font-medium text-gray-700 mb-1">
                    Bank Details
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">
                      IBAN: SA44 2000 0001 2345 6789 1234
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Account Holder: {user?.displayName}
                    </p>
                    <button className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center">
                      <Plus className="h-4 w-4 mr-1" />
                      Add new bank account
                    </button>
                  </div>
                </div>
              )}
              
              {withdrawMethod === 'card' && (
                <div>
                  <label htmlFor="cardDetails" className="block text-sm font-medium text-gray-700 mb-1">
                    Card Details
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-600">
                      Card: **** **** **** 4321
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Expiry: 12/25
                    </p>
                    <button className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center">
                      <Plus className="h-4 w-4 mr-1" />
                      Add new card
                    </button>
                  </div>
                </div>
              )}
              
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-4">
                  Withdrawal requests are processed within 1-3 business days. A transaction fee of 1% applies to all withdrawals.
                </p>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setIsWithdrawModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={isWithdrawLoading || withdrawAmount <= 0 || withdrawAmount > balance}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isWithdrawLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
                          <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      'Withdraw'
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

export default Wallet;