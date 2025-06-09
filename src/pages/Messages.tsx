import { useState, useEffect, useRef } from 'react';
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
  Plus,
  X,
  PhoneCall,
  VideoIcon,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  PhoneOff,
  Users,
  UserPlus,
} from 'lucide-react';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { toast } from 'react-toastify';

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: 'text' | 'image' | 'file' | 'call';
  callData?: {
    type: 'voice' | 'video';
    duration?: number;
    status: 'missed' | 'answered' | 'declined';
  };
}

interface Chat {
  id: string;
  participants: string[];
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSenderId: string;
  unreadCount: { [userId: string]: number };
}

interface ChatUser {
  id: string;
  displayName: string;
  photoURL?: string;
  lastSeen?: string;
  online: boolean;
  role?: string;
}

interface CallState {
  isActive: boolean;
  type: 'voice' | 'video' | null;
  isIncoming: boolean;
  caller?: ChatUser;
  isMuted: boolean;
  isVideoEnabled: boolean;
  duration: number;
}

const Messages = () => {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatUsers, setChatUsers] = useState<{ [chatId: string]: ChatUser }>({});
  const [allUsers, setAllUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatUsers, setNewChatUsers] = useState<string[]>([]);
  const [callState, setCallState] = useState<CallState>({
    isActive: false,
    type: null,
    isIncoming: false,
    isMuted: false,
    isVideoEnabled: true,
    duration: 0,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!user) return;

    // Listen to user's chats
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(chatsQuery, async (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastMessageAt: doc.data().lastMessageAt?.toDate?.()?.toISOString() || doc.data().lastMessageAt
      })) as Chat[];

      // Remove duplicate chats
      const uniqueChats = chatsData.filter((chat, index, self) => 
        index === self.findIndex(c => 
          c.participants.length === chat.participants.length &&
          c.participants.every(p => chat.participants.includes(p))
        )
      );

      setChats(uniqueChats);

      // Fetch user details for each chat
      const userIds = new Set<string>();
      uniqueChats.forEach(chat => {
        chat.participants.forEach(participantId => {
          if (participantId !== user.uid) {
            userIds.add(participantId);
          }
        });
      });

      const usersData: { [userId: string]: ChatUser } = {};
      for (const userId of userIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            usersData[userId] = {
              id: userId,
              ...userDoc.data(),
              online: Math.random() > 0.5 // Simulate online status
            } as ChatUser;
          }
        } catch (error) {
          console.error('Error fetching user:', error);
        }
      }

      setChatUsers(usersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    // Fetch all users for new chat modal
    const fetchAllUsers = async () => {
      try {
        const usersQuery = query(collection(db, 'users'));
        const snapshot = await getDocs(usersQuery);
        const usersData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            online: Math.random() > 0.5
          }))
          .filter(u => u.id !== user?.uid) as ChatUser[];
        
        setAllUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    if (user) {
      fetchAllUsers();
    }
  }, [user]);

  useEffect(() => {
    if (!selectedChat) return;

    // Listen to messages in selected chat
    const messagesQuery = query(
      collection(db, 'messages'),
      where('chatId', '==', selectedChat.id),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp
      })) as Message[];

      setMessages(messagesData);
      scrollToBottom();

      // Mark messages as read
      const unreadMessages = messagesData.filter(
        msg => msg.receiverId === user?.uid && !msg.read
      );

      unreadMessages.forEach(async (message) => {
        try {
          await updateDoc(doc(db, 'messages', message.id), {
            read: true,
            readAt: serverTimestamp()
          });
        } catch (error) {
          console.error('Error marking message as read:', error);
        }
      });
    });

    return () => unsubscribe();
  }, [selectedChat, user]);

  useEffect(() => {
    if (callState.isActive && callState.duration === 0) {
      callTimerRef.current = setInterval(() => {
        setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    } else if (!callState.isActive && callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callState.isActive, callState.duration]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!user || !selectedChat || !newMessage.trim()) return;

    try {
      const messageData = {
        chatId: selectedChat.id,
        senderId: user.uid,
        receiverId: selectedChat.participants.find(id => id !== user.uid),
        content: newMessage,
        timestamp: serverTimestamp(),
        read: false,
        type: 'text'
      };

      // Add message to messages collection
      await addDoc(collection(db, 'messages'), messageData);

      // Update chat with last message
      await updateDoc(doc(db, 'chats', selectedChat.id), {
        lastMessage: newMessage,
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: user.uid,
        [`unreadCount.${messageData.receiverId}`]: (selectedChat.unreadCount?.[messageData.receiverId!] || 0) + 1
      });

      // Send notification to receiver
      const receiverId = messageData.receiverId;
      if (receiverId) {
        await addDoc(collection(db, 'notifications'), {
          userId: receiverId,
          title: 'رسالة جديدة',
          message: `رسالة من ${user.displayName}: ${newMessage.substring(0, 50)}${newMessage.length > 50 ? '...' : ''}`,
          type: 'message',
          read: false,
          data: {
            chatId: selectedChat.id,
            senderId: user.uid,
            senderName: user.displayName
          },
          createdAt: serverTimestamp()
        });
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('فشل في إرسال الرسالة');
    }
  };

  const handleChatSelect = async (chat: Chat) => {
    setSelectedChat(chat);
    
    // Find the other user in the chat
    const otherUserId = chat.participants.find(id => id !== user?.uid);
    if (otherUserId && chatUsers[otherUserId]) {
      setSelectedUser(chatUsers[otherUserId]);
    }

    // Reset unread count for this chat
    if (user && chat.unreadCount?.[user.uid] > 0) {
      try {
        await updateDoc(doc(db, 'chats', chat.id), {
          [`unreadCount.${user.uid}`]: 0
        });
      } catch (error) {
        console.error('Error resetting unread count:', error);
      }
    }
  };

  const createNewChat = async (userIds: string[]) => {
    if (!user) return;

    try {
      const participants = [user.uid, ...userIds];
      
      // Check if chat already exists for these participants
      const existingChatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid)
      );
      
      const existingChats = await getDocs(existingChatsQuery);
      const existingChat = existingChats.docs.find(doc => {
        const chatParticipants = doc.data().participants;
        return chatParticipants.length === participants.length &&
               participants.every(p => chatParticipants.includes(p));
      });

      if (existingChat) {
        const chatData = {
          id: existingChat.id,
          ...existingChat.data(),
          lastMessageAt: existingChat.data().lastMessageAt?.toDate?.()?.toISOString() || existingChat.data().lastMessageAt
        } as Chat;
        setSelectedChat(chatData);
        setShowNewChatModal(false);
        return;
      }

      // Create new chat
      const chatData = {
        participants,
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: '',
        unreadCount: participants.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
      };

      const chatRef = await addDoc(collection(db, 'chats'), chatData);
      
      const newChat = {
        id: chatRef.id,
        ...chatData,
        lastMessageAt: new Date().toISOString()
      } as Chat;
      
      setSelectedChat(newChat);
      setShowNewChatModal(false);
      setNewChatUsers([]);
      toast.success('تم إنشاء المحادثة بنجاح');
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('فشل في إنشاء المحادثة');
    }
  };

  const initiateCall = async (type: 'voice' | 'video') => {
    if (!selectedUser || !selectedChat) return;

    try {
      // Start call state
      setCallState({
        isActive: true,
        type,
        isIncoming: false,
        isMuted: false,
        isVideoEnabled: type === 'video',
        duration: 0,
      });

      // Add call message to chat
      const callMessage = {
        chatId: selectedChat.id,
        senderId: user!.uid,
        receiverId: selectedUser.id,
        content: `${type === 'voice' ? 'مكالمة صوتية' : 'مكالمة فيديو'} - جاري الاتصال...`,
        timestamp: serverTimestamp(),
        read: false,
        type: 'call',
        callData: {
          type,
          status: 'answered',
          duration: 0
        }
      };

      await addDoc(collection(db, 'messages'), callMessage);

      // Simulate call connection
      setTimeout(() => {
        if (Math.random() > 0.3) { // 70% chance of answer
          toast.success('تم الرد على المكالمة');
        } else {
          toast.info('لم يتم الرد على المكالمة');
          endCall();
        }
      }, 3000);

    } catch (error) {
      console.error('Error initiating call:', error);
      toast.error('فشل في بدء المكالمة');
    }
  };

  const endCall = () => {
    setCallState({
      isActive: false,
      type: null,
      isIncoming: false,
      isMuted: false,
      isVideoEnabled: true,
      duration: 0,
    });

    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  };

  const toggleMute = () => {
    setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const toggleVideo = () => {
    setCallState(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    
    const otherUserId = chat.participants.find(id => id !== user?.uid);
    const otherUser = otherUserId ? chatUsers[otherUserId] : null;
    
    return otherUser?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredUsers = allUsers.filter(u => 
    u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !newChatUsers.includes(u.id)
  );

  return (
    <DashboardLayout title="الرسائل">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden h-[calc(100vh-12rem)]">
        <div className="flex h-full">
          {/* Chats List */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">المحادثات</h2>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                  title="محادثة جديدة"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="البحث في المحادثات..."
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
              ) : filteredChats.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">لا توجد محادثات</p>
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="mt-3 text-sm text-primary-600 hover:text-primary-700"
                  >
                    ابدأ محادثة جديدة
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredChats.map((chat) => {
                    const otherUserId = chat.participants.find(id => id !== user?.uid);
                    const otherUser = otherUserId ? chatUsers[otherUserId] : null;
                    const unreadCount = user ? (chat.unreadCount?.[user.uid] || 0) : 0;

                    return (
                      <button
                        key={chat.id}
                        onClick={() => handleChatSelect(chat)}
                        className={`w-full p-4 flex items-center hover:bg-gray-50 transition-colors text-right ${
                          selectedChat?.id === chat.id ? 'bg-gray-50' : ''
                        }`}
                      >
                        <div className="relative ml-4">
                          {otherUser?.photoURL ? (
                            <img
                              src={otherUser.photoURL}
                              alt={otherUser.displayName}
                              className="w-12 h-12 rounded-full"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                              {otherUser?.displayName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          {otherUser?.online && (
                            <Circle className="absolute bottom-0 right-0 h-3 w-3 text-success-500 fill-current" />
                          )}
                        </div>
                        <div className="flex-1 text-right min-w-0">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {otherUser?.displayName || 'مستخدم غير معروف'}
                            </h4>
                            {unreadCount > 0 && (
                              <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {chat.lastMessage || 'لا توجد رسائل'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {chat.lastMessageAt ? format(new Date(chat.lastMessageAt), 'HH:mm') : ''}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          {selectedChat && selectedUser ? (
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
                  <div className="mr-3 text-right">
                    <h3 className="text-sm font-medium text-gray-900">
                      {selectedUser.displayName}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedUser.online ? 'متصل الآن' : 'غير متصل'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => initiateCall('voice')}
                    className="p-2 text-gray-500 hover:text-primary-600 rounded-full hover:bg-gray-100 transition-colors"
                    title="مكالمة صوتية"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => initiateCall('video')}
                    className="p-2 text-gray-500 hover:text-primary-600 rounded-full hover:bg-gray-100 transition-colors"
                    title="مكالمة فيديو"
                  >
                    <Video className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
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
                        {message.type === 'call' ? (
                          <div className="flex items-center">
                            {message.callData?.type === 'video' ? (
                              <VideoIcon className="h-4 w-4 mr-2" />
                            ) : (
                              <PhoneCall className="h-4 w-4 mr-2" />
                            )}
                            <span className="text-sm">{message.content}</span>
                          </div>
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
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
                  <button className="p-2 text-gray-500 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                    <Smile className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                    <ImageIcon className="h-5 w-5" />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                    placeholder="اكتب رسالة..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    dir="rtl"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  اختر محادثة
                </h3>
                <p className="mt-1 text-gray-500">
                  اختر مستخدم من القائمة لبدء المحادثة
                </p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  ابدأ محادثة جديدة
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">محادثة جديدة</h3>
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setNewChatUsers([]);
                  setSearchQuery('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="البحث عن المستخدمين..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {newChatUsers.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">المستخدمون المحددون:</p>
                <div className="flex flex-wrap gap-2">
                  {newChatUsers.map(userId => {
                    const user = allUsers.find(u => u.id === userId);
                    return (
                      <span
                        key={userId}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                      >
                        {user?.displayName}
                        <button
                          onClick={() => setNewChatUsers(prev => prev.filter(id => id !== userId))}
                          className="ml-1 text-primary-600 hover:text-primary-800"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      if (newChatUsers.includes(user.id)) {
                        setNewChatUsers(prev => prev.filter(id => id !== user.id));
                      } else {
                        setNewChatUsers(prev => [...prev, user.id]);
                      }
                    }}
                    className={`w-full p-3 flex items-center rounded-lg transition-colors ${
                      newChatUsers.includes(user.id)
                        ? 'bg-primary-50 border border-primary-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="relative">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                          {user.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      {user.online && (
                        <Circle className="absolute bottom-0 right-0 h-3 w-3 text-success-500 fill-current" />
                      )}
                    </div>
                    <div className="mr-3 text-right flex-1">
                      <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                      <p className="text-xs text-gray-500">{user.role}</p>
                    </div>
                    {newChatUsers.includes(user.id) && (
                      <div className="text-primary-600">
                        <UserPlus className="h-5 w-5" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowNewChatModal(false);
                  setNewChatUsers([]);
                  setSearchQuery('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => createNewChat(newChatUsers)}
                disabled={newChatUsers.length === 0}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                إنشاء محادثة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Interface */}
      {callState.isActive && (
        <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
          <div className="text-center text-white">
            {callState.type === 'video' && (
              <div className="relative mb-8">
                <video
                  ref={remoteVideoRef}
                  className="w-96 h-72 bg-gray-800 rounded-lg"
                  autoPlay
                  playsInline
                />
                <video
                  ref={localVideoRef}
                  className="absolute bottom-4 right-4 w-24 h-18 bg-gray-700 rounded-lg"
                  autoPlay
                  playsInline
                  muted
                />
              </div>
            )}
            
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2">{selectedUser?.displayName}</h2>
              <p className="text-gray-300">
                {callState.type === 'video' ? 'مكالمة فيديو' : 'مكالمة صوتية'}
              </p>
              <p className="text-lg mt-2">{formatCallDuration(callState.duration)}</p>
            </div>

            <div className="flex justify-center space-x-6">
              {callState.type === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`p-4 rounded-full transition-colors ${
                    callState.isVideoEnabled
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {callState.isVideoEnabled ? (
                    <Camera className="h-6 w-6" />
                  ) : (
                    <CameraOff className="h-6 w-6" />
                  )}
                </button>
              )}
              
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-colors ${
                  callState.isMuted
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {callState.isMuted ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </button>
              
              <button
                onClick={endCall}
                className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
              >
                <PhoneOff className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default Messages;