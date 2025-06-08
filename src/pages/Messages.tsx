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
  type: 'text' | 'image' | 'file';
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

      setChats(chatsData);

      // Fetch user details for each chat
      const userIds = new Set<string>();
      chatsData.forEach(chat => {
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
              online: false // We'll implement online status later
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
        await addNotification({
          title: 'رسالة جديدة',
          message: `رسالة من ${user.displayName}: ${newMessage.substring(0, 50)}${newMessage.length > 50 ? '...' : ''}`,
          type: 'message',
          read: false,
          data: {
            chatId: selectedChat.id,
            senderId: user.uid,
            senderName: user.displayName
          }
        });

        // Add notification to receiver's notifications collection
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

  const createNewChat = async (receiverId: string) => {
    if (!user) return;

    try {
      // Check if chat already exists
      const existingChatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', user.uid)
      );
      
      const existingChats = await getDocs(existingChatsQuery);
      const existingChat = existingChats.docs.find(doc => {
        const participants = doc.data().participants;
        return participants.includes(receiverId) && participants.length === 2;
      });

      if (existingChat) {
        const chatData = {
          id: existingChat.id,
          ...existingChat.data(),
          lastMessageAt: existingChat.data().lastMessageAt?.toDate?.()?.toISOString() || existingChat.data().lastMessageAt
        } as Chat;
        setSelectedChat(chatData);
        return;
      }

      // Create new chat
      const chatData = {
        participants: [user.uid, receiverId],
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: '',
        unreadCount: {
          [user.uid]: 0,
          [receiverId]: 0
        }
      };

      const chatRef = await addDoc(collection(db, 'chats'), chatData);
      
      const newChat = {
        id: chatRef.id,
        ...chatData,
        lastMessageAt: new Date().toISOString()
      } as Chat;
      
      setSelectedChat(newChat);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast.error('فشل في إنشاء المحادثة');
    }
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    
    const otherUserId = chat.participants.find(id => id !== user?.uid);
    const otherUser = otherUserId ? chatUsers[otherUserId] : null;
    
    return otherUser?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <DashboardLayout title="الرسائل">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden h-[calc(100vh-12rem)]">
        <div className="flex h-full">
          {/* Chats List */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
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
                  <User className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-500">لا توجد محادثات</p>
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
                        <div className="flex-1 text-right">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-medium text-gray-900">
                              {otherUser?.displayName || 'مستخدم غير معروف'}
                            </h4>
                            {unreadCount > 0 && (
                              <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {unreadCount}
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
                      {selectedUser.online ? 'متصل' : 'غير متصل'}
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
                    placeholder="اكتب رسالة..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    dir="rtl"
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
                  اختر محادثة
                </h3>
                <p className="mt-1 text-gray-500">
                  اختر مستخدم من القائمة لبدء المحادثة
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