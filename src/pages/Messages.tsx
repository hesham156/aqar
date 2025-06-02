import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { format } from 'date-fns';
import {
  Search,
  Send,
  Image as ImageIcon,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  User,
  Circle,
  MessageSquare,
} from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

interface ChatUser {
  id: string;
  displayName: string;
  photoURL?: string;
  lastSeen?: string;
  online: boolean;
}

const Messages = () => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to Socket.IO server
    const socketInstance = io('http://localhost:3000', {
      auth: {
        token: user?.uid,
      },
    });

    socketInstance.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    socketInstance.on('message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();
    });

    socketInstance.on('userOnline', (userId: string) => {
      setChatUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, online: true } : u))
      );
    });

    socketInstance.on('userOffline', (userId: string) => {
      setChatUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, online: false } : u))
      );
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  useEffect(() => {
    const fetchChatUsers = async () => {
      if (!user) return;

      try {
        // Fetch users who have chatted with the current user
        const chatsQuery = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', user.uid)
        );
        
        const chatsSnapshot = await getDocs(chatsQuery);
        const userIds = new Set<string>();
        
        chatsSnapshot.docs.forEach(doc => {
          const participants = doc.data().participants;
          participants.forEach((id: string) => {
            if (id !== user.uid) userIds.add(id);
          });
        });

        // If no chat users found, set empty array and return
        const userIdsArray = Array.from(userIds);
        if (userIdsArray.length === 0) {
          setChatUsers([]);
          setLoading(false);
          return;
        }

        // Fetch user details
        const usersQuery = query(
          collection(db, 'users'),
          where('uid', 'in', userIdsArray)
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          online: false,
        })) as ChatUser[];

        setChatUsers(usersData);
      } catch (error) {
        console.error('Error fetching chat users:', error);
        toast.error('Failed to load chat users');
      } finally {
        setLoading(false);
      }
    };

    fetchChatUsers();
  }, [user]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!user || !selectedUser) return;

      try {
        const messagesQuery = query(
          collection(db, 'messages'),
          where('participants', 'array-contains', [user.uid, selectedUser.id]),
          orderBy('timestamp', 'asc')
        );
        
        const messagesSnapshot = await getDocs(messagesQuery);
        const messagesData = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Message[];

        setMessages(messagesData);
        scrollToBottom();
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast.error('Failed to load messages');
      }
    };

    fetchMessages();
  }, [user, selectedUser]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!user || !selectedUser || !newMessage.trim() || !socket) return;

    try {
      // Save message to Firebase
      const messageData = {
        senderId: user.uid,
        receiverId: selectedUser.id,
        content: newMessage,
        timestamp: serverTimestamp(),
        read: false,
        participants: [user.uid, selectedUser.id],
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Send message through Socket.IO
      socket.emit('message', {
        ...messageData,
        timestamp: new Date().toISOString(),
      });

      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  const filteredUsers = chatUsers.filter(user =>
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title="Messages">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden h-[calc(100vh-12rem)]">
        <div className="flex h-full">
          {/* Users List */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <User className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">No conversations found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredUsers.map((chatUser) => (
                    <button
                      key={chatUser.id}
                      onClick={() => setSelectedUser(chatUser)}
                      className={`w-full p-4 flex items-center hover:bg-gray-50 transition-colors ${
                        selectedUser?.id === chatUser.id ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="relative">
                        {chatUser.photoURL ? (
                          <img
                            src={chatUser.photoURL}
                            alt={chatUser.displayName}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                            {chatUser.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {chatUser.online && (
                          <Circle className="absolute bottom-0 right-0 h-3 w-3 text-success-500 fill-current" />
                        )}
                      </div>
                      <div className="ml-4 flex-1 text-left">
                        <h4 className="text-sm font-medium text-gray-900">
                          {chatUser.displayName}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {chatUser.online ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selectedUser ? (
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center">
                  {selectedUser.photoURL ? (
                    <img
                      src={selectedUser.photoURL}
                      alt={selectedUser.displayName}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                      {selectedUser.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">
                      {selectedUser.displayName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedUser.online ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button className="p-2 text-gray-500 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <Phone className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <Video className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderId === user?.uid ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          message.senderId === user?.uid
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.senderId === user?.uid
                              ? 'text-primary-100'
                              : 'text-gray-500'
                          }`}
                        >
                          {format(new Date(message.timestamp), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-500 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <Smile className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-600 rounded-full hover:bg-gray-100">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  Select a conversation
                </h3>
                <p className="mt-1 text-gray-500">
                  Choose a user from the list to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;