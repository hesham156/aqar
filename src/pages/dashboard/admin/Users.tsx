import { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Search,
  Filter,
  SortAsc,
  Mail,
  Phone,
  Calendar,
  Shield,
  Ban,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Loader2,
  Send,
  X
} from 'lucide-react';
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth, UserRole } from '../../../contexts/AuthContext';
import DashboardLayout from '../../../components/dashboard/DashboardLayout';
import { toast } from 'react-toastify';

interface User {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  lastLoginAt?: string;
  properties?: number;
  transactions?: number;
}

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'suspended' | 'pending' | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'role'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showChatModal, setShowChatModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        let usersQuery = query(
          collection(db, 'users'),
          orderBy(
            sortBy === 'date' ? 'createdAt' :
            sortBy === 'name' ? 'displayName' : 'role',
            sortOrder
          )
        );

        const snapshot = await getDocs(usersQuery);
        let usersData = snapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as User[];

        // Apply filters
        if (selectedRole !== 'all') {
          usersData = usersData.filter(user => user.role === selectedRole);
        }
        if (selectedStatus !== 'all') {
          usersData = usersData.filter(user => user.status === selectedStatus);
        }
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          usersData = usersData.filter(user =>
            user.displayName.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.phoneNumber.includes(query)
          );
        }

        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user, selectedRole, selectedStatus, sortBy, sortOrder, searchQuery]);

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'suspended') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });

      setUsers(users.map(user =>
        user.uid === userId ? { ...user, status: newStatus } : user
      ));

      toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedUser || !message.trim()) return;

    setSendingMessage(true);
    try {
      // Create a new chat if it doesn't exist
      const chatRef = await addDoc(collection(db, 'chats'), {
        participants: [user.uid, selectedUser.uid],
        lastMessage: message,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      // Add the message
      await addDoc(collection(db, 'messages'), {
        chatId: chatRef.id,
        senderId: user.uid,
        receiverId: selectedUser.uid,
        content: message,
        read: false,
        createdAt: serverTimestamp(),
      });

      toast.success('Message sent successfully');
      setMessage('');
      setShowChatModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success-100 text-success-800';
      case 'suspended':
        return 'bg-error-100 text-error-800';
      case 'pending':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'bg-primary-100 text-primary-800';
      case 'seller':
        return 'bg-accent-100 text-accent-800';
      case 'buyer':
        return 'bg-secondary-100 text-secondary-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <DashboardLayout title="Users">
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>

            <div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
              </select>
            </div>

            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as 'active' | 'suspended' | 'pending' | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'role')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="date">Join Date</option>
                <option value="name">Name</option>
                <option value="role">Role</option>
              </select>
              <button
                onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <SortAsc className={`h-5 w-5 text-gray-500 transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Users List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-gray-500">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activity
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.uid} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.displayName}
                            </div>
                            <div className="text-sm text-gray-500">
                              Joined {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {user.email}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Phone className="h-4 w-4 mr-1" />
                          {user.phoneNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {user.role === 'seller' && (
                            <div>Properties: {user.properties || 0}</div>
                          )}
                          <div>Transactions: {user.transactions || 0}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowChatModal(true);
                            }}
                            className="text-primary-600 hover:text-primary-900 flex items-center"
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Message
                          </button>
                          {user.status === 'suspended' ? (
                            <button
                              onClick={() => handleStatusChange(user.uid, 'active')}
                              className="text-success-600 hover:text-success-900 flex items-center"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Activate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStatusChange(user.uid, 'suspended')}
                              className="text-error-600 hover:text-error-900 flex items-center"
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Chat Modal */}
      {showChatModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Message {selectedUser.displayName}
              </h3>
              <button
                onClick={() => {
                  setShowChatModal(false);
                  setSelectedUser(null);
                  setMessage('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSendMessage}>
              <div className="mb-4">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowChatModal(false);
                    setSelectedUser(null);
                    setMessage('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingMessage || !message.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {sendingMessage ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Users;